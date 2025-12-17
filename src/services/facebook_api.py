import requests
import os
import json
from datetime import datetime as dt, timedelta


ACCESS_TOKEN = "EAALviakYYNABP479pHIQhJ8vVRB3QlhoKISC0ZB2pAIjWlAgDUV24vqv4HPDQhWGX5ZBM8ETDlrI7NIsbZA6oQBVUa4c9RTMOpRwfBV6ZAMSW2FvUZASRSSxBWypL6zvkXP8CxIPBgcQZBJ2XmV74JelEKHVuZBQVv7jZBMxo4psOj0otVn9ZBYYV8POrBkJoGhcNLDbGRIYZD"
FACEBOOK_PAGE_IDS = ['100311605515158']
POST_LIMIT = 5
FIELDS = "message,permalink_url,created_time"
BASE_URL = "https://graph.facebook.com/v19.0"

def get_ilo_news() -> list:
    """Obtiene noticias de las páginas de Facebook configuradas"""
    print("📱 Conectando a la API de Facebook...")
    
    all_news = []
    
    if not ACCESS_TOKEN or ACCESS_TOKEN.startswith("TU_"):
        print(" ERROR: Access Token no configurado correctamente.")
        return []
        
    if not FACEBOOK_PAGE_IDS:
        print(" ADVERTENCIA: No hay IDs de página configurados.")
        return []

    for page_id in FACEBOOK_PAGE_IDS:
        endpoint = f"{page_id}/posts"
        full_url = f"{BASE_URL}/{endpoint}"
        
        params = {
            "access_token": ACCESS_TOKEN,
            "fields": FIELDS,
            "limit": POST_LIMIT
        }
        
        try:
            response = requests.get(full_url, params=params)
            response.raise_for_status() 
            data = response.json()
            
            if 'data' in data:
                for post in data['data']:
                    if 'message' in post:
                        all_news.append({
                            "time": post.get('created_time'),
                            "message": post.get('message', 'Sin descripción.'),
                            "link": post.get('permalink_url', '#')
                        })
                print(f" Obtenidas {len(data['data'])} noticias de la página {page_id}.")
            
        except requests.exceptions.RequestException as e:
            print(f" ERROR al conectar con página {page_id}: {e}")
            continue 
            
        except Exception as e:
            print(f" Error desconocido al procesar noticias de {page_id}: {e}")
            continue
            
    if not all_news:
        return [
            {
                "time": "Error",
                "message": "Fallo de Conexión: No se pudo obtener ninguna noticia real. Revise su Token y los IDs de página.",
                "link": "#"
            }
        ]
            
    return all_news

def get_facebook_page_stats() -> dict:
    """Obtiene métricas básicas de las páginas de Facebook"""
    print(" Obteniendo estadísticas de la página de Facebook...")
    
    if not FACEBOOK_PAGE_IDS:
        return {"error": " ADVERTENCIA: No hay IDs de página configurados para estadísticas."}

    page_id = FACEBOOK_PAGE_IDS[0] 
    
    fields = "fan_count" 
    
    endpoint = f"{page_id}"
    full_url = f"{BASE_URL}/{endpoint}"
    
    params = {
        "access_token": ACCESS_TOKEN,
        "fields": fields
    }
    
    try:
        response = requests.get(full_url, params=params)
        response.raise_for_status() 
        data = response.json()
        
        fan_count = data.get('fan_count')
        
        if fan_count is not None:
            print(f" Estadísticas obtenidas. Likes: {fan_count}.")
            return {
                "page_id": page_id,
                "fan_count": fan_count,
                "status": "Success"
            }
        else:
            return {
                "error": " Error de Datos: 'fan_count' no encontrado."
            }
            
    except requests.exceptions.HTTPError as e:
        error_detail = response.json().get('error', {})
        print(f" ERROR HTTP al obtener estadísticas: {e}")
        return {
            "error": "Error de Permisos/Conexión con Meta API (HTTP)",
            "details": error_detail.get('message', str(e))
        }
    except Exception as e:
        print(f" Error desconocido al obtener estadísticas: {e}.")
        return {"error": f"Error desconocido: {str(e)}"}
        
def get_facebook_monthly_insights() -> dict:
    """Obtiene las métricas mensuales de la página para el gráfico"""
    print(" Obteniendo métricas mensuales de la página...")
    
    if not FACEBOOK_PAGE_IDS:
        return {"error": " ADVERTENCIA: No hay IDs de página configurados para métricas."}

    page_id = FACEBOOK_PAGE_IDS[0] 
    
    metric_name = "page_post_engagements"
    
    endpoint = f"{page_id}/insights"
    full_url = f"{BASE_URL}/{endpoint}"

    # ⭐️ CORRECCIÓN: SOLO USAMOS PERIOD Y LIMIT para evitar el error 400. ⭐️
    params = {
        "access_token": ACCESS_TOKEN,
        "metric": metric_name,
        "period": "month",
        "limit": 5 # Esto le pide a la API que devuelva las últimas 5 agregaciones mensuales.
    }
    
    try:
        response = requests.get(full_url, params=params)
        response.raise_for_status() 
        data = response.json()
        
        if data.get('data'):
            metric_data = data['data'][0]['values']
            
            # El formato de fecha se maneja correctamente
            labels = [dt.strptime(item['end_time'].split('T')[0], '%Y-%m-%d').strftime('%b') for item in metric_data]
            values = [item['value'] for item in metric_data]
            
            return {
                "labels": labels,
                "data": values,
                "metric_name": data['data'][0]['title'],
                "status": "Success"
            }
        else:
            return {
                "error": "❌ Error de Datos: No se encontraron valores para la métrica."
            }
            
    except requests.exceptions.HTTPError as e:
        error_detail = response.json().get('error', {})
        print(f"❌ ERROR HTTP al obtener métricas mensuales: {e}")
        return {
            "error": f"Error de Permisos/Conexión con Meta API (HTTP). Detalles: {error_detail.get('message', str(e))}",
            "details": error_detail.get('message', str(e))
        }
    except Exception as e:
        print(f"❌ Error desconocido al obtener métricas: {e}.")
        return {"error": f"Error desconocido: {str(e)}"}