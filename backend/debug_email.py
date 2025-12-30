#!/usr/bin/env python3
"""
Debug del HTML generado para revisar problemas
"""

from weekly_report import (
    get_all_users, 
    get_user_positions, 
    get_available_cash,
    get_portfolio_value, 
    get_portfolio_performance,
    generate_report,
    get_last_friday
)
from datetime import datetime, timedelta

def debug_html():
    print("🔍 Generando HTML para debug...")
    
    # Obtener datos del usuario
    users = get_all_users()
    if not users:
        print("❌ No hay usuarios")
        return
    
    user = users[0]
    positions = get_user_positions(user['uid'])
    cash_now = get_available_cash(user['uid'])
    
    date_now = get_last_friday()
    date_last_week = date_now - timedelta(days=7)
    
    value_now = get_portfolio_value(positions, cash_now, date_now)
    value_last_week = get_portfolio_value(positions, cash_now, date_last_week)
    best_assets, worst_assets = get_portfolio_performance(positions, date_now, date_last_week)
    
    # Generar HTML
    report_html = generate_report(user, value_now, value_last_week, best_assets, worst_assets)
    
    # Guardar en archivo para revisar
    with open('debug_email.html', 'w', encoding='utf-8') as f:
        f.write(report_html)
    
    print(f"✅ HTML guardado en debug_email.html")
    print(f"📏 Tamaño: {len(report_html)} caracteres")
    print(f"🏆 Mejores: {best_assets}")
    print(f"📉 Peores: {worst_assets}")
    print()
    print("📧 Primeras 500 caracteres del HTML:")
    print(report_html[:500])
    print()
    print("📧 Últimos 500 caracteres del HTML:")
    print(report_html[-500:])

if __name__ == "__main__":
    debug_html()
