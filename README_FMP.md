# Financial Modeling Prep (FMP) API Setup

## Descripción
La aplicación ahora utiliza Financial Modeling Prep como fuente de datos de mercado en tiempo real, reemplazando la anterior integración con AllTick debido a problemas de fiabilidad.

## ¿Por qué Financial Modeling Prep?
- ✅ API estable y confiable
- ✅ Plan gratuito con 250 requests/día
- ✅ Datos de alta calidad
- ✅ Documentación excelente
- ✅ Soporte para múltiples mercados
- ✅ Rate limiting bien definido

## Configuración

### 1. Obtener API Key
1. Ve a [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs)
2. Regístrate para obtener una cuenta gratuita
3. Obtén tu API key desde el dashboard

### 2. Configurar en la aplicación
1. Abre `frontend/src/config/fmp.js`
2. Reemplaza `'demo'` con tu API key real:
```javascript
API_KEY: 'tu_api_key_aqui',
```

### 3. Planes disponibles

#### Plan Gratuito
- 250 requests por día
- 5 requests por minuto
- Datos con 15 minutos de delay
- Perfecto para desarrollo y pruebas

#### Plan Premium ($14/mes)
- 10,000 requests por día  
- 300 requests por minuto
- Datos en tiempo real
- Ideal para producción

## Funcionalidades implementadas

### ✅ Precio en tiempo real
- Obtención de precios actuales para acciones individuales
- Actualizaciones automáticas cada 30 segundos
- Rate limiting automático para respetar los límites

### ✅ Bulk quotes
- Obtención eficiente de múltiples precios en una sola llamada
- Optimización para reducir el número de requests

### ✅ Datos adicionales
- Precio de apertura, máximo, mínimo
- Volumen de transacciones
- Cambio diario y porcentaje
- Market cap, P/E ratio, EPS

### ✅ Status monitoring
- Componente visual para mostrar el estado de la conexión
- Mensajes de error informativos
- Verificación automática cada 5 minutos

## Estructura de archivos

```
frontend/src/
├── config/
│   └── fmp.js              # Configuración de FMP API
├── services/
│   └── fmpService.js       # Servicio para llamadas a FMP
└── components/
    ├── FMPStatus.js        # Componente de estado de API
    └── FMPStatus.css       # Estilos del componente
```

## Limitaciones del plan gratuito

1. **Delay de datos**: Los datos tienen 15 minutos de retraso
2. **Rate limiting**: Máximo 5 requests por minuto
3. **Requests diarios**: Máximo 250 por día

## Solución de problemas

### Error: "API key not configured"
- Verifica que hayas actualizado `API_KEY` en `config/fmp.js`
- Asegúrate de que no contenga espacios o caracteres especiales

### Error: "Rate limit exceeded"
- Espera al menos 12 segundos entre requests
- El sistema implementa rate limiting automático

### Error: "No data returned"
- Verifica que el ticker sea válido (ej: AAPL, GOOGL, MSFT)
- Algunos tickers pueden no estar disponibles en FMP

### Datos incorrectos o desactualizados
- Plan gratuito tiene 15 min de delay
- Considera upgrade a plan premium para datos en tiempo real

## Próximas mejoras

- [ ] Implementar datos históricos para gráficos
- [ ] Agregar soporte para criptomonedas
- [ ] Implementar cache local para reducir requests
- [ ] Agregar más indicadores técnicos

## Contacto
Si necesitas ayuda con la configuración, revisa la [documentación oficial de FMP](https://financialmodelingprep.com/developer/docs) o abre un issue en el repositorio.
