import os
import json
import time
import random
from google import genai
from google.genai import types
import mimetypes 


class GeminiService:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "AIzaSyC7p3bpCQBjdKXCzKacyRrOdjAo1Txnk5w")
        self.client = None
        self.initialize_client()
    
    def initialize_client(self):
        """Inicializa el cliente de Gemini"""
        try:
            self.client = genai.Client(api_key=self.api_key)
            print(" Cliente Gemini inicializado correctamente.")
        except Exception as e:
            print(f" Error al inicializar Gemini: {e}")
            self.client = None
    
    def is_initialized(self):
        """Verifica si el cliente está inicializado"""
        return self.client is not None
    
    def clean_json_output(self, text: str) -> str:
        """Limpia la salida JSON de Gemini"""
        if not text:
            return ""
        text = text.strip()
        if text.startswith("```json"):
            text = text[len("```json"):].lstrip()
        elif text.startswith("```"):
            text = text[len("```"):].lstrip()
        if text.endswith("```"):
            text = text[:-len("```")].rstrip()
        return text
    
    def generate_content_with_retry(self, model: str, contents: list, config: dict = None, max_retries: int = 6):
        """Genera contenido con reintentos automáticos para errores 503"""
        if not self.is_initialized():
            raise Exception("Cliente Gemini no inicializado.")
            
        for attempt in range(max_retries):
            try:
                print(f"🔄 Intento {attempt + 1}/{max_retries}: Llamando a Gemini ({model})...")
                
            
                generate_config = types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=4000,
                )
                
    
                if config and 'system_instruction' in config:
                    generate_config.system_instruction = config['system_instruction']
                

                if config and 'tools' in config:
                    generate_config.tools = config['tools']
                
                response = self.client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=generate_config
                )
                print(" Llamada a Gemini exitosa")
                return response
                
            except Exception as e:
                error_message = str(e)
                print(f" Error en intento {attempt + 1}: {error_message}")
                
              
                if any(error in error_message for error in ["503", "OVERLOADED", "UNAVAILABLE", "model is overloaded", "RESOURCE_EXHAUSTED"]):
                    if attempt < max_retries - 1:
                      
                        wait_time = (2 ** attempt) + random.uniform(0, 1)
                        print(f" Servidor sobrecargado. Reintentando en {wait_time:.1f} segundos...")
                        time.sleep(wait_time)
                        continue
                
                raise e
        
        raise Exception(f"❌ La API de Gemini sigue no disponible después de {max_retries} reintentos.")
    
    def upload_and_process_file(self, file_path: str):
        """Sube y procesa un archivo en Gemini - VERSIÓN FINAL"""
        if not self.is_initialized():
            raise Exception("Cliente Gemini no inicializado.")
        
        print(f" Subiendo archivo: {file_path}")
        
        try:
            # Sube el archivo localmente
            uploaded_file = self.client.files.upload(file=file_path) 
            
            print(f" Esperando procesamiento del archivo: {uploaded_file.name}")
            # Esperar 
            while uploaded_file.state == types.FileState.PROCESSING:
                time.sleep(2)
                uploaded_file = self.client.files.get(name=uploaded_file.name)
                print(f" Estado actual: {uploaded_file.state.name}")
            
            if uploaded_file.state != types.FileState.ACTIVE:
                raise Exception(f"❌ El archivo falló al procesarse. Estado: {uploaded_file.state.name}")
            
            print(f" Archivo procesado exitosamente: {uploaded_file.name}")
            return uploaded_file
            
        except Exception as e:
            print(f"❌ Error al subir archivo: {e}")
            raise e
    def delete_file(self, uploaded_file):
        """Elimina un archivo de Gemini"""
        if uploaded_file and self.is_initialized():
            try:
                self.client.files.delete(name=uploaded_file.name)
                print(f" Archivo {uploaded_file.name} eliminado de Gemini.")
            except Exception as e:
                print(f" No se pudo eliminar el archivo: {e}")