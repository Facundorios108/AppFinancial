#!/bin/bash

# Script de gestión para el sistema de reportes semanales
# Uso: ./manage_reports.sh [start|stop|status|test|logs]

SCRIPT_DIR="/Users/facundorios/Documents/Facundo/Programacion/Proyectos/AppFinancial/backend"
PYTHON_PATH="/Users/facundorios/Documents/Facundo/Programacion/Proyectos/AppFinancial/.venv/bin/python"
SCHEDULER_SCRIPT="run_weekly_scheduler.py"
LOG_FILE="/Users/facundorios/Documents/Facundo/Programacion/Proyectos/AppFinancial/weekly_reports.log"

case "$1" in
    start)
        echo "🚀 Iniciando sistema de reportes semanales..."
        cd "$SCRIPT_DIR"
        nohup $PYTHON_PATH $SCHEDULER_SCRIPT > /dev/null 2>&1 &
        echo "✅ Sistema iniciado en segundo plano"
        echo "📋 Usar './manage_reports.sh status' para verificar el estado"
        ;;
    stop)
        echo "🛑 Deteniendo sistema de reportes semanales..."
        PID=$(ps aux | grep "$SCHEDULER_SCRIPT" | grep -v grep | awk '{print $2}')
        if [ -n "$PID" ]; then
            kill -TERM $PID
            echo "✅ Sistema detenido (PID: $PID)"
        else
            echo "⚠️ No se encontró el proceso ejecutándose"
        fi
        ;;
    status)
        echo "📊 Estado del sistema de reportes:"
        PID=$(ps aux | grep "$SCHEDULER_SCRIPT" | grep -v grep | awk '{print $2}')
        if [ -n "$PID" ]; then
            echo "✅ Sistema ejecutándose (PID: $PID)"
            echo "⏰ Próximo reporte: Viernes a las 18:00"
        else
            echo "❌ Sistema no está ejecutándose"
        fi
        ;;
    test)
        echo "🧪 Ejecutando test del sistema..."
        cd "$SCRIPT_DIR"
        $PYTHON_PATH $SCHEDULER_SCRIPT --test
        ;;
    logs)
        echo "📋 Últimos logs del sistema:"
        tail -20 "$LOG_FILE"
        ;;
    *)
        echo "📖 Uso: $0 {start|stop|status|test|logs}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start  - Iniciar el sistema de reportes semanales"
        echo "  stop   - Detener el sistema de reportes semanales"  
        echo "  status - Verificar el estado del sistema"
        echo "  test   - Ejecutar test del sistema y enviar reportes"
        echo "  logs   - Mostrar los últimos logs del sistema"
        exit 1
        ;;
esac