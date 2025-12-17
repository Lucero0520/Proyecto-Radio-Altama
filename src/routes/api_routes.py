from flask import Blueprint, jsonify, request
import tempfile
import os
import json
import time
from datetime import datetime as dt, timedelta

FFMPEG_DIR = r"C:\FFmpeg\bin"

current_path = os.environ.get('PATH', '')

if FFMPEG_DIR not in current_path and os.path.isdir(FFMPEG_DIR):
    # Añadir la ruta de FFmpeg al inicio del PATH del entorno de Flask
    os.environ['PATH'] = f"{FFMPEG_DIR};{current_path}"
    print(f"✅ FFmpeg Path inyectado en el ambiente de Flask: {FFMPEG_DIR}")
else:
    print(f"⚠️ FFmpeg Path ya estaba en el ambiente o no se pudo encontrar la carpeta: {FFMPEG_DIR}")
# --- FIN CORRECCIÓN PATH FFmpeg ---

from src.services.gemini_service import GeminiService

from src.services.gemini_service import GeminiService
from src.services.firestore_service import FirestoreService
from src.services.transcription_service import TranscriptionService
from src.services.facebook_api import get_ilo_news, get_facebook_page_stats, get_facebook_monthly_insights
from src.utils.file_handlers import FileHandler
from src.utils.helpers import validate_json_response, create_timestamp
from src.services.ia_functions import AVAILABLE_FUNCTIONS, get_stock_price 

# Blueprint para las rutas API
api_bp = Blueprint('api', __name__)

# Inicializar servicios
gemini_service = GeminiService()
firestore_service = FirestoreService()
transcription_service = TranscriptionService(gemini_service)
file_handler = FileHandler()

# Importar funciones de IA (Mantenido el manejo de errores)
try:
    from src.services.ia_functions import AVAILABLE_FUNCTIONS, get_stock_price
except ImportError:
    print("⚠️ ADVERTENCIA: No se encontró 'ia_functions.py'")
    AVAILABLE_FUNCTIONS = {}
    def get_stock_price(ticker: str) -> str:
        return json.dumps({"error": "ia_functions.py no cargado."})

@api_bp.route('/facebook-news', methods=['GET'])
def get_news():
    """Obtiene noticias de Facebook"""
    try:
        news_items = get_ilo_news()
        return jsonify(news_items), 200
    except Exception as e:
        return jsonify({"error": f"Error al obtener noticias: {e}"}), 500

@api_bp.route('/grounded-news', methods=['GET'])
def get_grounded_news():
    """Busca noticias de terceros usando Google Search"""
    if not gemini_service.is_initialized():
        return jsonify({"error": "❌ Cliente Gemini no inicializado."}), 500

    system_prompt = (
        "Actúa como un reportero de noticias conciso. Tu tarea es encontrar las noticias más urgentes y actuales. "
        "Busca 5 a 7 noticias sobre: 'Ilo', 'Moquegua', o 'Perú' (principalmente delincuencia, robos, o política actual). "
        "Asegúrate de que la información sea del día actual si es posible. "
        "Genera una lista con un título, una descripción breve (máximo 2 oraciones), y la URL ABSOLUTA de la fuente de origen. "
        "FORMATO DE SALIDA: DEBES DEVOLVER TU RESPUESTA ÚNICA Y EXCLUSIVAMENTE como un array JSON. "
        "Cada objeto en el array JSON debe tener las claves: 'title', 'description', y 'link'. No añadas markdown (```json) ni texto explicativo."
    )
    user_query = "Últimas noticias de Ilo, Moquegua, o Perú sobre obras públicas, política o economía."
    
    config = {
        'tools': [{"google_search": {}}],
        'system_instruction': system_prompt,
    }

    try:
        response = gemini_service.generate_content_with_retry(
            model='gemini-2.5-flash',
            contents=[user_query],
            config=config
        )
        
        raw_json = gemini_service.clean_json_output(response.text)
        news_data = json.loads(raw_json)
        
        final_news = [{
            "time": dt.now().strftime("%Y-%m-%d %H:%M:%S"),
            "message": item.get('description', 'Sin descripción'),
            "link": item.get('link', '#'),
            "title": item.get('title', 'Sin título')
        } for item in news_data if isinstance(item, dict) and 'link' in item]

        return jsonify(final_news), 200

    except Exception as e:
        print(f"❌ Error al usar Google Search: {e}")
        return jsonify([{
            "time": "Error",
            "message": f"Fallo al obtener noticias: {e}",
            "link": "#",
            "title": "Error del Servidor"
        }]), 500
@api_bp.route('/history', methods=['GET'])
def get_history():
    """Obtiene el historial de transcripciones"""
    result = firestore_service.get_transcription_history()
    if result.get("status") == "Error":
        return jsonify(result), 500
    return jsonify(result), 200

@api_bp.route('/facebook-stats', methods=['GET'])
def get_stats():
    """Obtiene estadísticas de Facebook"""
    try:
        stats_data = get_facebook_page_stats()
        return jsonify(stats_data), 200
    except Exception as e:
        return jsonify({"error": f"Error al obtener estadísticas: {e}"}), 500

@api_bp.route('/history/trash', methods=['GET'])
def get_trash_history_route():
    """Obtiene el historial de documentos eliminados (papelera)."""
    result = firestore_service.get_trash_history()
    if result.get("status") == "Error":
        return jsonify(result), 500
    return jsonify(result), 200

@api_bp.route('/history/restore/<doc_id>', methods=['POST'])
def restore_history_item(doc_id):
    """Restaura un documento de la papelera."""
    result = firestore_service.restore_item(doc_id)
    
    if result.get("status") == "Success":
        # CORRECCIÓN: Devolver el objeto result COMPLETO
        return jsonify(result), 200
    else:
        status_code = 404 if "Documento no encontrado" in result.get("error", "") else 500
        return jsonify({"error": result.get("error")}), status_code

@api_bp.route('/usage-stats', methods=['GET'])
def get_usage_stats():
    """Obtiene estadísticas de uso general para el panel de administración."""
    try:
        return jsonify({
            "totalTranscriptions": 452,
            "facebookFollowers": 1542,
            "status": "Success"
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error al obtener estadísticas de uso: {e}", "status": "Error"}), 500


@api_bp.route('/transcribe', methods=['POST'])
def transcribe_file():
    """Transcribe archivos subidos (Real con Gemini Files)"""
    if not gemini_service.is_initialized():
        return jsonify({"error": " Cliente Gemini no inicializado."}), 500
    if 'file' not in request.files: 
        return jsonify({"error": "Falta el archivo en la solicitud (campo 'file')."}), 400
    
    file = request.files['file']
    if file.filename == '': 
        return jsonify({"error": "No se seleccionó ningún archivo."}), 400
    
    uploaded_file = None
    file_type = request.form.get('type') 
    # Guardamos el nombre original para la base de datos (DB)
    file_name = file.filename
    file_path = None
    
    try:
        if file_type not in ['image', 'video']:
            return jsonify({"error": "Tipo de archivo no soportado o no especificado."}), 400

        # FIX ROBUSTO: Generar un nombre de archivo temporal único y seguro (solo ASCII)
        temp_dir = tempfile.gettempdir()
        _, ext = os.path.splitext(file_name)
        # Usamos os.getpid() y time.time() para un nombre único y ASCII-safe
        safe_file_name = f"upload_{os.getpid()}_{time.time()}{ext}" 
        file_path = os.path.join(temp_dir, safe_file_name) 
        
        # CORRECCIÓN CLAVE: Escribir el stream del archivo manualmente. 
        # Esto evita que Werkzeug/Flask intente codificar el nombre de archivo original
        # en ASCII, lo que provocaría el error.
        with open(file_path, 'wb') as f:
            file.stream.seek(0) 
            f.write(file.stream.read())

        # Subir a Gemini
        uploaded_file = gemini_service.upload_and_process_file(file_path)

        # Procesar transcripción
        result = transcription_service.process_transcription(file_type, file_name, uploaded_file)
       
        # Guardar en Firestore
        db_saved = firestore_service.save_transcription(
            file_type, file_name, result["transcription"], result["summary"]
        )
        result["db_saved"] = db_saved
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f" Error al procesar archivo con Gemini Multimodal: {e}")
        return jsonify({"error": f"Error al procesar archivo: {e}"}), 500
    
    finally:
        if uploaded_file:
            gemini_service.delete_file(uploaded_file)
        if file_path and os.path.exists(file_path):
             try: os.remove(file_path)
             except Exception: pass

@api_bp.route('/transcribe-url', methods=['POST'])
def transcribe_url():
    """Transcribe contenido de URLs de Facebook e Instagram ONLY - FIX: Usa FileHandler para descarga robusta."""
    if not gemini_service.is_initialized():
        return jsonify({"error": "❌ Cliente Gemini no inicializado."}), 500
    
    data = request.get_json()
    url = data.get('url', '').strip() 
    
    if not url:
        return jsonify({"error": "❌ No se recibió ninguna URL."}), 400
    
    # VALIDAR que sea solo Facebook o Instagram
    if not any(domain in url.lower() for domain in ['facebook.com', 'fb.watch', 'instagram.com', 'instagr.am']):
        return jsonify({"error": "❌ Solo se permiten URLs de Facebook e Instagram."}), 400
    
    # Inicializar variables de limpieza
    file_path = None
    uploaded_file_gemini = None
    
    try:
        print(f"🌐 Procesando URL de Red Social: {url}")
        
        # 1. Descargar el archivo localmente con yt-dlp (MÉTODO ROBUSTO)
        file_path, file_name, file_type = file_handler.download_media_from_url(url)
        
        # 2. Subir el archivo local a Gemini
        uploaded_file_gemini = gemini_service.upload_and_process_file(file_path)
        
        # 3. Procesar transcripción
        result = transcription_service.process_transcription(
            file_type, file_name, uploaded_file_gemini
        ) 
        
        if result.get("error"):
            raise Exception(result["error"])

        # 4. Guardar en Firestore
        transcription_text = result['transcription']
        summary_text = result['summary']
        platform = "facebook" if "facebook" in url.lower() else "instagram"
        
        db_saved = firestore_service.save_transcription(
            file_type, file_name, transcription_text, summary_text
        )
        
        response_data = {
            "transcription": transcription_text,
            "summary": summary_text,
            "url_processed": url,
            "platform": platform,
            "db_saved": db_saved
        }
        
        print(f"✅ Transcripción de {platform} exitosa! (Ruta robusta)")
        return jsonify(response_data), 200
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error al procesar URL de red social: {error_msg}")
        
        # Mensajes de error más detallados
        if "Unsupported URL" in error_msg:
             friendly_error = (
                 "El enlace no es compatible o está mal formado. "
                 "Asegúrese de usar el enlace a la publicación original (no compartido/acortado)."
             )
        elif "MediaDownloadError" in error_msg:
             friendly_error = (
                 "El video puede ser privado, eliminado, o la plataforma (Facebook/Instagram) ha cambiado su formato. "
                 "Intente con otro video público."
             )
        # --- CORRECCIÓN PARA EL ERROR 500 DE GEMINI ---
        elif "Failed to convert server response to JSON" in error_msg or "INTERNAL" in error_msg or "500" in error_msg:
             friendly_error = (
                 "Error de procesamiento de Gemini (500). El archivo descargado puede estar corrupto, ser muy grande, o el servicio de Google está experimentando un fallo temporal. Pruebe con otro video."
             )
        # ---------------------------------------------
        else:
             # Para otros errores no relacionados con yt-dlp
             friendly_error = f"Error desconocido al procesar la URL: {error_msg.split(':')[0]}"
             
        return jsonify({"error": friendly_error}), 400
    
    finally:
        # Limpieza CRÍTICA: Eliminar el archivo de Gemini y el archivo temporal local
        if uploaded_file_gemini:
            gemini_service.delete_file(uploaded_file_gemini)
        if file_path:
             file_handler.cleanup_file(file_path)
@api_bp.route('/gemini-call', methods=['POST'])
def gemini_call():
    if not gemini_service.is_initialized(): return jsonify({"error": " Cliente Gemini no inicializado."}), 500

    try:
        data = request.get_json()
        original_text = data.get('original_text')
        
        if not original_text: return jsonify({"error": "No se recibió texto de origen para redactar."}), 400

        # CORRECCIÓN CLAVE: Instrucción más estricta para eliminar formato de guion
        system_instruction = (
            "Eres un redactor de contenido noticioso experto de Radio Altamar. "
            "Tu tarea es reescribir el 'Texto de Origen' en un artículo noticioso formal, fluido y listo para ser publicado o leído. "
            "DEBES RESPONDER ÚNICA Y EXCLUSIVAMENTE CON EL TEXTO DEL ARTÍCULO COMPLETO, sin añadir títulos, encabezados, "
            "nombres de locutores, pausas, indicaciones de audio (sintonías, efectos) o cualquier otro metadato de guion."
        )
        
        config = { 'system_instruction': system_instruction }

        response = gemini_service.generate_content_with_retry(
            model='gemini-2.5-flash',
            contents=[original_text],
            config=config
        )
        
        rewritten_article = response.text.strip()
        
        title = rewritten_article.split('\n')[0].strip() if rewritten_article else "Artículo sin Título"
        if len(title) > 100: title = title[:100] + "..."
            
        save_success = firestore_service.save_news_article(title, original_text, rewritten_article)
        
        return jsonify({ "success": True, "article": rewritten_article, "db_saved": save_success }), 200

    except Exception as e:
        print(f" Error interno en la API de Gemini: {e}")
        return jsonify({"error": f"Error al redactar: {e}"}), 500

@api_bp.route('/facebook-monthly-insights', methods=['GET'])
def get_monthly_insights():
    """Obtiene métricas mensuales de Facebook"""
    try:
        insights_data = get_facebook_monthly_insights()
        return jsonify(insights_data), 200
    except Exception as e:
        return jsonify({"error": f"Error al obtener métricas: {e}"}), 500


@api_bp.route('/history/<doc_id>', methods=['GET'])
def get_history_detail(doc_id):
    """Obtiene el detalle de una transcripción por su ID."""
    result = firestore_service.get_history_detail(doc_id)
    if result.get("status") == "Error":
        return jsonify(result), 500
    return jsonify(result), 200

@api_bp.route('/history/<doc_id>', methods=['DELETE'])
def delete_history_item(doc_id):
    """Mueve un documento a la papelera (Soft Delete)."""
    result = firestore_service.delete_history_item(doc_id) 
    
    if result.get("status") == "Success":
        # CORRECCIÓN: Devolver el objeto result COMPLETO
        return jsonify(result), 200
    else:
        status_code = 404 if "Documento no encontrado" in result.get("error", "") else 500
        return jsonify({"error": result.get("error")}), status_code