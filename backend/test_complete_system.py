#!/usr/bin/env python3
"""
Test del sistema completo de reportes semanales
"""

from weekly_report import (
    get_all_users, 
    get_user_positions, 
    get_available_cash,
    get_portfolio_value, 
    get_portfolio_performance,
    generate_report,
    send_weekly_report,
    get_last_friday
)
from datetime import datetime, timedelta

def test_complete_system():
    print("🧪 Iniciando test del sistema completo...")
    print()
    
    # 1. Verificar usuarios
    print("1️⃣ Obteniendo usuarios...")
    users = get_all_users()
    print(f"   ✅ Encontrados {len(users)} usuarios")
    for user in users:
        print(f"   👤 {user['name']} ({user['email']})")
    print()
    
    # 2. Procesar cada usuario
    for user in users:
        print(f"2️⃣ Procesando usuario: {user['name']}")
        
        # Obtener posiciones
        positions = get_user_positions(user['uid'])
        print(f"   📊 Posiciones encontradas: {len(positions)}")
        for pos in positions:
            print(f"   • {pos.get('ticker', 'N/A')}: {pos.get('quantity', 0)} acciones")
        
        # Obtener cash
        cash_now = get_available_cash(user['uid'])
        print(f"   💰 Cash disponible: ${cash_now:,.2f}")
        
        # Calcular valores
        date_now = get_last_friday()
        date_last_week = date_now - timedelta(days=7)
        
        print(f"   📅 Comparando {date_last_week.strftime('%Y-%m-%d')} vs {date_now.strftime('%Y-%m-%d')}")
        
        value_now = get_portfolio_value(positions, cash_now, date_now)
        value_last_week = get_portfolio_value(positions, cash_now, date_last_week)
        
        print(f"   📈 Valor actual: ${value_now:,.2f}")
        print(f"   📈 Valor semana pasada: ${value_last_week:,.2f}")
        print(f"   🔄 Cambio: ${value_now - value_last_week:,.2f} ({((value_now - value_last_week) / value_last_week * 100):+.2f}%)")
        
        # Obtener performance de activos
        best_assets, worst_assets = get_portfolio_performance(positions, date_now, date_last_week)
        print(f"   🏆 Mejores activos: {len(best_assets)}")
        print(f"   📉 Peores activos: {len(worst_assets)}")
        
        # Generar reporte
        report_html = generate_report(user, value_now, value_last_week, best_assets, worst_assets)
        print(f"   📝 Reporte HTML generado ({len(report_html)} caracteres)")
        
        # Enviar email (solo si el usuario tiene email)
        if user['email']:
            print(f"   📧 Enviando email a {user['email']}...")
            send_weekly_report(user['email'], report_html)
            print(f"   ✅ Email enviado!")
        else:
            print(f"   ⚠️  Usuario sin email configurado")
        
        print()
    
    print("🎉 Test completado exitosamente!")

if __name__ == "__main__":
    test_complete_system()
