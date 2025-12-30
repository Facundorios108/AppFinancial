/**
 * API Configuration
 * Central configuration for backend API endpoints
 */

// Backend API base URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

// API Endpoints
export const API_ENDPOINTS = {
    // Market Data
    QUOTE: (ticker) => `${API_BASE_URL}/api/market/quote/${ticker}`,
    BULK_QUOTES: `${API_BASE_URL}/api/market/quotes`,
    SEARCH_TICKERS: `${API_BASE_URL}/api/market/search`,
    COMPANY_PROFILE: (ticker) => `${API_BASE_URL}/api/market/profile/${ticker}`,
    HISTORICAL_PRICES: (ticker) => `${API_BASE_URL}/api/market/historical/${ticker}`,
    MARKET_STATUS: `${API_BASE_URL}/api/market/status`,
    
    // Legacy
    PRICE: (ticker) => `${API_BASE_URL}/api/price/${ticker}`,
    
    // Health
    HEALTH: `${API_BASE_URL}/api/health`,
};

// Request timeout
export const REQUEST_TIMEOUT = 30000; // 30 seconds (increased for yfinance)

// Auto refresh interval
export const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
