#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Cargar configuración del email
load_dotenv('.env.email')

# Inicializar Firebase
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(BASE_DIR, 'firebase_service_account.json')
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
db = firestore.client()

sys.path.append('/Users/facundorios/Documents/Facundo/Programacion/Proyectos/AppFinancial/backend')
from weekly_report import generate_report, send_weekly_report, get_portfolio_value, get_portfolio_performance

def get_all_users():
    """Obtener todos los usuarios de Firebase"""
    try:
        users_ref = db.collection('users')
        users = []
        for doc in users_ref.stream():
            user_data = doc.to_dict()
            user_data['uid'] = doc.id
            users.append(user_data)
        return users
    except Exception as e:
        print(f"❌ Error obteniendo usuarios: {e}")
        return []

def test_email_for_logged_users():
    print("🔍 Buscando usuarios logueados en Firebase...")
    
    # Obtener todos los usuarios
    users = get_all_users()
    
    if not users:
        print("❌ No se encontraron usuarios en Firebase")
        return
    
    print(f"👥 Usuarios encontrados: {len(users)}")
    
    # Mostrar opciones
    for i, user in enumerate(users):
        print(f"{i+1}. {user.get('name', 'Sin nombre')} - {user.get('email', 'Sin email')}")
    
    # Pedir al usuario que elija
    try:
        choice = input("\n🎯 ¿A qué usuario quieres enviar el email de prueba? (número): ")
        choice_idx = int(choice) - 1
        
        if choice_idx < 0 or choice_idx >= len(users):
            print("❌ Opción inválida")
            return
            
        selected_user = users[choice_idx]
        
        if not selected_user.get('email'):
            print("❌ Este usuario no tiene email configurado")
            return
        
        print(f"📧 Enviando email de prueba a: {selected_user['email']}")
        
        # Datos de prueba
        value_now = 85342.67
        value_last_week = 82150.34
        best_assets = ['GOOG +3.29%', 'AAPL +1.92%', 'LVMUY +1.67%']
        worst_assets = ['NKE -1.29%', 'ADBE -1.49%', 'COIN -4.79%']
        
        # Generar el HTML
        html_content = generate_report(selected_user, value_now, value_last_week, best_assets, worst_assets)
        
        print(f"📏 HTML generado: {len(html_content)} caracteres")
        
        # Enviar email
        success = send_weekly_report(selected_user['email'], html_content)
        
        if success:
            print(f"✅ Email enviado exitosamente a {selected_user['email']}")
            print("📧 Revisa la bandeja de entrada (y spam si no aparece)")
        else:
            print("❌ Error enviando el email")
            
    except ValueError:
        print("❌ Por favor ingresa un número válido")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_email_for_logged_users()
