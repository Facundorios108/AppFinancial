from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import yfinance as yf

# Import weekly report functions
from weekly_report import (
    get_all_users, get_user_positions, get_available_cash, 
    get_last_friday, get_portfolio_value, get_portfolio_performance, 
    generate_report, send_weekly_report
)
from datetime import timedelta, datetime

# Import market data service
from market_data_service import market_data_service

app = FastAPI()

# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    await market_data_service.close()

# CORS (Cross-Origin Resource Sharing) middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/api/price/{ticker}")
def get_stock_price(ticker: str):
    """
    Get the current price of a stock using its ticker.
    """
    try:
        stock = yf.Ticker(ticker)
        # Use 'regularMarketPrice' for real-time data, or 'currentPrice' as a fallback
        price = stock.info.get('regularMarketPrice', stock.info.get('currentPrice'))
        if price:
            return {"ticker": ticker, "price": price}
        else:
            # If no price is found, try fetching historical data for the last day
            hist = stock.history(period="1d")
            if not hist.empty:
                return {"ticker": ticker, "price": hist['Close'][0]}
            else:
                return {"error": "Price not found"}
    except Exception as e:
        return {"error": str(e)}


# ==================== Market Data API Endpoints (Proxy) ====================

@app.get("/api/market/quote/{ticker}")
async def get_quote(ticker: str):
    """
    Get real-time quote for a single ticker.
    Uses FMP API with AllTick as fallback.
    """
    try:
        quote = await market_data_service.get_quote(ticker.upper())
        if quote:
            return {"success": True, "data": quote}
        else:
            raise HTTPException(status_code=404, detail=f"Quote not found for {ticker}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/market/quotes")
async def get_bulk_quotes(tickers: List[str]):
    """
    Get real-time quotes for multiple tickers.
    Uses FMP API with AllTick as fallback.
    Request body: ["AAPL", "MSFT", "GOOGL"]
    """
    try:
        if not tickers or len(tickers) == 0:
            return {"success": True, "data": []}
        
        # Clean and uppercase tickers
        clean_tickers = [t.upper().strip() for t in tickers if t and t.strip()]
        
        quotes = await market_data_service.get_bulk_quotes(clean_tickers)
        return {"success": True, "data": quotes, "count": len(quotes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/search")
async def search_tickers(query: str):
    """
    Search for tickers by symbol or company name using Finnhub API.
    Example: /api/market/search?query=apple
    """
    try:
        if not query or len(query.strip()) < 1:
            return {"success": True, "data": []}
        
        # Use Finnhub search API
        results = await market_data_service.finnhub_search_symbols(query)
        
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/profile/{ticker}")
async def get_company_profile(ticker: str):
    """
    Get company profile information from Finnhub.
    Returns company logo, name, and other profile data.
    """
    try:
        profile = await market_data_service.finnhub_get_company_profile(ticker)
        
        if profile:
            return {
                "success": True,
                "data": profile
            }
        else:
            # Return minimal data if Finnhub doesn't have the profile
            return {
                "success": True,
                "data": {
                    "symbol": ticker.upper(),
                    "name": ticker.upper(),
                    "logo": None
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/market/profiles")
async def get_bulk_company_profiles(tickers: List[str]):
    """
    Get company profiles (including logos) for multiple tickers from Finnhub.
    Request body: ["AAPL", "MSFT", "GOOGL"]
    """
    try:
        if not tickers:
            raise HTTPException(status_code=400, detail="No tickers provided")
        
        # Clean and uppercase tickers
        clean_tickers = [t.upper().strip() for t in tickers if t and t.strip()]
        
        profiles = await market_data_service.finnhub_get_bulk_company_profiles(clean_tickers)
        
        return {
            "success": True,
            "data": profiles,
            "count": len(profiles),
            "source": "Finnhub"
        }
            
    except Exception as e:
        print(f"Error in bulk profiles endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/historical/{ticker}")
async def get_historical_prices(ticker: str, from_date: str, to_date: str):
    """
    Get historical prices for a ticker.
    Uses yfinance instead of FMP.
    Example: /api/market/historical/AAPL?from_date=2024-01-01&to_date=2024-12-31
    """
    try:
        # Use yfinance for historical data
        import yfinance as yf
        from datetime import datetime
        
        stock = yf.Ticker(ticker.upper())
        hist = stock.history(start=from_date, end=to_date)
        
        prices = []
        for date, row in hist.iterrows():
            prices.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })
        
        return {"success": True, "data": prices, "count": len(prices)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/status")
async def get_market_api_status():
    """
    Check the status of market data APIs.
    """
    try:
        # Test Finnhub
        finnhub_quote = await market_data_service.finnhub_get_quote("AAPL")
        finnhub_status = "ok" if finnhub_quote else "error"
        
        # Test yfinance
        yf_quote = await market_data_service.yfinance_get_quote("AAPL")
        yf_status = "ok" if yf_quote else "error"
        
        return {
            "success": True,
            "services": {
                "finnhub": {
                    "status": finnhub_status,
                    "configured": True
                },
                "yfinance": {
                    "status": yf_status,
                    "configured": True
                },
                "fmp": {
                    "status": "disabled",
                    "configured": False,
                    "reason": "Legacy endpoint no longer supported"
                },
                "alltick": {
                    "status": "disabled",
                    "configured": False,
                    "reason": "DNS error"
                }
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@app.post("/api/market/cache/clear")
async def clear_market_cache(ticker: Optional[str] = None):
    """
    Clear the market data cache.
    If ticker is provided, clears only that ticker's cache.
    Otherwise, clears all cache.
    """
    try:
        market_data_service.clear_cache(ticker)
        return {
            "success": True,
            "message": f"Cache cleared for {ticker}" if ticker else "All cache cleared",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/send-weekly-report")
def send_weekly_report_manual():
    """
    Manually trigger weekly report sending to all users.
    This endpoint can be called from Postman for testing.
    """
    try:
        users = get_all_users()
        if not users:
            return {"error": "No users found in Firestore", "status": "failed"}
        
        reports_sent = 0
        errors = []
        
        for user in users:
            try:
                print(f"Processing report for user: {user['email']}")
                
                # Calculate dates
                date_now = get_last_friday()
                date_last_week = date_now - timedelta(days=7)
                
                # Get user portfolio data
                positions = get_user_positions(user['uid'])
                cash_now = get_available_cash(user['uid'])
                
                # Calculate portfolio values
                value_now = get_portfolio_value(positions, cash_now, date_now)
                value_last_week = get_portfolio_value(positions, cash_now, date_last_week)
                
                # Get performance data
                best_assets, worst_assets = get_portfolio_performance(positions, date_now, date_last_week)
                
                # Generate and send report
                report_html = generate_report(user, value_now, value_last_week, best_assets, worst_assets)
                send_weekly_report(user['email'], report_html)
                
                reports_sent += 1
                print(f"Report sent successfully to: {user['email']}")
                
            except Exception as user_error:
                error_msg = f"Failed to send report to {user['email']}: {str(user_error)}"
                errors.append(error_msg)
                print(error_msg)
        
        return {
            "status": "completed",
            "reports_sent": reports_sent,
            "total_users": len(users),
            "errors": errors
        }
        
    except Exception as e:
        return {"error": str(e), "status": "failed"}


@app.post("/api/send-test-report/{user_email}")
def send_test_report_to_user(user_email: str):
    """
    Send a test weekly report to a specific user email.
    Useful for testing individual user reports.
    """
    try:
        users = get_all_users()
        user = None
        
        # Find user by email
        for u in users:
            if u['email'].lower() == user_email.lower():
                user = u
                break
        
        if not user:
            return {"error": f"User with email {user_email} not found", "status": "failed"}
        
        print(f"Sending test report to: {user['email']}")
        
        # Calculate dates
        date_now = get_last_friday()
        date_last_week = date_now - timedelta(days=7)
        
        # Get user portfolio data
        positions = get_user_positions(user['uid'])
        cash_now = get_available_cash(user['uid'])
        
        # Calculate portfolio values
        value_now = get_portfolio_value(positions, cash_now, date_now)
        value_last_week = get_portfolio_value(positions, cash_now, date_last_week)
        
        # Get performance data
        best_assets, worst_assets = get_portfolio_performance(positions, date_now, date_last_week)
        
        # Generate and send report
        report_html = generate_report(user, value_now, value_last_week, best_assets, worst_assets)
        send_weekly_report(user['email'], report_html)
        
        return {
            "status": "success",
            "message": f"Test report sent successfully to {user_email}",
            "user": user['name'],
            "portfolio_value_now": value_now,
            "portfolio_value_last_week": value_last_week
        }
        
    except Exception as e:
        return {"error": str(e), "status": "failed"}


@app.get("/api/health")
def health_check():
    """
    Complete system health check.
    Tests database, email config, and basic functionality.
    """
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {}
        }
        
        # Test Firestore connection
        try:
            users = get_all_users()
            health_status["services"]["firestore"] = {
                "status": "ok",
                "users_count": len(users)
            }
        except Exception as e:
            health_status["services"]["firestore"] = {
                "status": "error", 
                "error": str(e)
            }
            health_status["status"] = "degraded"
        
        # Test yfinance
        try:
            import yfinance as yf
            test_stock = yf.Ticker("AAPL")
            test_price = test_stock.info.get('regularMarketPrice', 0)
            health_status["services"]["yfinance"] = {
                "status": "ok",
                "test_price": test_price
            }
        except Exception as e:
            health_status["services"]["yfinance"] = {
                "status": "error",
                "error": str(e)
            }
            health_status["status"] = "degraded"
        
        # Test email config (without sending)
        try:
            import os
            smtp_configured = bool(os.getenv('EMAIL_USER') and os.getenv('EMAIL_PASSWORD'))
            health_status["services"]["email"] = {
                "status": "configured" if smtp_configured else "not_configured",
                "smtp_user": os.getenv('EMAIL_USER', 'not_set')
            }
        except Exception as e:
            health_status["services"]["email"] = {
                "status": "error",
                "error": str(e)
            }
        
        return health_status
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@app.get("/api/users")
def get_users_info():
    """
    Get information about all users in the system.
    Shows user count, emails, and basic portfolio info.
    """
    try:
        users = get_all_users()
        users_info = []
        
        for user in users:
            try:
                positions = get_user_positions(user['uid'])
                cash = get_available_cash(user['uid'])
                
                user_info = {
                    "uid": user['uid'],
                    "name": user['name'],
                    "email": user['email'],
                    "positions_count": len(positions),
                    "cash_available": cash,
                    "has_positions": len(positions) > 0
                }
                users_info.append(user_info)
                
            except Exception as user_error:
                users_info.append({
                    "uid": user['uid'],
                    "name": user['name'],
                    "email": user['email'],
                    "error": f"Could not load portfolio: {str(user_error)}"
                })
        
        return {
            "total_users": len(users),
            "users": users_info
        }
        
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/portfolio/{user_email}")
def get_user_portfolio(user_email: str):
    """
    Get detailed portfolio information for a specific user.
    Shows positions, values, and performance.
    """
    try:
        users = get_all_users()
        user = None
        
        # Find user by email
        for u in users:
            if u['email'].lower() == user_email.lower():
                user = u
                break
        
        if not user:
            return {"error": f"User with email {user_email} not found"}
        
        # Get portfolio data
        positions = get_user_positions(user['uid'])
        cash_now = get_available_cash(user['uid'])
        
        # Calculate values
        date_now = get_last_friday()
        date_last_week = date_now - timedelta(days=7)
        value_now = get_portfolio_value(positions, cash_now, date_now)
        value_last_week = get_portfolio_value(positions, cash_now, date_last_week)
        
        # Get performance
        best_assets, worst_assets = get_portfolio_performance(positions, date_now, date_last_week)
        
        return {
            "user": {
                "name": user['name'],
                "email": user['email'],
                "uid": user['uid']
            },
            "portfolio": {
                "cash_available": cash_now,
                "total_value_now": value_now,
                "total_value_last_week": value_last_week,
                "change": value_now - value_last_week,
                "change_percent": ((value_now - value_last_week) / value_last_week * 100) if value_last_week > 0 else 0,
                "positions_count": len(positions),
                "positions": positions
            },
            "performance": {
                "best_assets": best_assets,
                "worst_assets": worst_assets
            },
            "dates": {
                "report_date": date_now.isoformat(),
                "comparison_date": date_last_week.isoformat()
            }
        }
        
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/test-email")
def test_email_configuration():
    """
    Test email configuration by sending a simple test email.
    Verifies SMTP settings without sending full reports.
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        import os
        from dotenv import load_dotenv
        
        # Load email config
        load_dotenv(os.path.join(os.path.dirname(__file__), '.env.email'))
        
        email_user = os.getenv('EMAIL_USER')
        email_password = os.getenv('EMAIL_PASSWORD')
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        
        if not email_user or not email_password:
            return {
                "status": "failed",
                "error": "Email credentials not configured in .env.email"
            }
        
        # Create test message
        msg = MIMEMultipart()
        msg['From'] = email_user
        msg['To'] = email_user  # Send to self
        msg['Subject'] = "Portfolio App - Email Test"
        
        body = """
        <html>
        <body>
            <h2>🧪 Email Configuration Test</h2>
            <p>This is a test email to verify SMTP configuration.</p>
            <p>If you receive this, your email system is working correctly!</p>
            <p>Time: {}</p>
        </body>
        </html>
        """.format(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(email_user, email_password)
        server.send_message(msg)
        server.quit()
        
        return {
            "status": "success",
            "message": f"Test email sent successfully to {email_user}",
            "smtp_server": smtp_server,
            "smtp_port": smtp_port
        }
        
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }
