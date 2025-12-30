#!/bin/bash

# Script para iniciar el sistema de reportes semanales en background
# Uso: ./start_reports.sh

echo "🚀 Iniciando sistema de reportes semanales..."

# Activar el entorno virtual
source .venv/bin/activate

# Ejecutar el sistema en background
echo "📅 Configurado para enviar reportes todos los viernes a las 6 PM"
echo "📧 Email: facundomatiasrios108@gmail.com"
echo "🔄 Para detener: ps aux | grep weekly_report | kill [PID]"

nohup python backend/start_weekly_reports.py > weekly_reports.log 2>&1 &

echo "✅ Sistema iniciado en background (PID: $!)"
echo "📋 Log disponible en: weekly_reports.log"
echo "🛑 Para detener: kill $!"
