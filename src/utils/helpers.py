import json
from datetime import datetime as dt

def validate_json_response(text: str):
    """Valida y limpia respuestas JSON de la IA"""
    try:
        clean_text = text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[len("```json"):].lstrip()
        elif clean_text.startswith("```"):
            clean_text = clean_text[len("```"):].lstrip()
        if clean_text.endswith("```"):
            clean_text = clean_text[:-len("```")].rstrip()
        
        return json.loads(clean_text)
    except json.JSONDecodeError:
        return {"error": "Invalid JSON", "raw_text": text}

def create_timestamp():
    """Crea un timestamp formateado"""
    return dt.now().strftime('%Y-%m-%d %H:%M:%S')

def format_file_size(size_bytes):
    """Formatea el tamaño de archivo en bytes a formato legible"""
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.2f} {size_names[i]}"