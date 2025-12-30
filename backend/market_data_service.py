"""
Market Data Service - Proxy for external market data APIs
Handles requests to FMP, AllTick, and Yahoo Finance APIs
"""

import httpx
import asyncio
from typing import List, Dict, Optional, Any
from datetime import datetime
import os
from dotenv import load_dotenv
import yfinance as yf

# Load environment variables from .env file in the same directory as this script
_current_dir = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.join(_current_dir, '.env')
load_dotenv(_env_path)

# API Configuration from environment variables
FMP_API_KEY = os.getenv("FMP_API_KEY")
FMP_BASE_URL = "https://financialmodelingprep.com/api/v3"

ALLTICK_API_TOKEN = os.getenv("ALLTICK_API_TOKEN")
ALLTICK_QUOTE_URL = "https://quote-api.alltick.co/quote"
ALLTICK_HISTORY_URL = "https://quote-api.alltick.co/history"

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

# Validate API keys
if not FMP_API_KEY:
    print("⚠️  WARNING: FMP_API_KEY not found in environment variables")
if not ALLTICK_API_TOKEN:
    print("⚠️  WARNING: ALLTICK_API_TOKEN not found in environment variables")
if not FINNHUB_API_KEY:
    print("⚠️  WARNING: FINNHUB_API_KEY not found in environment variables")
else:
    print("✅ Finnhub API key loaded successfully")


class MarketDataService:
    def __init__(self):
        self.client = None
        self.rate_limit_delay = 0.1  # 100ms between requests (reduced for faster responses)
        self.last_request_time = {}
        self.use_yfinance_only = False  # Try Finnhub first, then yfinance
        self.use_finnhub_first = True  # Prefer Finnhub over yfinance
        
        # Cache system - stores quotes with timestamps
        self.quote_cache = {}  # {ticker: {"data": quote_data, "timestamp": datetime}}
        self.cache_duration = 300  # 5 minutes in seconds (300s)
        
    async def get_client(self):
        """Get or create HTTP client"""
        if self.client is None:
            self.client = httpx.AsyncClient(timeout=10.0)
        return self.client
    
    async def close(self):
        """Close HTTP client"""
        if self.client:
            await self.client.aclose()
            self.client = None
    
    async def _rate_limit(self, service: str):
        """Implement rate limiting per service"""
        now = datetime.now().timestamp()
        last_time = self.last_request_time.get(service, 0)
        
        time_since_last = now - last_time
        if time_since_last < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - time_since_last)
        
        self.last_request_time[service] = datetime.now().timestamp()
    
    def _get_cached_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get quote from cache if it exists and is not expired"""
        ticker = ticker.upper()
        if ticker in self.quote_cache:
            cached = self.quote_cache[ticker]
            age = datetime.now().timestamp() - cached["timestamp"]
            
            if age < self.cache_duration:
                # Cache is still valid
                print(f"✅ Cache hit for {ticker} (age: {age:.1f}s)")
                return cached["data"]
            else:
                # Cache expired
                print(f"⏰ Cache expired for {ticker} (age: {age:.1f}s)")
                del self.quote_cache[ticker]
        
        return None
    
    def _set_cached_quote(self, ticker: str, quote: Dict[str, Any]):
        """Store quote in cache with current timestamp"""
        ticker = ticker.upper()
        self.quote_cache[ticker] = {
            "data": quote,
            "timestamp": datetime.now().timestamp()
        }
        print(f"💾 Cached quote for {ticker}")
    
    def clear_cache(self, ticker: Optional[str] = None):
        """Clear cache for specific ticker or all tickers"""
        if ticker:
            ticker = ticker.upper()
            if ticker in self.quote_cache:
                del self.quote_cache[ticker]
                print(f"🗑️  Cleared cache for {ticker}")
        else:
            self.quote_cache.clear()
            print("🗑️  Cleared all cache")
    
    # ==================== FMP API Methods ====================
    
    async def fmp_get_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get quote from FMP API"""
        try:
            await self._rate_limit('fmp')
            client = await self.get_client()
            
            url = f"{FMP_BASE_URL}/quote/{ticker}"
            params = {"apikey": FMP_API_KEY}
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data and len(data) > 0:
                return self._format_fmp_quote(data[0])
            return None
            
        except Exception as e:
            print(f"Error fetching FMP quote for {ticker}: {str(e)}")
            return None
    
    async def fmp_get_bulk_quotes(self, tickers: List[str]) -> List[Dict[str, Any]]:
        """Get multiple quotes from FMP API"""
        try:
            await self._rate_limit('fmp')
            client = await self.get_client()
            
            # FMP allows up to 50 tickers at once
            ticker_str = ','.join(tickers[:50])
            url = f"{FMP_BASE_URL}/quote/{ticker_str}"
            params = {"apikey": FMP_API_KEY}
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data and isinstance(data, list):
                return [self._format_fmp_quote(quote) for quote in data if quote.get('price', 0) > 0]
            return []
            
        except Exception as e:
            print(f"Error fetching FMP bulk quotes: {str(e)}")
            return []
    
    async def fmp_search_tickers(self, query: str) -> List[Dict[str, Any]]:
        """Search for tickers using FMP API"""
        try:
            if not query or len(query) < 1:
                return []
            
            await self._rate_limit('fmp')
            client = await self.get_client()
            
            url = f"{FMP_BASE_URL}/search"
            params = {
                "query": query.strip(),
                "limit": 10,
                "apikey": FMP_API_KEY
            }
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data and isinstance(data, list):
                return [{
                    "symbol": item.get("symbol"),
                    "name": item.get("name"),
                    "exchangeShortName": item.get("exchangeShortName", ""),
                    "type": item.get("type", "stock")
                } for item in data[:10]]
            return []
            
        except Exception as e:
            print(f"Error searching tickers: {str(e)}")
            return []
    
    async def fmp_get_company_profile(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get company profile from FMP API"""
        try:
            await self._rate_limit('fmp')
            client = await self.get_client()
            
            url = f"{FMP_BASE_URL}/profile/{ticker}"
            params = {"apikey": FMP_API_KEY}
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data and len(data) > 0:
                return data[0]
            return None
            
        except Exception as e:
            print(f"Error fetching company profile for {ticker}: {str(e)}")
            return None
    
    async def fmp_get_historical_prices(self, ticker: str, from_date: str, to_date: str) -> List[Dict[str, Any]]:
        """Get historical prices from FMP API"""
        try:
            await self._rate_limit('fmp')
            client = await self.get_client()
            
            url = f"{FMP_BASE_URL}/historical-price-full/{ticker}"
            params = {
                "from": from_date,
                "to": to_date,
                "apikey": FMP_API_KEY
            }
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data and "historical" in data:
                return data["historical"]
            return []
            
        except Exception as e:
            print(f"Error fetching historical data for {ticker}: {str(e)}")
            return []
    
    def _format_fmp_quote(self, raw_quote: Dict) -> Dict[str, Any]:
        """Format FMP quote data"""
        return {
            "ticker": raw_quote.get("symbol"),
            "symbol": raw_quote.get("symbol"),
            "lastPrice": float(raw_quote.get("price", 0)),
            "open": float(raw_quote.get("open", 0)),
            "high": float(raw_quote.get("dayHigh", 0)),
            "low": float(raw_quote.get("dayLow", 0)),
            "volume": int(raw_quote.get("volume", 0)),
            "change": float(raw_quote.get("change", 0)),
            "changePercent": float(raw_quote.get("changesPercentage", 0)),
            "previousClose": float(raw_quote.get("previousClose", 0)),
            "marketCap": float(raw_quote.get("marketCap", 0)),
            "peRatio": float(raw_quote.get("pe", 0)),
            "eps": float(raw_quote.get("eps", 0)),
            "yearHigh": float(raw_quote.get("yearHigh", 0)),
            "yearLow": float(raw_quote.get("yearLow", 0)),
            "timestamp": raw_quote.get("timestamp", int(datetime.now().timestamp())),
            "lastUpdate": datetime.now().isoformat(),
            "source": "FMP"
        }
    
    # ==================== AllTick API Methods ====================
    
    async def alltick_get_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get quote from AllTick API"""
        try:
            await self._rate_limit('alltick')
            client = await self.get_client()
            
            symbol = f"{ticker.upper()}.US"
            headers = {
                "Content-Type": "application/json",
                "token": ALLTICK_API_TOKEN
            }
            
            payload = {
                "trace": f"quote_{ticker}_{int(datetime.now().timestamp())}",
                "data": {
                    "symbol_list": [symbol],
                    "field_list": [
                        "last_price", "open", "high", "low", "volume",
                        "change", "change_ratio", "timestamp", "prev_close",
                        "market_cap", "pe_ratio"
                    ]
                }
            }
            
            response = await client.post(ALLTICK_QUOTE_URL, json=payload, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            if data.get("code") == 0 and data.get("data") and len(data["data"]) > 0:
                return self._format_alltick_quote(data["data"][0])
            return None
            
        except Exception as e:
            print(f"Error fetching AllTick quote for {ticker}: {str(e)}")
            return None
    
    async def alltick_get_bulk_quotes(self, tickers: List[str]) -> List[Dict[str, Any]]:
        """Get multiple quotes from AllTick API"""
        try:
            await self._rate_limit('alltick')
            client = await self.get_client()
            
            symbol_list = [f"{ticker.upper()}.US" for ticker in tickers]
            headers = {
                "Content-Type": "application/json",
                "token": ALLTICK_API_TOKEN
            }
            
            payload = {
                "trace": f"bulk_quote_{int(datetime.now().timestamp())}",
                "data": {
                    "symbol_list": symbol_list,
                    "field_list": [
                        "last_price", "open", "high", "low", "volume",
                        "change", "change_ratio", "timestamp", "prev_close",
                        "market_cap", "pe_ratio"
                    ]
                }
            }
            
            response = await client.post(ALLTICK_QUOTE_URL, json=payload, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            if data.get("code") == 0 and data.get("data"):
                return [self._format_alltick_quote(quote) for quote in data["data"]]
            return []
            
        except Exception as e:
            print(f"Error fetching AllTick bulk quotes: {str(e)}")
            return []
    
    def _format_alltick_quote(self, raw_quote: Dict) -> Dict[str, Any]:
        """Format AllTick quote data"""
        ticker = raw_quote.get("symbol", "").replace(".US", "")
        return {
            "ticker": ticker,
            "symbol": raw_quote.get("symbol"),
            "lastPrice": float(raw_quote.get("last_price", 0)),
            "open": float(raw_quote.get("open", 0)),
            "high": float(raw_quote.get("high", 0)),
            "low": float(raw_quote.get("low", 0)),
            "volume": int(raw_quote.get("volume", 0)),
            "change": float(raw_quote.get("change", 0)),
            "changePercent": float(raw_quote.get("change_ratio", 0)),
            "previousClose": float(raw_quote.get("prev_close", 0)),
            "marketCap": float(raw_quote.get("market_cap", 0)),
            "peRatio": float(raw_quote.get("pe_ratio", 0)),
            "timestamp": raw_quote.get("timestamp", int(datetime.now().timestamp())),
            "lastUpdate": datetime.now().isoformat(),
            "source": "AllTick"
        }
    
    # ==================== Yahoo Finance Methods ====================
    
    async def yfinance_get_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get quote from Yahoo Finance using yfinance"""
        try:
            # Run yfinance in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            
            # Use fast=True to get only basic info faster
            def get_info():
                stock = yf.Ticker(ticker.upper())
                return stock.fast_info if hasattr(stock, 'fast_info') else stock.info
            
            info = await loop.run_in_executor(None, get_info)
            
            # Handle fast_info vs regular info
            if hasattr(info, 'last_price'):
                # fast_info object
                return {
                    "ticker": ticker.upper(),
                    "symbol": ticker.upper(),
                    "lastPrice": float(info.last_price or 0),
                    "open": float(getattr(info, 'open', 0) or 0),
                    "high": float(getattr(info, 'day_high', 0) or 0),
                    "low": float(getattr(info, 'day_low', 0) or 0),
                    "volume": int(getattr(info, 'last_volume', 0) or 0),
                    "change": 0,
                    "changePercent": 0,
                    "previousClose": float(getattr(info, 'previous_close', 0) or 0),
                    "marketCap": float(getattr(info, 'market_cap', 0) or 0),
                    "peRatio": 0,
                    "eps": 0,
                    "yearHigh": float(getattr(info, 'year_high', 0) or 0),
                    "yearLow": float(getattr(info, 'year_low', 0) or 0),
                    "timestamp": int(datetime.now().timestamp()),
                    "lastUpdate": datetime.now().isoformat(),
                    "source": "Yahoo Finance"
                }
            elif isinstance(info, dict) and info.get('regularMarketPrice'):
                # regular info dict
                return self._format_yfinance_quote(ticker, info)
            
            return None
            
        except Exception as e:
            print(f"Error fetching yfinance quote for {ticker}: {str(e)}")
            return None
    
    async def yfinance_get_bulk_quotes(self, tickers: List[str]) -> List[Dict[str, Any]]:
        """Get multiple quotes from Yahoo Finance - parallel execution"""
        try:
            # Execute all requests in parallel
            tasks = [self.yfinance_get_quote(ticker) for ticker in tickers]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out None and exceptions
            quotes = []
            for result in results:
                if result and not isinstance(result, Exception) and result.get("lastPrice", 0) > 0:
                    quotes.append(result)
            
            return quotes
            
        except Exception as e:
            print(f"Error fetching yfinance bulk quotes: {str(e)}")
            return []
    
    def _format_yfinance_quote(self, ticker: str, info: Dict) -> Dict[str, Any]:
        """Format yfinance quote data"""
        current_price = info.get('regularMarketPrice', info.get('currentPrice', 0))
        previous_close = info.get('regularMarketPreviousClose', info.get('previousClose', 0))
        
        change = current_price - previous_close if previous_close else 0
        change_percent = (change / previous_close * 100) if previous_close else 0
        
        return {
            "ticker": ticker.upper(),
            "symbol": ticker.upper(),
            "lastPrice": float(current_price),
            "open": float(info.get('regularMarketOpen', info.get('open', 0))),
            "high": float(info.get('regularMarketDayHigh', info.get('dayHigh', 0))),
            "low": float(info.get('regularMarketDayLow', info.get('dayLow', 0))),
            "volume": int(info.get('regularMarketVolume', info.get('volume', 0))),
            "change": float(change),
            "changePercent": float(change_percent),
            "previousClose": float(previous_close),
            "marketCap": float(info.get('marketCap', 0)),
            "peRatio": float(info.get('trailingPE', 0)),
            "eps": float(info.get('trailingEps', 0)),
            "yearHigh": float(info.get('fiftyTwoWeekHigh', 0)),
            "yearLow": float(info.get('fiftyTwoWeekLow', 0)),
            "timestamp": int(datetime.now().timestamp()),
            "lastUpdate": datetime.now().isoformat(),
            "source": "Yahoo Finance"
        }
    
    # ==================== Finnhub API Methods ====================
    
    async def finnhub_get_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get quote from Finnhub API"""
        try:
            await self._rate_limit('finnhub')
            client = await self.get_client()
            
            url = f"{FINNHUB_BASE_URL}/quote"
            params = {
                "symbol": ticker.upper(),
                "token": FINNHUB_API_KEY
            }
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data and data.get('c'):  # 'c' is current price
                return self._format_finnhub_quote(ticker, data)
            return None
            
        except Exception as e:
            print(f"Error fetching Finnhub quote for {ticker}: {str(e)}")
            return None
    
    async def finnhub_get_bulk_quotes(self, tickers: List[str]) -> List[Dict[str, Any]]:
        """Get multiple quotes from Finnhub - parallel execution"""
        try:
            # Execute all requests in parallel
            tasks = [self.finnhub_get_quote(ticker) for ticker in tickers]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out None and exceptions
            quotes = []
            for result in results:
                if result and not isinstance(result, Exception) and result.get("lastPrice", 0) > 0:
                    quotes.append(result)
            
            return quotes
            
        except Exception as e:
            print(f"Error fetching Finnhub bulk quotes: {str(e)}")
            return []
    
    def _format_finnhub_quote(self, ticker: str, data: Dict) -> Dict[str, Any]:
        """Format Finnhub quote data"""
        current_price = data.get('c', 0)  # Current price
        previous_close = data.get('pc', 0)  # Previous close
        
        change = current_price - previous_close if previous_close else 0
        change_percent = (change / previous_close * 100) if previous_close else 0
        
        return {
            "ticker": ticker.upper(),
            "symbol": ticker.upper(),
            "lastPrice": float(current_price),
            "open": float(data.get('o', 0)),  # Open price
            "high": float(data.get('h', 0)),  # High price
            "low": float(data.get('l', 0)),   # Low price
            "volume": 0,  # Finnhub quote doesn't include volume
            "change": float(change),
            "changePercent": float(change_percent),
            "previousClose": float(previous_close),
            "marketCap": 0,
            "peRatio": 0,
            "eps": 0,
            "yearHigh": 0,
            "yearLow": 0,
            "timestamp": int(data.get('t', datetime.now().timestamp())),  # Unix timestamp
            "lastUpdate": datetime.now().isoformat(),
            "source": "Finnhub"
        }
    
    async def finnhub_get_company_profile(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get company profile (including logo) from Finnhub API"""
        try:
            await self._rate_limit('finnhub')
            client = await self.get_client()
            
            url = f"{FINNHUB_BASE_URL}/stock/profile2"
            params = {
                "symbol": ticker.upper(),
                "token": FINNHUB_API_KEY
            }
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data and data.get('logo'):
                return {
                    "symbol": ticker.upper(),
                    "name": data.get('name', ''),
                    "logo": data.get('logo', ''),
                    "country": data.get('country', ''),
                    "currency": data.get('currency', ''),
                    "exchange": data.get('exchange', ''),
                    "ipo": data.get('ipo', ''),
                    "marketCapitalization": data.get('marketCapitalization', 0),
                    "shareOutstanding": data.get('shareOutstanding', 0),
                    "weburl": data.get('weburl', ''),
                    "finnhubIndustry": data.get('finnhubIndustry', ''),
                    "source": "Finnhub"
                }
            return None
            
        except Exception as e:
            print(f"Error fetching Finnhub company profile for {ticker}: {str(e)}")
            return None
    
    async def finnhub_get_bulk_company_profiles(self, tickers: List[str]) -> List[Dict[str, Any]]:
        """Get multiple company profiles from Finnhub - parallel execution"""
        try:
            # Execute all requests in parallel
            tasks = [self.finnhub_get_company_profile(ticker) for ticker in tickers]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out None and exceptions
            profiles = []
            for result in results:
                if result and not isinstance(result, Exception) and result.get("logo"):
                    profiles.append(result)
            
            return profiles
            
        except Exception as e:
            print(f"Error fetching Finnhub bulk company profiles: {str(e)}")
            return []
    
    async def finnhub_search_symbols(self, query: str) -> List[Dict[str, Any]]:
        """Search for stock symbols using Finnhub API"""
        try:
            if not query or len(query.strip()) < 1:
                return []
            
            await self._rate_limit('finnhub')
            client = await self.get_client()
            
            url = f"{FINNHUB_BASE_URL}/search"
            params = {
                "q": query.strip(),
                "token": FINNHUB_API_KEY
            }
            
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data and data.get('result'):
                # Filter to only US stocks (NASDAQ, NYSE, etc.) and limit results
                us_stocks = []
                for item in data['result']:
                    symbol = item.get('symbol', '')
                    display_symbol = item.get('displaySymbol', symbol)
                    
                    # Only include US stocks:
                    # - Must not have extensions like .TO, .L, .SS, .AX, .JK, etc.
                    # - Allow special cases like BRK.B (single letter after dot)
                    # - Must be Common Stock type (exclude ETPs from foreign exchanges)
                    has_foreign_extension = any(ext in symbol for ext in [
                        '.TO', '.L', '.SS', '.MC', '.AS', '.NE', '.HK', '.T', 
                        '.AX', '.JK', '.KL', '.PA', '.DE', '.MI', '.SW', '.V',
                        'ZF'  # For symbols ending in ZF (foreign)
                    ])
                    
                    # Check if it's a valid US symbol
                    is_valid_us = (
                        symbol and 
                        not has_foreign_extension and
                        (symbol == display_symbol or symbol + '.B' == display_symbol) and  # Allow BRK.B
                        len(symbol) <= 5  # Most US tickers are 1-5 characters
                    )
                    
                    if is_valid_us:
                        us_stocks.append({
                            "symbol": display_symbol,
                            "name": item.get('description', ''),
                            "type": item.get('type', ''),
                            "exchangeShortName": "US" # Simplified for US stocks
                        })
                
                # Limit to 15 results
                return us_stocks[:15]
            return []
            
        except Exception as e:
            print(f"Error searching Finnhub symbols for '{query}': {str(e)}")
            return []
    
    # ==================== Unified Methods with Fallback ====================
    
    async def get_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Get quote with fallback logic and caching (Finnhub -> YFinance -> FMP -> AllTick)"""
        # Check cache first
        cached_quote = self._get_cached_quote(ticker)
        if cached_quote:
            return cached_quote
        
        quote = None
        
        # Try Finnhub first if enabled
        if self.use_finnhub_first and FINNHUB_API_KEY:
            quote = await self.finnhub_get_quote(ticker)
            if quote and quote.get("lastPrice", 0) > 0:
                self._set_cached_quote(ticker, quote)
                return quote
        
        # If yfinance-only mode, skip other sources
        if self.use_yfinance_only:
            quote = await self.yfinance_get_quote(ticker)
            if quote and quote.get("lastPrice", 0) > 0:
                self._set_cached_quote(ticker, quote)
            return quote
        
        # Try Yahoo Finance
        quote = await self.yfinance_get_quote(ticker)
        if quote and quote.get("lastPrice", 0) > 0:
            self._set_cached_quote(ticker, quote)
            return quote
        
        # Fallback to FMP
        quote = await self.fmp_get_quote(ticker)
        if quote and quote.get("lastPrice", 0) > 0:
            self._set_cached_quote(ticker, quote)
            return quote
        
        # Final fallback to AllTick
        quote = await self.alltick_get_quote(ticker)
        if quote and quote.get("lastPrice", 0) > 0:
            self._set_cached_quote(ticker, quote)
            return quote
        
        return None
    
    async def get_bulk_quotes(self, tickers: List[str]) -> List[Dict[str, Any]]:
        """Get bulk quotes with fallback logic and caching (Finnhub -> YFinance -> FMP -> AllTick)"""
        # Check cache for each ticker
        results = []
        tickers_to_fetch = []
        
        for ticker in tickers:
            cached = self._get_cached_quote(ticker)
            if cached:
                results.append(cached)
            else:
                tickers_to_fetch.append(ticker)
        
        # If all quotes are cached, return them
        if not tickers_to_fetch:
            print(f"✅ All {len(tickers)} quotes served from cache")
            return results
        
        print(f"🔍 Fetching {len(tickers_to_fetch)} quotes from API (cached: {len(results)})")
        
        quotes = []
        
        # Try Finnhub first if enabled
        if self.use_finnhub_first and FINNHUB_API_KEY:
            quotes = await self.finnhub_get_bulk_quotes(tickers_to_fetch)
            if quotes and len(quotes) > 0:
                # Cache each quote
                for quote in quotes:
                    self._set_cached_quote(quote["ticker"], quote)
                return results + quotes
        
        # If yfinance-only mode, skip other sources
        if self.use_yfinance_only:
            quotes = await self.yfinance_get_bulk_quotes(tickers_to_fetch)
            for quote in quotes:
                self._set_cached_quote(quote["ticker"], quote)
            return results + quotes
        
        # Try Yahoo Finance
        quotes = await self.yfinance_get_bulk_quotes(tickers_to_fetch)
        if quotes and len(quotes) > 0:
            for quote in quotes:
                self._set_cached_quote(quote["ticker"], quote)
            return results + quotes
        
        # Fallback to FMP
        quotes = await self.fmp_get_bulk_quotes(tickers_to_fetch)
        if quotes and len(quotes) > 0:
            for quote in quotes:
                self._set_cached_quote(quote["ticker"], quote)
            return results + quotes
        
        # Final fallback to AllTick
        quotes = await self.alltick_get_bulk_quotes(tickers_to_fetch)
        for quote in quotes:
            self._set_cached_quote(quote["ticker"], quote)
        
        return results + quotes


# Singleton instance
market_data_service = MarketDataService()
