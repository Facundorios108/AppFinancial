#!/usr/bin/env python3
"""
Script mejorado para ejecutar el sistema de reportes semanales de forma continua.
Este script está diseñado para ejecutarse en segundo plano de forma permanente.
"""

import os
import sys
import time
import signal
import logging
from datetime import datetime
from weekly_report import start_scheduler, weekly_task

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/facundorios/Documents/Facundo/Programacion/Proyectos/AppFinancial/weekly_reports.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class WeeklyReportsService:
    def __init__(self):
        self.scheduler = None
        self.running = True
        
    def signal_handler(self, signum, frame):
        """Maneja la señal de interrupción para un cierre limpio"""
        logger.info(f"🛑 Recibida señal {signum}. Cerrando sistema de reportes...")
        self.running = False
        if self.scheduler:
            self.scheduler.shutdown(wait=False)
        sys.exit(0)
        
    def start(self):
        """Inicia el servicio de reportes semanales"""
        # Registrar manejadores de señales
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        logger.info("🚀 Iniciando sistema de reportes semanales automáticos...")
        logger.info("📅 Los reportes se enviarán todos los viernes a las 6:00 PM")
        logger.info("📧 Sistema configurado para todos los usuarios registrados")
        
        try:
            # Iniciar el scheduler
            self.scheduler = start_scheduler()
            logger.info("✅ Sistema iniciado correctamente!")
            logger.info("⏰ Esperando próximo viernes a las 18:00...")
            logger.info("🛑 Para detener, usar Ctrl+C o kill -TERM <PID>")
            
            # Mantener el proceso corriendo
            while self.running:
                time.sleep(60)  # Dormir por 1 minuto
                
                # Log de estado cada hora
                current_time = datetime.now()
                if current_time.minute == 0:
                    logger.info(f"⏰ Sistema activo - {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
                    
        except Exception as e:
            logger.error(f"❌ Error en el sistema: {e}")
            sys.exit(1)
        finally:
            logger.info("🔴 Sistema de reportes semanales detenido")

def test_system():
    """Ejecuta un test del sistema antes de iniciar el scheduler"""
    logger.info("🧪 Ejecutando test del sistema...")
    try:
        weekly_task()
        logger.info("✅ Test del sistema completado exitosamente")
        return True
    except Exception as e:
        logger.error(f"❌ Error en el test del sistema: {e}")
        return False

def main():
    """Función principal"""
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        # Modo test
        success = test_system()
        sys.exit(0 if success else 1)
    else:
        # Modo normal - iniciar scheduler
        service = WeeklyReportsService()
        service.start()

if __name__ == "__main__":
    main()