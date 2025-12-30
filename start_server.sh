#!/bin/bash

# Script para iniciar el servidor FastAPI automáticamente
echo "🚀 Iniciando servidor FastAPI..."

# Navegar al directorio del proyecto
cd /Users/facundorios/Documents/Facundo/Programacion/Proyectos/AppFinancial

# Activar el entorno virtual
source .venv/bin/activate

# Ir al directorio backend
cd backend

# Iniciar el servidor
echo "📡 Servidor iniciando en http://localhost:8001"
echo "🔄 Modo reload activado - detecta cambios automáticamente"
echo "🛑 Para detener: Ctrl+C"

/Users/facundorios/Documents/Facundo/Programacion/Proyectos/AppFinancial/.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
