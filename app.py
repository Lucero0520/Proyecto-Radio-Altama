from flask import Flask, render_template, send_from_directory, jsonify, request
from flask_cors import CORS
import os
import sys

# 1. Importar los Blueprints de sus rutas
from src.routes.main_routes import main_bp
from src.routes.api_routes import api_bp 

# 2. Importar la función de inicialización de Firebase (CRÍTICO)
# Solo importamos la función, la inicialización se maneja dentro de los servicios para resiliencia
try:
    from src.config.firebase_config import initialize_firebase
    initialize_firebase()
except ImportError as e:
    print(f"❌ ERROR CRÍTICO AL INICIAR: El servicio de Firebase/Firestore no puede cargarse.")
    print(f"Detalle: {e}")
except Exception as e:
    print(f"❌ ERROR CRÍTICO DE CONFIGURACIÓN DE FIREBASE: {e}")


app = Flask(__name__, template_folder='templates', static_folder='static')

# CORRECCIÓN CLAVE: CORS con origins='*' para permitir la conexión desde Firebase Hosting
CORS(app, resources={r"/api/*": {"origins": "*"}})

# 3. REGISTRAR BLUEPRINTS (CRÍTICO PARA QUE LAS RUTAS FUNCIONEN)
app.register_blueprint(main_bp) 
app.register_blueprint(api_bp, url_prefix='/api') 


# RUTA PARA EL LOGO (CRÍTICA para los estilos)
@app.route('/LOGO.png')
def serve_logo():
    """Servir el logo desde la carpeta static"""
    return send_from_directory(os.path.join(os.path.dirname(__file__), 'static'), 'LOGO.png')


if __name__ == "__main__":
    app.run(debug=True, port=5000)