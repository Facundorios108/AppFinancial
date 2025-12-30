# 📊 Sistema de Reportes Semanales - My Portfolio

## 🎯 Descripción
Sistema automatizado que genera y envía reportes semanales de performance del portfolio por email todos los viernes a las 18:00 horas.

## ✅ Estado Actual
**✅ SISTEMA FUNCIONANDO CORRECTAMENTE**

El sistema está configurado y ejecutándose en segundo plano. Los reportes se envían automáticamente todos los viernes a las 18:00 PM.

## 🚀 Gestión del Sistema

Usa el script `manage_reports.sh` para gestionar el sistema:

```bash
# Verificar estado del sistema
./manage_reports.sh status

# Iniciar el sistema (si está detenido)
./manage_reports.sh start

# Detener el sistema
./manage_reports.sh stop

# Ejecutar test y enviar reportes manualmente
./manage_reports.sh test

# Ver logs del sistema
./manage_reports.sh logs
```

## 📧 Configuración de Email

- **Servidor SMTP**: Gmail (smtp.gmail.com:587)
- **Email origen**: appmyportfolio@gmail.com
- **Destinatarios**: Todos los usuarios registrados en Firebase
- **Horario**: Viernes 18:00 PM (automático)

## 📊 Contenido del Reporte

Cada reporte incluye:

- **Performance Semanal**: Cambio en valor del portfolio vs semana anterior
- **Valor Total**: Valor actual del portfolio (acciones + efectivo)
- **Top Performers**: Mejores acciones de la semana
- **Underperformers**: Acciones que requieren atención
- **Diseño**: HTML responsive con estilo profesional

## 🔧 Archivos Importantes

```
backend/
├── run_weekly_scheduler.py     # Scheduler principal (mejorado)
├── weekly_report.py           # Lógica de generación de reportes
├── start_weekly_reports.py    # Script original (depreciado)
├── test_complete_system.py    # Test completo del sistema
├── .env.email                # Configuración de email
└── firebase_service_account.json  # Credenciales Firebase

manage_reports.sh              # Script de gestión del sistema
weekly_reports.log            # Logs del sistema
```

## 🐛 Solución de Problemas

### El email no llegó el viernes
1. Verificar que el sistema esté ejecutándose:
   ```bash
   ./manage_reports.sh status
   ```

2. Si no está ejecutándose, iniciarlo:
   ```bash
   ./manage_reports.sh start
   ```

3. Verificar logs para errores:
   ```bash
   ./manage_reports.sh logs
   ```

4. Ejecutar test manual:
   ```bash
   ./manage_reports.sh test
   ```

### Errores comunes
- **Error 421 de Gmail**: Problema temporal del servidor, el sistema reintentará automáticamente
- **Proceso no ejecutándose**: Reiniciar con `./manage_reports.sh start`
- **Error de Firebase**: Verificar credenciales en `firebase_service_account.json`

## 📅 Horarios

- **Reportes Automáticos**: Viernes 18:00 PM
- **Datos**: Compara performance vs viernes anterior
- **Timezone**: Hora local del sistema

## 🔄 Mantenimiento

El sistema se ejecuta de forma autónoma, pero se recomienda:

1. **Verificación semanal**: Usar `./manage_reports.sh status`
2. **Revisar logs**: Usar `./manage_reports.sh logs` 
3. **Test mensual**: Usar `./manage_reports.sh test`

## 💡 Notas Técnicas

- El sistema usa APScheduler para programación automática
- Los datos de precios se obtienen de Yahoo Finance (yfinance)
- Los datos de usuario se almacenan en Firebase/Firestore
- El email se envía usando SMTP de Gmail con autenticación por app password
- El proceso se ejecuta en segundo plano usando nohup

---

**✅ Sistema configurado y funcionando correctamente**
*Último test exitoso: 26 de septiembre de 2025*