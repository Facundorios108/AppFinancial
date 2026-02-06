FROM python:3.11-slim

WORKDIR /app

# Copiar archivos de dependencias
COPY backend/requirements.txt ./backend/

# Instalar dependencias
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copiar todo el código del backend
COPY backend ./backend

# Copiar archivo de credenciales si existe
COPY backend/firebase_service_account.json ./backend/firebase_service_account.json 2>/dev/null || true

# Cambiar al directorio backend
WORKDIR /app/backend

# Exponer el puerto
EXPOSE 8001

# Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
