#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv

# Cargar configuración del email
load_dotenv('.env.email')

sys.path.append('/Users/facundorios/Documents/Facundo/Programacion/Proyectos/AppFinancial/backend')
from weekly_report import generate_report, send_weekly_report

def test_simple_email():
    print("🧪 Enviando email de prueba con template simplificado...")
    
    # Datos de prueba
    test_user = {
        'name': 'Facundo Test',
        'email': 'facundorios@gmail.com'
    }
    
    value_now = 85342.67
    value_last_week = 82150.34
    best_assets = ['GOOG +3.29%', 'AAPL +1.92%', 'LVMUY +1.67%']
    worst_assets = ['NKE -1.29%', 'ADBE -1.49%', 'COIN -4.79%']
    
    # Generar el HTML
    html_content = generate_report(test_user, value_now, value_last_week, best_assets, worst_assets)
    
    print(f"📏 HTML generado: {len(html_content)} caracteres")
    
    # Enviar email
    subject = "🚀 Tu Reporte Semanal - My Portfolio (TEST SIMPLE)"
    
    success = send_weekly_report(test_user['email'], html_content)
    
    if success:
        print(f"✅ Email enviado exitosamente a {test_user['email']}")
        print("📧 Revisa tu bandeja de entrada (y spam si no aparece)")
    else:
        print("❌ Error enviando el email")

if __name__ == "__main__":
    test_simple_email()
