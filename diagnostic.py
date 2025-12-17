# test_to_part.py
from google.generativeai.types.content_types import to_part
import inspect

print("=== DIAGNÓSTICO DE to_part() ===")
print(f"Versión google-generativeai: 0.8.5")

# Ver la firma
try:
    sig = inspect.signature(to_part)
    print(f"\n🔍 Firma de to_part(): {sig}")
except Exception as e:
    print(f"\n❌ Error obteniendo firma: {e}")

# Probar diferentes llamadas
test_url = "https://example.com/video.mp4"
test_cases = [
    # 1. Diccionario con file_data
    {"name": "file_data dict", "arg": {"file_data": {"mime_type": "video/mp4", "file_uri": test_url}}},
    
    # 2. Solo diccionario file_uri (podría ser la forma correcta)
    {"name": "simple dict", "arg": {"mime_type": "video/mp4", "file_uri": test_url}},
    
    # 3. Tupla (data, mime_type)
    {"name": "tuple", "arg": (test_url, "video/mp4")},
    
    # 4. String URL solamente
    {"name": "string url", "arg": test_url},
    
    # 5. Diccionario con inline_data (para datos base64)
    {"name": "inline_data", "arg": {"inline_data": {"mime_type": "video/mp4", "data": "dummy_base64"}}},
]

print("\n🔍 Probando diferentes llamadas a to_part():")
for i, test in enumerate(test_cases, 1):
    try:
        result = to_part(test["arg"])
        print(f"{i}. ✅ {test['name']}: Funcionó - Tipo resultado: {type(result)}")
        if hasattr(result, '__dict__'):
            print(f"   Atributos: {list(result.__dict__.keys())}")
    except Exception as e:
        print(f"{i}. ❌ {test['name']}: Falló - Error: {e}")