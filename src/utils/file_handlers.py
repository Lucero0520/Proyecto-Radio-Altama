import os
import tempfile
import requests
from urllib.parse import urlparse
from src.utils.helpers import validate_json_response, create_timestamp
try:
    import yt_dlp
except ImportError:
    yt_dlp = None

class FileHandler:
    def __init__(self):
        """Inicializa el directorio temporal."""
 
        self.temp_dir = tempfile.gettempdir()
    
    def save_uploaded_file(self, file):
        """Guarda un archivo subido en un directorio temporal"""
        try:
        
            file_extension = os.path.splitext(file.filename)[1] if file.filename else '.tmp'
            temp_file = tempfile.NamedTemporaryFile(
                delete=False, 
                suffix=file_extension,
                dir=self.temp_dir 
            )
            
            # Guardar contenido
            file.save(temp_file.name)
            print(f"Archivo guardado temporalmente: {temp_file.name}")
            return temp_file.name
            
        except Exception as e:
            print(f" Error al guardar archivo: {e}")
            raise e
    
    def download_media_from_url(self, url):
        """Descarga contenido de una URL, usando yt-dlp para videos/audio de plataformas."""
        print(f" Descargando contenido de: {url}")
        
        is_platform_url = any(p in url.lower() for p in ['facebook.com', 'youtu.be', 'youtube.com', 'instagram.com'])

        if yt_dlp is not None and is_platform_url:
            try:
                print("⚙️ Usando yt-dlp para descarga robusta de video/audio...")
            
                unique_id = tempfile.NamedTemporaryFile().name.split(os.sep)[-1]
                temp_filename_base = os.path.join(self.temp_dir, f"dlp_temp_{unique_id}")
                
                ydl_opts = {
                    'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                    'outtmpl': temp_filename_base + '.%(ext)s',
                    'restrictfilenames': True,
                    'quiet': True,
                    'no_warnings': True,
                    'max_filesize': 100 * 1024 * 1024, 
                    'noplaylist': True,
                    'retries': 3,
                    'external_downloader_args': ['-loglevel', 'error']
                }

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info_dict = ydl.extract_info(url, download=True)
                    
                    file_path = ydl.prepare_filename(info_dict)
                    if not os.path.exists(file_path):
                        downloaded_files = [
                            os.path.join(self.temp_dir, f) for f in os.listdir(self.temp_dir) 
                            if f.startswith(f"dlp_temp_{unique_id}") 
                        ]
                        if downloaded_files:
                            file_path = downloaded_files[0]
                        else:
                            raise Exception("yt-dlp no pudo encontrar el archivo descargado.")

                    file_type = 'video' if info_dict.get('vcodec') and info_dict.get('vcodec') != 'none' else 'audio'
                    file_name = info_dict.get('title', os.path.basename(url))
                    
                    print(f" Contenido descargado con yt-dlp: {file_path}")
                    return file_path, file_name, file_type
                
            except Exception as e:
                error_msg = str(e).split('\n')[0].strip()
              
                raise Exception(f"MediaDownloadError: El enlace no apunta a un video o es privado. Detalle: {error_msg}")

   
        try:
            print("⚙️ Usando requests para descarga genérica...")
            
          
            parsed_url = urlparse(url)
            path = parsed_url.path.lower()
            
            if any(ext in path for ext in ['.mp4', '.mov', '.avi', '.mkv']):
                file_type = 'video'
                extension = '.mp4'
            elif any(ext in path for ext in ['.jpg', '.jpeg', '.png', '.gif']):
                file_type = 'image'
                extension = '.jpg'
            elif any(ext in path for ext in ['.mp3', '.wav', '.m4a']):
                file_type = 'audio'
                extension = '.mp3'
            else:
                file_type = 'video'
                extension = '.mp4'
            
        
            temp_file = tempfile.NamedTemporaryFile(
                delete=False, 
                suffix=extension,
                dir=self.temp_dir
            )
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, stream=True, timeout=30)
            response.raise_for_status()
            
            with open(temp_file.name, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f" Contenido descargado con requests: {temp_file.name}")
            return temp_file.name, os.path.basename(url), file_type
            
        except Exception as e:
            print(f"❌ Error al descargar de URL: {e}")
            raise e
    
    def cleanup_file(self, file_path):
        """Elimina un archivo temporal"""
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                print(f" Archivo temporal eliminado: {file_path}")
        except Exception as e:
            print(f" No se pudo eliminar archivo temporal: {e}")