#!/usr/bin/env python3
"""
Script para iniciar el sistema de reportes semanales automáticos.
Ejecutar con: python start_weekly_reports.py
"""

from weekly_report import start_scheduler
import time

def main():
    print("🚀 Iniciando sistema de reportes semanales automáticos...")
    print("📅 Los reportes se enviarán todos los viernes a las 6:00 PM")
    print("📧 Email configurado: facundomatiasrios108@gmail.com")
    print()
    
    try:
        start_scheduler()
        print("✅ Sistema iniciado correctamente!")
        print("⏰ Esperando próximo viernes a las 18:00...")
        print("🛑 Presiona Ctrl+C para detener")
        print()
        
        # Mantener el script corriendo
        while True:
            time.sleep(60)
            
    except KeyboardInterrupt:
        print("\n🛑 Sistema detenido por el usuario")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()
