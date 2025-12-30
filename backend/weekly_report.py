import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import yfinance as yf
from dotenv import load_dotenv
import os

# --- FIREBASE/FIRESTORE INTEGRATION ---
from firebase_service import firebase_service

# Cargar variables de entorno
load_dotenv(os.path.join(os.path.dirname(__file__), '.env.email'))

# Use centralized firebase service
db = firebase_service.get_db()

def get_all_users():
    return firebase_service.get_all_users()

def get_user_positions(uid):
    return firebase_service.get_user_positions(uid)

def get_available_cash(uid):
    return firebase_service.get_available_cash(uid)

import yfinance as yf

def get_portfolio_value(positions, cash, date):
    # Agrupar posiciones por ticker primero
    grouped_positions = {}
    for pos in positions:
        ticker = pos['ticker']
        quantity = pos['quantity']
        if not ticker or quantity == 0:
            continue
        if ticker in grouped_positions:
            grouped_positions[ticker] += quantity
        else:
            grouped_positions[ticker] = quantity
    
    total = cash
    for ticker, total_quantity in grouped_positions.items():
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(start=date.strftime('%Y-%m-%d'), end=(date+timedelta(days=1)).strftime('%Y-%m-%d'))
            if not hist.empty:
                price = hist['Close'].iloc[0]
                total += price * total_quantity
        except Exception:
            continue
    return total

def get_portfolio_performance(positions, date_now, date_last_week):
    # Agrupar posiciones por ticker primero
    grouped_positions = {}
    for pos in positions:
        ticker = pos['ticker']
        quantity = pos['quantity']
        if not ticker or quantity == 0:
            continue
        if ticker in grouped_positions:
            grouped_positions[ticker] += quantity
        else:
            grouped_positions[ticker] = quantity
    
    # Calcula el rendimiento de cada activo único
    asset_performance = []
    for ticker, total_quantity in grouped_positions.items():
        try:
            stock = yf.Ticker(ticker)
            hist_now = stock.history(start=date_now.strftime('%Y-%m-%d'), end=(date_now+timedelta(days=1)).strftime('%Y-%m-%d'))
            hist_last = stock.history(start=date_last_week.strftime('%Y-%m-%d'), end=(date_last_week+timedelta(days=1)).strftime('%Y-%m-%d'))
            if not hist_now.empty and not hist_last.empty:
                price_now = hist_now['Close'].iloc[0]
                price_last = hist_last['Close'].iloc[0]
                perf = ((price_now - price_last) / price_last) * 100 if price_last else 0
                asset_performance.append((ticker, perf))
        except Exception:
            continue
    
    asset_performance.sort(key=lambda x: x[1], reverse=True)
    best = [f"{t} {p:+.2f}%" for t, p in asset_performance[:3]]
    worst = [f"{t} {p:+.2f}%" for t, p in asset_performance[-3:]]
    return best, worst

# Configuración de Gmail desde variables de entorno
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'appmyportfolio@gmail.com')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', 'PENDIENTE_CONTRASEÑA_DE_APLICACION')
EMAIL_FROM = os.getenv('EMAIL_FROM', 'appmyportfolio@gmail.com')


def send_weekly_report(user_email, report_html):
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = '📊 Tu reporte semanal de My Portfolio'
        msg['From'] = f"My Portfolio App <{EMAIL_FROM}>"  # Nombre profesional
        msg['To'] = user_email
        part = MIMEText(report_html, 'html')
        msg.attach(part)
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            server.sendmail(EMAIL_FROM, user_email, msg.as_string())
        return True
    except Exception as e:
        print(f"❌ Error enviando email a {user_email}: {e}")
        return False


def get_last_friday(date=None):
    if date is None:
        date = datetime.now()
    offset = (date.weekday() - 4) % 7
    return (date - timedelta(days=offset)).replace(hour=18, minute=0, second=0, microsecond=0)

#!/usr/bin/env python3

def generate_report(user, value_now, value_last_week, best_assets, worst_assets):
    diff = value_now - value_last_week
    pct = (diff / value_last_week) * 100 if value_last_week else 0
    emoji = "📈" if diff >= 0 else "📉"
    trend_color = "#10b981" if diff >= 0 else "#ef4444"
    trend_bg = "#f0fdf4" if diff >= 0 else "#fef2f2"
    trend_text = "GANANCIA" if diff >= 0 else "PÉRDIDA"
    arrow = "↗" if diff >= 0 else "↘"
    
    # Generar tabla para mejores activos
    best_assets_rows = ""
    for asset in best_assets:
        parts = asset.split()
        symbol = parts[0]
        performance = parts[1]
        best_assets_rows += f'''
        <tr>
            <td style="padding: 12px 16px; background-color: white; border-left: 4px solid #10b981; border-bottom: 1px solid #e5e7eb;">
                <div style="font-weight: bold; font-size: 16px; color: #1f2937; margin-bottom: 2px;">{symbol}</div>
                <div style="color: #10b981; font-weight: bold; font-size: 14px;">{performance}</div>
            </td>
        </tr>'''
    
    # Generar tabla para peores activos
    worst_assets_rows = ""
    for asset in worst_assets:
        parts = asset.split()
        symbol = parts[0]
        performance = parts[1]
        worst_assets_rows += f'''
        <tr>
            <td style="padding: 12px 16px; background-color: white; border-left: 4px solid #ef4444; border-bottom: 1px solid #e5e7eb;">
                <div style="font-weight: bold; font-size: 16px; color: #1f2937; margin-bottom: 2px;">{symbol}</div>
                <div style="color: #ef4444; font-weight: bold; font-size: 14px;">{performance}</div>
            </td>
        </tr>'''
    
    return f'''
    <html>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden;">
                        
                        <!-- Header limpio -->
                        <tr>
                            <td style="background-color: #667eea; padding: 30px; text-align: center;">
                                <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold; letter-spacing: -0.5px;">
                                    📊 MY PORTFOLIO
                                </h1>
                                <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                                    Reporte Semanal Ejecutivo
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Saludo -->
                        <tr>
                            <td style="padding: 25px 30px; background-color: white;">
                                <h2 style="margin: 0 0 12px 0; color: #1e293b; font-size: 22px; font-weight: 600;">
                                    Hola {user['name']} 👋
                                </h2>
                                <p style="margin: 0; color: #64748b; font-size: 15px; line-height: 1.5;">
                                    Tu análisis de performance semanal está listo. Aquí tienes los insights más importantes de tu portfolio.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Performance principal -->
                        <tr>
                            <td style="padding: 0 30px 20px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: {trend_bg}; border: 2px solid {trend_color}; border-radius: 8px; overflow: hidden;">
                                    <tr>
                                        <td style="padding: 25px; text-align: center;">
                                            <h3 style="margin: 0 0 8px 0; color: {trend_color}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                                {trend_text} SEMANAL {arrow}
                                            </h3>
                                            <div style="font-size: 32px; font-weight: bold; color: {trend_color}; margin: 8px 0;">
                                                ${diff:+,.2f}
                                            </div>
                                            <div style="font-size: 16px; color: #64748b; font-weight: 500;">
                                                {pct:+.2f}% esta semana
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Valor total -->
                        <tr>
                            <td style="padding: 0 30px 25px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="vertical-align: middle;">
                                                        <p style="margin: 0 0 4px 0; color: #64748b; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                                                            VALOR TOTAL PORTFOLIO
                                                        </p>
                                                        <div style="font-size: 24px; font-weight: bold; color: #1e293b;">
                                                            ${value_now:,.2f}
                                                        </div>
                                                    </td>
                                                    <td width="50" style="text-align: right; vertical-align: middle;">
                                                        <div style="width: 40px; height: 40px; background-color: #667eea; border-radius: 50%; color: white; text-align: center; line-height: 40px; font-size: 18px;">
                                                            💰
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Top Performers -->
                        <tr>
                            <td style="padding: 0 30px 20px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="vertical-align: middle; padding-bottom: 12px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td width="40" style="vertical-align: middle;">
                                                                    <div style="width: 28px; height: 28px; background-color: #10b981; border-radius: 50%; color: white; text-align: center; line-height: 28px; font-size: 14px;">
                                                                        🏆
                                                                    </div>
                                                                </td>
                                                                <td style="vertical-align: middle;">
                                                                    <h3 style="margin: 0; color: #059669; font-size: 18px; font-weight: 600;">
                                                                        Top Performers
                                                                    </h3>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border: 1px solid #d1fae5;">
                                                {best_assets_rows}
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Underperformers -->
                        <tr>
                            <td style="padding: 0 30px 25px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="vertical-align: middle; padding-bottom: 12px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td width="40" style="vertical-align: middle;">
                                                                    <div style="width: 28px; height: 28px; background-color: #ef4444; border-radius: 50%; color: white; text-align: center; line-height: 28px; font-size: 14px;">
                                                                        📉
                                                                    </div>
                                                                </td>
                                                                <td style="vertical-align: middle;">
                                                                    <h3 style="margin: 0; color: #dc2626; font-size: 18px; font-weight: 600;">
                                                                        Requieren Atención
                                                                    </h3>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                                                {worst_assets_rows}
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #1e293b; padding: 25px; text-align: center;">
                                <h4 style="margin: 0 0 4px 0; color: white; font-size: 16px; font-weight: 600;">
                                    MY PORTFOLIO
                                </h4>
                                <p style="margin: 0 0 15px 0; color: #94a3b8; font-size: 12px;">
                                    Smart Portfolio Analytics
                                </p>
                                <p style="margin: 0; color: #64748b; font-size: 11px; line-height: 1.4;">
                                    📊 Análisis automatizado • 🚀 Insights en tiempo real • 📧 Reportes cada viernes 6 PM<br>
                                    Desarrollado para optimizar tus decisiones de inversión
                                </p>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
        
    </body>
    </html>
    '''
    
    return f'''
    <html>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc;">
        
        <!-- Contenedor principal -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
                        
                        <!-- Header moderno con gradiente simulado -->
                        <tr>
                            <td style="background: #667eea; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; position: relative;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>'); opacity: 0.3;"></div>
                                <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; letter-spacing: -1px; position: relative; z-index: 1;">
                                    📊 MY PORTFOLIO
                                </h1>
                                <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 300; position: relative; z-index: 1;">
                                    Reporte Semanal Ejecutivo
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Saludo personalizado -->
                        <tr>
                            <td style="padding: 30px; background: white;">
                                <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
                                    Hola {user['name']} 👋
                                </h2>
                                <p style="margin: 0; color: #64748b; font-size: 16px; line-height: 1.6;">
                                    Tu análisis de performance semanal está listo. Aquí tienes los insights más importantes de tu portfolio.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Performance principal con diseño moderno -->
                        <tr>
                            <td style="padding: 0 30px 20px 30px;">
                                <div style="background: {trend_bg}; border: 1px solid {trend_color}; border-radius: 16px; padding: 32px; text-align: center; position: relative; overflow: hidden;">
                                    <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: {trend_color}; opacity: 0.1; border-radius: 50%;"></div>
                                    <h3 style="margin: 0 0 8px 0; color: {trend_color}; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                        {trend_text} SEMANAL {arrow}
                                    </h3>
                                    <div style="font-size: 36px; font-weight: 700; color: {trend_color}; margin: 8px 0;">
                                        ${diff:+,.2f}
                                    </div>
                                    <div style="font-size: 18px; color: #64748b; font-weight: 500;">
                                        {pct:+.2f}% esta semana
                                    </div>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Valor total con estilo moderno -->
                        <tr>
                            <td style="padding: 0 30px 30px 30px;">
                                <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                                                Valor Total Portfolio
                                            </p>
                                            <div style="font-size: 28px; font-weight: 700; color: #1e293b;">
                                                ${value_now:,.2f}
                                            </div>
                                        </div>
                                        <div style="width: 60px; height: 60px; background: #667eea; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                            <span style="font-size: 24px;">💰</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Top Performers -->
                        <tr>
                            <td style="padding: 0 30px 20px 30px;">
                                <h3 style="margin: 0 0 16px 0; color: #059669; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
                                    <span style="background: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 16px;">🏆</span>
                                    Top Performers
                                </h3>
                                <div style="background: #f0fdf4; border-radius: 12px; padding: 20px;">
                                    {best_assets_cards}
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Underperformers -->
                        <tr>
                            <td style="padding: 0 30px 30px 30px;">
                                <h3 style="margin: 0 0 16px 0; color: #dc2626; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
                                    <span style="background: #ef4444; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 16px;">📉</span>
                                    Requieren Atención
                                </h3>
                                <div style="background: #fef2f2; border-radius: 12px; padding: 20px;">
                                    {worst_assets_cards}
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer premium -->
                        <tr>
                            <td style="background: #1e293b; padding: 30px; text-align: center;">
                                <div style="border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 20px;">
                                    <h4 style="margin: 0; color: white; font-size: 18px; font-weight: 600;">
                                        MY PORTFOLIO
                                    </h4>
                                    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 14px;">
                                        Smart Portfolio Analytics
                                    </p>
                                </div>
                                <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                                    📊 Análisis automatizado • 🚀 Insights en tiempo real • � Reportes cada viernes 6 PM<br>
                                    <span style="color: #475569;">Desarrollado para optimizar tus decisiones de inversión</span>
                                </p>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
        
    </body>
    </html>
    '''
    diff = value_now - value_last_week
    pct = (diff / value_last_week) * 100 if value_last_week else 0
    emoji = "📈" if diff >= 0 else "📉"
    trend_color = "#10b981" if diff >= 0 else "#ef4444"
    trend_bg = "#ecfdf5" if diff >= 0 else "#fef2f2"
    trend_text = "ganancia" if diff >= 0 else "pérdida"
    arrow = "↗️" if diff >= 0 else "↘️"
    
    # Generar HTML para mejores activos
    best_assets_html = ""
    for asset in best_assets:
        parts = asset.split()
        symbol = parts[0]
        performance = parts[1]
        best_assets_html += f'''
                        <div class="asset-item best-asset">
                            <span class="asset-symbol">{symbol}</span>
                            <span class="asset-performance positive">{performance}</span>
                        </div>'''
    
    # Generar HTML para peores activos
    worst_assets_html = ""
    for asset in worst_assets:
        parts = asset.split()
        symbol = parts[0]
        performance = parts[1]
        worst_assets_html += f'''
                        <div class="asset-item worst-asset">
                            <span class="asset-symbol">{symbol}</span>
                            <span class="asset-performance negative">{performance}</span>
                        </div>'''
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tu Reporte Semanal - My Portfolio</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6; 
                color: #1f2937; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px;
            }}
            .container {{ 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }}
            .header {{ 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
                padding: 40px 30px;
                text-align: center;
                position: relative;
            }}
            .header h1 {{ 
                font-size: 2.5em; 
                font-weight: 800;
                margin-bottom: 10px;
                position: relative;
                z-index: 1;
            }}
            .header h2 {{ 
                font-size: 1.2em; 
                font-weight: 400;
                opacity: 0.9;
                position: relative;
                z-index: 1;
            }}
            .content {{ 
                padding: 40px 30px;
                background: white;
            }}
            .greeting {{ 
                font-size: 1.1em; 
                margin-bottom: 30px;
                color: #374151;
            }}
            .performance-card {{ 
                background: {trend_bg};
                border: 2px solid {trend_color};
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
                position: relative;
                overflow: hidden;
            }}
            .performance-title {{ 
                color: {trend_color};
                font-size: 1.3em;
                font-weight: 700;
                margin-bottom: 15px;
            }}
            .performance-value {{ 
                font-size: 2.2em;
                font-weight: 800;
                color: {trend_color};
                margin: 10px 0;
            }}
            .performance-subtitle {{ 
                font-size: 1.1em;
                color: #6b7280;
                font-weight: 500;
            }}
            .current-value {{ 
                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
            }}
            .current-value-amount {{ 
                font-size: 1.8em;
                font-weight: 700;
                color: #1f2937;
            }}
            .section {{ 
                margin: 35px 0;
                background: #f9fafb;
                border-radius: 12px;
                padding: 25px;
            }}
            .section-title {{ 
                font-size: 1.3em;
                font-weight: 700;
                margin-bottom: 20px;
            }}
            .best-title {{ color: #059669; }}
            .worst-title {{ color: #dc2626; }}
            .assets-grid {{ 
                display: grid;
                gap: 15px;
                margin-top: 15px;
            }}
            .asset-item {{ 
                background: white;
                border-radius: 12px;
                padding: 20px 25px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
                border-left: 4px solid;
                margin-bottom: 8px;
                transition: transform 0.2s ease;
            }}
            .asset-item:hover {{
                transform: translateY(-2px);
                box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
            }}
            .best-asset {{ border-left-color: #10b981; }}
            .worst-asset {{ border-left-color: #ef4444; }}
            .asset-symbol {{ 
                font-weight: 700;
                font-size: 1.2em;
                color: #1f2937;
                letter-spacing: 0.5px;
            }}
            .asset-performance {{ 
                font-weight: 700;
                padding: 8px 16px;
                border-radius: 25px;
                font-size: 1em;
                min-width: 80px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                letter-spacing: 0.3px;
            }}
            .positive {{ 
                background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); 
                color: #065f46; 
                border: 1px solid #10b981;
            }}
            .negative {{ 
                background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); 
                color: #7f1d1d; 
                border: 1px solid #ef4444;
            }}
            .footer {{ 
                background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }}
            .footer p {{ 
                margin: 8px 0;
                opacity: 0.9;
            }}
            .brand {{ 
                font-weight: 700;
                color: #60a5fa;
            }}
            .divider {{ 
                height: 1px;
                background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
                margin: 30px 0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 My Portfolio</h1>
                <h2>Tu reporte semanal personalizado</h2>
            </div>
            
            <div class="content">
                <div class="greeting">
                    <strong>¡Hola {user['name']}!</strong><br>
                    Aquí tienes el resumen de tu portfolio esta semana. ¡Mantente informado de tus inversiones! 🚀
                </div>
                
                <div class="performance-card">
                    <div class="performance-title">
                        {emoji} Tu {trend_text} semanal
                    </div>
                    <div class="performance-value">
                        ${diff:+.2f} USD
                    </div>
                    <div class="performance-subtitle">
                        {pct:+.2f}% de cambio esta semana
                    </div>
                </div>
                
                <div class="current-value">
                    <div style="color: #6b7280; font-size: 0.9em; margin-bottom: 8px;">Valor total del portfolio</div>
                    <div class="current-value-amount">${value_now:,.2f} USD</div>
                </div>
                
                <div class="divider"></div>
                
                <div class="section">
                    <div class="section-title best-title">
                        🏆 Top performers de la semana
                    </div>
                    <div class="assets-grid">
                        {best_assets_html}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title worst-title">
                        📉 Activos con menor rendimiento
                    </div>
                    <div class="assets-grid">
                        {worst_assets_html}
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>Este reporte fue generado automáticamente por <span class="brand">My Portfolio</span></p>
                <p>📈 Mantente al día con tus inversiones • 📧 Cada viernes a las 6 PM</p>
                <p style="font-size: 0.8em; opacity: 0.7; margin-top: 15px;">
                    Desarrollado con ❤️ para ayudarte a tomar mejores decisiones financieras
                </p>
            </div>
        </div>
    </body>
    </html>
    '''
def weekly_task():
    users = get_all_users()
    date_now = get_last_friday()
    date_last_week = date_now - timedelta(days=7)
    for user in users:
        positions = get_user_positions(user['uid'])
        cash_now = get_available_cash(user['uid'])
        value_now = get_portfolio_value(positions, cash_now, date_now)
        value_last_week = get_portfolio_value(positions, cash_now, date_last_week)
        best_assets, worst_assets = get_portfolio_performance(positions, date_now, date_last_week)
        report_html = generate_report(user, value_now, value_last_week, best_assets, worst_assets)
        if user['email']:
            send_weekly_report(user['email'], report_html)

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Ejecutar todos los viernes a las 18:00
    scheduler.add_job(weekly_task, 'cron', day_of_week='fri', hour=18, minute=0)
    scheduler.start()
    return scheduler

if __name__ == '__main__':
    start_scheduler()
    print('Scheduler iniciado. Presiona Ctrl+C para salir.')
    import time
    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        pass
