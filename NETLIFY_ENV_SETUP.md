# Configuración de Variables de Entorno en Netlify

## Problema
La app desplegada en Netlify muestra error: `Firebase: Error (auth/invalid-api-key)` porque las variables de entorno no están configuradas.

## Solución

### Opción 1: Configurar desde el Dashboard de Netlify (RECOMENDADO)

1. Ve a tu proyecto en Netlify: https://app.netlify.com
2. Selecciona tu sitio
3. Ve a: **Site configuration** → **Environment variables**
4. Haz clic en **Add a variable**
5. Agrega cada una de estas variables:

```
REACT_APP_FIREBASE_API_KEY=AIzaSyDmZ_dWMT9YIcGiB6i-Upec4icmJZMrir4
REACT_APP_FIREBASE_AUTH_DOMAIN=app-financial-d62ae.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=app-financial-d62ae
REACT_APP_FIREBASE_STORAGE_BUCKET=app-financial-d62ae.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=445318851398
REACT_APP_FIREBASE_APP_ID=1:445318851398:web:38bbae8f1fc4fdd6b75347
REACT_APP_FIREBASE_MEASUREMENT_ID=G-5YV0Q7XRK9
```

6. **IMPORTANTE**: Después de agregar todas las variables, haz clic en **Deploy** → **Trigger deploy** → **Clear cache and deploy site**

### Opción 2: Usando Netlify CLI

```bash
# Si tienes Netlify CLI instalado
netlify env:set REACT_APP_FIREBASE_API_KEY "AIzaSyDmZ_dWMT9YIcGiB6i-Upec4icmJZMrir4"
netlify env:set REACT_APP_FIREBASE_AUTH_DOMAIN "app-financial-d62ae.firebaseapp.com"
netlify env:set REACT_APP_FIREBASE_PROJECT_ID "app-financial-d62ae"
netlify env:set REACT_APP_FIREBASE_STORAGE_BUCKET "app-financial-d62ae.firebasestorage.app"
netlify env:set REACT_APP_FIREBASE_MESSAGING_SENDER_ID "445318851398"
netlify env:set REACT_APP_FIREBASE_APP_ID "1:445318851398:web:38bbae8f1fc4fdd6b75347"
netlify env:set REACT_APP_FIREBASE_MEASUREMENT_ID "G-5YV0Q7XRK9"
```

## Verificación

Después de configurar las variables y re-deployar:

1. Abre la consola del navegador en tu sitio de Netlify
2. NO deberías ver el error `auth/invalid-api-key`
3. La app debería cargar normalmente

## Notas de Seguridad

- ⚠️ **NO** subas archivos `.env` o `.env.local` al repositorio
- ✅ Las variables están configuradas correctamente en `.gitignore`
- ✅ Firebase API keys son seguras para uso público (están protegidas por las reglas de seguridad de Firebase)

## Troubleshooting

Si después de configurar las variables el sitio sigue sin funcionar:

1. Verifica que todas las variables estén escritas exactamente como se muestra (respeta mayúsculas/minúsculas)
2. Asegúrate de hacer un "Clear cache and deploy site" después de agregar las variables
3. Verifica que el dominio de tu sitio de Netlify esté autorizado en Firebase Console:
   - Ve a Firebase Console → Authentication → Settings → Authorized domains
   - Agrega tu dominio de Netlify (ejemplo: `tu-sitio.netlify.app`)
