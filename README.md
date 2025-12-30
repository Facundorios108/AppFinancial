# Financial Portfolio App - Setup Guide

## 📋 Prerequisites

- Python 3.9+
- Node.js 16+
- Firebase account with service account JSON
- FMP API key (https://site.financialmodelingprep.com)
- AllTick API token (https://alltick.co) - Optional

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env with your actual API keys
nano .env
```

**Required in `.env`:**
```env
FMP_API_KEY=your_actual_key_here
ALLTICK_API_TOKEN=your_actual_token_here
```

**Firebase Setup:**
1. Download your `firebase_service_account.json` from Firebase Console
2. Place it in the `backend/` directory
3. Ensure it's in `.gitignore` (already configured)

**Start the server:**
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Server will be available at: `http://localhost:8001`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

App will open at: `http://localhost:3000`

## 🔧 Configuration

### API Endpoints
- Backend API: `http://localhost:8001`
- Frontend Dev: `http://localhost:3000`

### Environment Variables

#### Backend (.env)
```env
# Required
FMP_API_KEY=your_key
ALLTICK_API_TOKEN=your_token

# Optional (for email reports)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
```

## 🏗️ Project Structure

```
AppFinancial/
├── backend/
│   ├── main.py                     # FastAPI app
│   ├── firebase_service.py         # Centralized Firebase (NEW)
│   ├── market_data_service.py      # Market data APIs
│   ├── weekly_report.py            # Email reports
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # Environment variables (gitignored)
│   └── .env.example                # Template
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ErrorBoundary.js   # Error handling (NEW)
│   │   │   └── ...
│   │   ├── utils/
│   │   │   ├── logger.js          # Conditional logging (NEW)
│   │   │   └── ...
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json               # Proxy configured to :8001
│   └── ...
│
├── .gitignore                     # Protects sensitive files
└── OPTIMIZATIONS.md               # Changelog

```

## ✨ Recent Optimizations (Nov 2025)

### Security ✅
- API keys moved to environment variables
- Created `.gitignore` for sensitive files
- Firebase service account protected

### Performance ✅
- Conditional logging (dev only)
- Centralized Firebase service (singleton)
- Removed duplicate code
- Fixed OpenSSL warnings

### Code Quality ✅
- Error boundary for React
- TypeScript-ready structure
- Modular services
- Clean dependencies

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:8001/api/health
```

### Market Data Test
```bash
curl http://localhost:8001/api/market/quote/AAPL
```

### Check API Status
```bash
curl http://localhost:8001/api/market/status
```

## 📊 Features

- 📈 Real-time stock portfolio tracking
- 💰 P&L calculation with XIRR
- 📧 Weekly email reports
- 🔍 Stock search and autocomplete
- 📉 Historical charts
- 🎯 Realized gains tracking
- 👁️ Watchlist management

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8001
lsof -ti:8001 | xargs kill -9

# Or use a different port
uvicorn main:app --port 8002 --reload
```

### Firebase Errors
- Ensure `firebase_service_account.json` exists in `backend/`
- Check Firebase project ID matches your setup
- Verify Firestore is enabled

### API Rate Limits
- FMP Free tier: 250 requests/day
- Consider upgrading for production use
- Implement caching if needed

### Console Logs Not Showing
- Check `NODE_ENV` - logs only show in development
- Use `logger.log()` instead of `console.log()`
- Force development mode: `NODE_ENV=development npm start`

## 🔐 Security Best Practices

1. **Never commit**:
   - `.env` files
   - `firebase_service_account.json`
   - API keys or tokens

2. **Use environment variables** for all secrets

3. **Enable 2FA** on Firebase and API accounts

4. **Rotate keys** periodically

## 📝 Development Workflow

1. Make changes to code
2. Server auto-reloads (backend: uvicorn, frontend: React)
3. Test changes locally
4. Check console for errors (development mode only)
5. Build for production: `npm run build`

## 🚢 Production Deployment

### Backend
```bash
# Install production dependencies
pip install -r requirements.txt

# Run with production server
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

### Frontend
```bash
# Build optimized production bundle
npm run build

# Serve build folder with any static server
# e.g., nginx, Apache, or `serve -s build`
```

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [FMP API Docs](https://site.financialmodelingprep.com/developer/docs)

## 🤝 Support

For issues or questions:
1. Check `OPTIMIZATIONS.md` for recent changes
2. Review error logs in console (dev mode)
3. Verify all environment variables are set
4. Check API quotas and limits

---

**Last Updated:** November 29, 2025  
**Version:** 2.0 (Optimized)
