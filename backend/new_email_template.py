#!/usr/bin/env python3

def generate_report_new(user, value_now, value_last_week, best_assets, worst_assets):
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
                gap: 12px;
            }}
            .asset-item {{ 
                background: white;
                border-radius: 10px;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                border-left: 4px solid;
            }}
            .best-asset {{ border-left-color: #10b981; }}
            .worst-asset {{ border-left-color: #ef4444; }}
            .asset-symbol {{ 
                font-weight: 700;
                font-size: 1.1em;
            }}
            .asset-performance {{ 
                font-weight: 600;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.9em;
            }}
            .positive {{ background: #dcfce7; color: #166534; }}
            .negative {{ background: #fee2e2; color: #991b1b; }}
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
