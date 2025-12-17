from datetime import datetime as dt
from src.config.firebase_config import initialize_firebase
from firebase_admin.firestore import Query 

class FirestoreService:
    def __init__(self):
        #  función de inicialización para obtener el cliente db
        self.db = initialize_firebase()
    
    def is_connected(self):
        """Verifica si hay conexión a Firestore"""
        return self.db is not None
    
    # ... (save_transcription y save_news_article se mantienen)
    def save_transcription(self, file_type: str, filename: str, original_text: str, summary_text: str, processed_by_admin_id=1):
        """Guarda una transcripción en Firestore"""
        if not self.is_connected():
            print("❌ No hay conexión a Firestore.")
            return False
        
        try:
            self.db.collection("Transcripciones").add({
                "type": file_type,
                "original_filename": filename,
                "original_text": original_text,
                "summary_text": summary_text,
                "processed_by": processed_by_admin_id,
                "created_at": dt.now()
            })
            print(f"✅ Transcripción guardada: {filename}")
            return True
        except Exception as e:
            print(f"❌ Error al guardar transcripción: {e}")
            return False
    
    def save_news_article(self, title: str, original_text: str, rewritten_text: str, processed_by_admin_id=1):
        """Guarda un artículo de noticias en Firestore"""
        if not self.is_connected():
            print("❌ No hay conexión a Firestore.")
            return False
        
        try:
            self.db.collection("Nuevos").add({
                "title": title,
                "description": rewritten_text,
                "original_text": original_text,
                "published_at": dt.now(),
                "created_at": dt.now(),
                "processed_by": processed_by_admin_id
            })
            print(f" Artículo guardado: {title}")
            return True
        except Exception as e:
            print(f"❌ Error al guardar artículo: {e}")
            return False
    
    # Función auxiliar para procesar documentos de historial de ambas colecciones
    def _process_history_documents(self, docs_stream, is_trash_mode=False): 
        # ... (Lógica de procesamiento de documentos) ...
        from datetime import datetime as dt_lib
        history_data = []
        for doc in docs_stream:
            data = doc.to_dict()
            
            # **CORRECCIÓN CLAVE:** Solo saltar documentos eliminados si NO estamos en la Papelera.
            if not is_trash_mode and data.get('deleted', False) is True: 
                continue 
                
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
            
            file_type = data.get('type', 'desconocido')
            file_name = data.get('original_filename', 'Archivo sin nombre')
            
            # Lógica para definir el título (Artículos usan 'title', Transcripciones usan 'filename')
            if 'title' in data and file_type not in ['url', 'image', 'video', 'social_media', 'audio']: 
                 title = data.get('title', 'Artículo sin título')
            else:
                 title_prefix = {
                    'url': "Transcripción de URL",
                    'image': "Transcripción de imagen",
                    'video': "Transcripción de video",
                    'social_media': "Transcripción de red social",
                    'audio': "Transcripción de audio"
                 }.get(file_type, "Transcripción")
                 title = f"{title_prefix}: {file_name}"

            # Usar 'summary_text' para Transcripciones y 'description' para Nuevos
            summary_preview = data.get('summary_text', data.get('description', 'Sin redacción')).replace('\n', ' ')
            if len(summary_preview) > 150:
                summary_preview = summary_preview[:150] + '...'
            
            history_data.append({
                'id': doc.id,
                'title': title,
                'file_name': file_name,
                'file_type': file_type,
                'summary_preview': summary_preview,
                'timestamp': timestamp_str
            })
        return history_data


    def get_transcription_history(self, limit=10):
        """Obtiene el historial de transcripciones NO eliminadas."""
        if not self.is_connected():
            return {"error": "❌ Conexión a Firebase no inicializada.", "status": "Error"}
        
        try:
            # 1. Obtener Transcripciones (asumiendo que los no eliminados son los activos)
            history_ref_trans = self.db.collection('Transcripciones').order_by('created_at', direction='DESCENDING').limit(limit)
            
            # 2. Obtener Noticias (Artículos)
            history_ref_news = self.db.collection('Nuevos').order_by('created_at', direction='DESCENDING').limit(limit)

            # 3. Procesar y filtrar en Python
            history_data = self._process_history_documents(history_ref_trans.stream(), is_trash_mode=False)
            history_data.extend(self._process_history_documents(history_ref_news.stream(), is_trash_mode=False))
            
            # 4. Ordenar y limitar
            history_data.sort(key=lambda item: item['timestamp'], reverse=True)
            
            return {"data": history_data[:limit], "status": "Success"} # Limitar el resultado final
        
        except Exception as e:
            print(f"❌ Error al obtener historial: {e}")
            error_msg = str(e)
            if "The query requires an index" in error_msg:
                 error_msg += ". Debes crear el índice compuesto en Firebase Console."
            return {"error": f"Error al acceder a la base de datos: {error_msg}", "status": "Error"}


    def get_trash_history(self, limit=50):
        """Obtiene el historial de documentos eliminados (papelera)."""
        if not self.is_connected():
            return {"error": "❌ Conexión a Firebase no inicializada.", "status": "Error"}
        
        try:
            # FIX: Aquí el filtro `where('deleted', '==', True)` es correcto
            
            # Consulta para Transcripciones ELIMINADAS
            trash_ref_trans = self.db.collection('Transcripciones').where('deleted', '==', True).order_by('created_at', direction='DESCENDING').limit(limit) 
            
            # Consulta para Noticias ELIMINADAS
            trash_ref_news = self.db.collection('Nuevos').where('deleted', '==', True).order_by('created_at', direction='DESCENDING').limit(limit) 

            # Procesar
            trash_data = self._process_history_documents(trash_ref_trans.stream(), is_trash_mode=True)
            trash_data.extend(self._process_history_documents(trash_ref_news.stream(), is_trash_mode=True))
            
            # Ordenar y limitar
            trash_data.sort(key=lambda item: item['timestamp'], reverse=True)

            return {"data": trash_data[:limit], "status": "Success"}
        
        except Exception as e:
            print(f"❌ Error al obtener historial de papelera: {e}")
            error_msg = str(e)
            if "The query requires an index" in error_msg:
                 error_msg += ". Debes crear el índice compuesto en Firebase Console."
            # Lanza el error de vuelta al frontend para que lo muestre
            return {"error": f"Error al acceder a la base de datos: {error_msg}", "status": "Error"}

    # Mantiene la lógica de búsqueda en ambas colecciones
    def get_history_detail(self, doc_id: str):
        """Obtiene el detalle completo de una transcripción por su ID."""
        if not self.is_connected():
            return {"error": "❌ Conexión a Firebase no inicializada.", "status": "Error"}
        
        from datetime import datetime as dt_lib

        try:
            doc_ref = self.db.collection('Transcripciones').document(doc_id)
            doc = doc_ref.get()
            
            # Si no se encuentra en Transcripciones, buscar en Nuevos (para artículos)
            if not doc.exists:
                doc_ref = self.db.collection('Nuevos').document(doc_id)
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

        
            full_text = data.get('original_text', data.get('description', 'No disponible'))
            summary = data.get('summary_text', data.get('title', 'No disponible'))
            
            # Lógica para el título
            doc_title = data.get('title', data.get('original_filename', 'N/A'))


            detail = {
                'id': doc.id,
                'title': doc_title,
                'type': data.get('type', 'desconocido'),
                'full_text': full_text,
                'summary': summary,
                'timestamp': timestamp_str
            }

            return {"data": detail, "status": "Success"}

        except Exception as e:
            print(f"❌ Error al obtener detalle de historial: {e}")
            return {"error": f"Error al acceder a la base de datos: {e}", "status": "Error"}
 

   
    # Implementa Soft Delete (mueve a papelera)
    def delete_history_item(self, doc_id: str):
        """Mueve un documento de transcripción o artículo a la papelera (Soft Delete)."""
        if not self.is_connected():
            return {"error": "❌ Conexión a Firebase no inicializada.", "status": "Error"}
        
        try:
            updated = False
        
            # Intenta en Transcripciones
            doc_ref_trans = self.db.collection('Transcripciones').document(doc_id)
            if doc_ref_trans.get().exists:
                doc_ref_trans.update({'deleted': True})
                print(f" Documento 'Transcripciones/{doc_id}' movido a papelera.")
                updated = True
 
            # Intenta en Nuevos
            doc_ref_news = self.db.collection('Nuevos').document(doc_id)
            if doc_ref_news.get().exists:
                doc_ref_news.update({'deleted': True})
                print(f" Documento 'Nuevos/{doc_id}' movido a papelera.")
                updated = True

            if updated:
                return {"status": "Success", "message": f"Documento {doc_id} movido a papelera."}
            else:
                return {"error": "Documento no encontrado en las colecciones Transcripciones ni Nuevos.", "status": "Error"}

        except Exception as e:
            error_msg = str(e)
            
            # CORRECCIÓN CLAVE: Mejora el diagnóstico del error para el usuario.
            if "Permission denied" in error_msg:
                 friendly_error = "Error de Permisos: El servicio carece de la autorización para modificar documentos."
            elif "DEADLINE_EXCEEDED" in error_msg:
                 friendly_error = "Error de Conexión: La base de datos no respondió a tiempo."
            else:
                 # Fallback, mostrando el inicio del error subyacente
                 friendly_error = f"Error al mover documento a papelera: {error_msg.split(':')[0].strip()}"

            print(f"❌ Error al eliminar documento '{doc_id}': {e}")
            return {"error": friendly_error, "status": "Error"}
        
    # Implementa Restauración
    def restore_item(self, doc_id: str):
        """Restaura un documento de la papelera (Soft Delete)."""
        if not self.is_connected():
            return {"error": "❌ Conexión a Firebase no inicializada.", "status": "Error"}
        
        try:
            updated = False
            
            # Intenta en Transcripciones
            doc_ref_trans = self.db.collection('Transcripciones').document(doc_id)
            if doc_ref_trans.get().exists:
                doc_ref_trans.update({'deleted': False})
                print(f"↩️ Documento 'Transcripciones/{doc_id}' restaurado de papelera.")
                updated = True
            
            # Intenta en Nuevos
            doc_ref_news = self.db.collection('Nuevos').document(doc_id)
            if doc_ref_news.get().exists:
                doc_ref_news.update({'deleted': False})
                print(f"↩️ Documento 'Nuevos/{doc_id}' restaurado de papelera.")
                updated = True

            if updated:
                return {"status": "Success", "message": f"Documento {doc_id} restaurado."}
            else:
                return {"error": "Documento no encontrado en las colecciones Transcripciones ni Nuevos.", "status": "Error"}

        except Exception as e:
            print(f"❌ Error al restaurar documento '{doc_id}': {e}")
            return {"error": f"Error al restaurar documento: {e}", "status": "Error"}