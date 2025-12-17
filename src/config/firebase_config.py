import os

import firebase_admin
from firebase_admin import credentials, firestore
from firebase_admin.exceptions import FirebaseError
        
def initialize_firebase():
    """
    Inicializa Firebase Admin SDK y retorna el cliente de Firestore.
    Esta función se usa para establecer la conexión.
    """
    try:
        cred_path = "firebase_key.json"
        
        if not os.path.exists(cred_path):
            print("❌ Archivo de credenciales de Firebase no encontrado")
            print(f"📁 Buscando en: {os.path.abspath(cred_path)}")
            return None
     
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase inicializado correctamente")
        else:
            print("ℹ️ Firebase ya estaba inicializado")
       
        return firestore.client()
        
    except ImportError:
        print("❌ firebase-admin no está instalado. Ejecuta: pip install firebase-admin")
        return None
    except FirebaseError as e:
        print(f"❌ Error de Firebase: {e}")
        return None
    except Exception as e:
        print(f"❌ Error inesperado al inicializar Firebase: {e}")
        return None

def test_firestore_connection():
    """Prueba la conexión a Firestore"""
    db = initialize_firebase()
    if db:
        try:
            print("✅ Conexión a Firestore verificada")
            return True
        except Exception as e:
            print(f"❌ Error al conectar con Firestore: {e}")
            return False
    return False

def get_history_detail(self, doc_id: str):
        """Obtiene el detalle completo de una transcripción por su ID."""
        if not self.is_connected():
            return {"error": "❌ Conexión a Firebase no inicializada.", "status": "Error"}
        
        try:
            doc_ref = self.db.collection('Transcripciones').document(doc_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return {"error": "Documento no encontrado.", "status": "Error"}

            data = doc.to_dict()
            
            timestamp_obj = data.get('created_at')
            timestamp_str = 'N/A'
            try:
                if hasattr(timestamp_obj, 'to_pydatetime'):
                    timestamp_dt = timestamp_obj.to_pydatetime()
                    timestamp_str = timestamp_dt.strftime('%Y-%m-%d %H:%M:%S')
                elif hasattr(timestamp_obj, 'strftime'):
                    timestamp_str = timestamp_obj.strftime('%Y-%m-%d %H:%M:%S')
                elif timestamp_obj:
                    timestamp_str = str(timestamp_obj)
            except Exception:
                timestamp_str = 'Fecha no disponible'

            # Construir el objeto de detalle
            detail = {
                'id': doc.id,
                'title': data.get('original_filename', 'N/A'),
                'type': data.get('type', 'desconocido'),
                'full_text': data.get('original_text', 'No disponible'),
                'summary': data.get('summary_text', 'No disponible'),
                'timestamp': timestamp_str
            }

            return {"data": detail, "status": "Success"}

        except Exception as e:
            print(f"❌ Error al obtener detalle de historial: {e}")
            return {"error": f"Error al acceder a la base de datos: {e}", "status": "Error"}