# 🚀 Guía Completa de Despliegue en Railway

## Paso 1: Crear Cuenta en Railway

1. Ve a [railway.app](https://railway.app)
2. Haz clic en **"Start a New Project"** o **"Sign Up"**
3. Registrate con tu cuenta de **GitHub** (es la forma más fácil)
4. Autoriza Railway para acceder a tus repositorios

## Paso 2: Preparar el Repositorio

### 2.1 Asegúrate de que el código esté en GitHub

Si aún no tienes tu código en GitHub:

```bash
cd /Users/facundorios/Documents/Facundo/Programacion/Proyectos/AppFinancial

# Inicializa git (si no lo has hecho)
git init

# Agrega todos los archivos
git add .

# Haz un commit
git commit -m "Preparando para despliegue en Railway"

# Crea un repositorio en GitHub y conecta
# (ve a github.com y crea un nuevo repositorio llamado "AppFinancial")
git remote add origin https://github.com/TU_USUARIO/AppFinancial.git
git branch -M main
git push -u origin main
```

### 2.2 Verifica los archivos necesarios

Los siguientes archivos ya están creados en tu carpeta `backend/`:

- ✅ `requirements.txt` - Dependencias de Python
- ✅ `railway.json` - Configuración de Railway
- ✅ `Procfile` - Comando de inicio
- ✅ `runtime.txt` - Versión de Python
- ✅ `main.py` - Tu aplicación FastAPI

## Paso 3: Crear Proyecto en Railway

1. En Railway, haz clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Busca y selecciona tu repositorio **AppFinancial**
4. Railway detectará automáticamente que es un proyecto Python

## Paso 4: Configurar Variables de Entorno

### 4.1 Variables de Firebase

En tu proyecto de Railway:

1. Ve a la pestaña **"Variables"**
2. Haz clic en **"New Variable"** y agrega cada una:

```bash
# Firebase Service Account (contenido del archivo firebase_service_account.json)
# Abre el archivo y copia TODO el contenido JSON
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"app-financial-d62ae",...}

# O si prefieres usar ruta (menos recomendado para Railway)
GOOGLE_APPLICATION_CREDENTIALS=/app/firebase_service_account.json
```

### 4.2 Variables opcionales

```bash
PORT=8001  # Railway usa variable $PORT automáticamente, no necesitas configurarla
PYTHON_VERSION=3.11.7
```

### 4.3 Subir archivo firebase_service_account.json

Railway necesita el archivo de credenciales de Firebase:

**Opción A: Como variable de entorno (RECOMENDADO)**
1. Abre `backend/firebase_service_account.json`
2. Copia TODO el contenido JSON
3. En Railway Variables, crea: `GOOGLE_APPLICATION_CREDENTIALS_JSON` y pega el JSON

**Opción B: Incluirlo en el repositorio (NO RECOMENDADO para seguridad)**
- Ya lo tienes en el repo, pero asegúrate de que NO esté en `.gitignore`

## Paso 5: Configurar el Root Directory

Railway necesita saber que tu código está en la carpeta `backend/`:

1. En tu proyecto de Railway, ve a **Settings**
2. Busca **"Root Directory"**
3. Configúralo como: `backend`
4. Guarda los cambios

## Paso 6: Desplegar

1. Railway desplegará automáticamente después de configurar
2. O haz clic en **"Deploy"** manualmente
3. Espera 2-3 minutos mientras Railway:
   - Instala las dependencias
   - Construye la aplicación
   - Inicia el servidor

## Paso 7: Obtener la URL Pública

1. Ve a la pestaña **"Settings"**
2. En **"Networking"** o **"Domains"**, haz clic en **"Generate Domain"**
3. Railway te dará una URL como: `https://tu-app-production.up.railway.app`
4. **Copia esta URL** - la necesitarás para el frontend

## Paso 8: Verificar que Funciona

Prueba tu API en el navegador:

```
https://tu-app-production.up.railway.app/api/health
https://tu-app-production.up.railway.app/api/market/status
```

Deberías ver respuestas JSON.

## Paso 9: Configurar Frontend (Netlify)

Ahora necesitas decirle a tu frontend en Netlify que use el backend de Railway:

### 9.1 En Netlify Dashboard

1. Ve a tu sitio en [app.netlify.com](https://app.netlify.com)
2. Ve a **Site configuration** → **Environment variables**
3. Agrega/Actualiza esta variable:

```bash
REACT_APP_API_URL=https://tu-app-production.up.railway.app
```

(Reemplaza con la URL real que te dio Railway)

### 9.2 Re-desplegar Frontend

1. En Netlify, ve a **Deploys**
2. Haz clic en **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Espera 1-2 minutos

## Paso 10: ¡Probar Todo!

1. Abre tu app en Netlify: `https://fmrportfolio.netlify.app`
2. Abre las Developer Tools (F12)
3. Verifica que NO haya errores de conexión
4. Los datos deberían cargar correctamente
5. **Prueba desde tu celular** - ¡debería funcionar perfectamente!

## 🔧 Troubleshooting

### Error: "ModuleNotFoundError"
- Verifica que `requirements.txt` esté completo
- Re-despliega desde Railway

### Error: "Connection refused"
- Verifica que la URL de Railway esté correcta en Netlify
- Asegúrate de haber configurado `REACT_APP_API_URL`

### Error: Firebase "Permission denied"
- Verifica que `GOOGLE_APPLICATION_CREDENTIALS_JSON` esté configurado correctamente
- Asegúrate de haber copiado TODO el JSON del archivo

### Los cambios no se reflejan
- En Railway: haz click en "Redeploy"
- En Netlify: "Clear cache and deploy site"

## 📊 Monitoreo

### Ver Logs en Railway
1. Ve a tu proyecto en Railway
2. Haz clic en la pestaña **"Deployments"**
3. Selecciona el deployment activo
4. Verás los logs en tiempo real

### Costos
- Railway: $5/mes de crédito gratis (suficiente para desarrollo)
- Netlify: Gratis para proyectos personales

## 🎯 Próximos Pasos

Una vez que todo funcione:

1. Configura un dominio personalizado (opcional)
2. Configura SSL (Railway lo hace automáticamente)
3. Configura monitoring y alertas
4. Configura CI/CD para despliegues automáticos

## 📝 Notas Importantes

- ⚠️ **NO subas** archivos `.env` al repositorio
- ✅ Usa variables de entorno en Railway y Netlify
- 🔒 Las API keys de Firebase son seguras en el frontend (protegidas por Firebase Security Rules)
- 📱 La app funcionará desde cualquier dispositivo con internet

---

## Comandos Útiles

### Desarrollo Local
```bash
# Backend
cd backend
source ../.venv/bin/activate
uvicorn main:app --reload --port 8001

# Frontend
cd frontend
npm start
```

### Ver logs de Railway (CLI)
```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Ver logs
railway logs
```

---

¿Problemas? Abre una issue en el repositorio o contacta al equipo.
