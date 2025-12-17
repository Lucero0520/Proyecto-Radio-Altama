import json
from src.services.gemini_service import GeminiService

class TranscriptionService:
    def __init__(self, gemini_service: GeminiService):
        self.gemini_service = gemini_service
    
    def process_transcription(self, file_type: str, file_name: str, uploaded_file):
        """Procesa la transcripción usando Gemini"""
        try:
            print(f"🔍 [transcription_service] file_type: {file_type}")
            print(f"🔍 [transcription_service] file_name: {file_name}")
            print(f"🔍 [transcription_service] uploaded_file tipo: {type(uploaded_file)}")
            
            # Prompt para transcripción
            if file_type in ['video', 'audio', 'social_media']:
                prompt = """
                Transcribe el contenido de audio/video de manera completa y precisa.
                Incluye todo el texto hablado, manteniendo la puntuación adecuada.
                Responde SOLO con la transcripción, sin comentarios adicionales.
                """
            elif file_type == 'image':
                prompt = """
                Extrae TODO el texto visible en esta imagen.
                Incluye texto en cualquier parte de la imagen, manteniendo el formato original cuando sea posible.
                Responde SOLO con el texto extraído, sin comentarios adicionales.
                """
            else:
                prompt = """
                Procesa el contenido de este archivo y extrae cualquier texto relevante.
                Responde SOLO con el contenido textual, sin comentarios adicionales.
                """
            
            print(f"🔍 [transcription_service] Preparando llamada a Gemini...")
            
            # Para google-genai SDK, simplemente pasamos el Part y el prompt
            contents = [
                uploaded_file,
                prompt
            ]
            
            print(f"🔍 [transcription_service] contents preparado, llamando a Gemini...")
            
            response = self.gemini_service.generate_content_with_retry(
                model='gemini-2.5-flash',
                contents=contents
            )
            
            transcription = response.text.strip()
            
            # Generar resumen
            summary = self.generate_summary(transcription)
            
            return {
                "transcription": transcription,
                "summary": summary,
                "file_type": file_type,
                "file_name": file_name
            }
            
        except Exception as e:
            print(f"❌ Error en procesamiento de transcripción: {e}")
            import traceback
            traceback.print_exc()
            return {
                "error": f"Error al procesar el archivo: {str(e)}",
                "transcription": "",
                "summary": ""
            }
    
    def generate_summary(self, transcription: str) -> str:
        """Genera un resumen del texto transcrito con un formato más narrativo y periodístico"""
        if not transcription or len(transcription) < 50:
            return "Texto demasiado corto para generar resumen"
        
        try:
            # INICIO DE LA CORRECCIÓN: Prompt para forzar un resumen largo y narrativo
            summary_prompt = f"""
            Actúa como un reportero de Radio Altamar, con un enfoque en narrar la noticia.
            Genera un resumen periodístico de **7 a 8 oraciones descriptivas** para ser leído al aire. 
            El resumen debe ser formal, altamente informativo, y estructurado como un párrafo completo que contenga todos los detalles clave, incluyendo nombres, lugares y acciones.
            Asegúrate de que el texto fluya naturalmente para una narración continua.

            Texto a resumir:

            {transcription[:4000]}  # Limitar longitud para evitar sobrecarga
            
            Responde ÚNICAMENTE con el resumen, en formato de párrafo continuo.
            """
            # FIN DE LA CORRECCIÓN
        
            response = self.gemini_service.generate_content_with_retry(
                model='gemini-2.5-flash',
                contents=[summary_prompt]
            )
            
            return response.text.strip()
            
        except Exception as e:
            print(f" Error generando resumen: {e}")
            return "No se pudo generar el resumen"