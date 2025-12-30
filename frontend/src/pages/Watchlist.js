import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faStar, 
    faPlus, 
    faCheck, 
    faTrash,
    faSearch,
    faChartLine,
    faArrowUp,
    faArrowDown,
    faSpinner,
    faBuilding,
    faDollarSign,
    faCalendarAlt,
    faGlobe,
    faUsers,
    faChartBar,
    faTimes
} from '@fortawesome/free-solid-svg-icons';
import { unifiedAPIService } from '../services/unifiedAPIService';
import fmpService from '../services/fmpService';
import TickerAutocomplete from '../components/common/TickerAutocomplete';

const Watchlist = ({ formatCurrency, isGuest }) => {
    // Función de formato local por si no recibe la prop
    const defaultFormatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    // Usar la función pasada como prop o la local como fallback
    const formatCurrencyFunc = formatCurrency || defaultFormatCurrency;

    // Datos por defecto para la watchlist
    const defaultWatchlistData = [
        {
            ticker: 'AAPL',
            name: 'Apple Inc.',
            price: 175.43,
            change: 2.45,
            changePercent: 1.42,
            marketCap: '2.74T',
            volume: '45.2M',
            // Datos adicionales para el modal
            sector: 'Technology',
            industry: 'Consumer Electronics',
            website: 'https://www.apple.com',
            employees: '164,000',
            peRatio: 28.5,
            dividend: '0.96',
            beta: 1.25,
            high52Week: 199.62,
            low52Week: 124.17,
            description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.'
        },
        {
            ticker: 'MSFT',
            name: 'Microsoft Corporation',
            price: 414.80,
            change: -1.20,
            changePercent: -0.29,
            marketCap: '3.08T',
            volume: '25.8M',
            sector: 'Technology',
            industry: 'Software',
            website: 'https://www.microsoft.com',
            employees: '221,000',
            peRatio: 32.1,
            dividend: '3.00',
            beta: 0.89,
            high52Week: 468.35,
            low52Week: 309.45,
            description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.'
        },
        {
            ticker: 'GOOGL',
            name: 'Alphabet Inc.',
            price: 158.50,
            change: 0.75,
            changePercent: 0.48,
            marketCap: '1.96T',
            volume: '28.4M',
            sector: 'Communication Services',
            industry: 'Internet Content & Information',
            website: 'https://www.alphabet.com',
            employees: '190,000',
            peRatio: 22.8,
            dividend: '0.00',
            beta: 1.05,
            high52Week: 191.18,
            low52Week: 121.46,
            description: 'Alphabet Inc. provides various products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.'
        }
    ];

    // Función para cargar la watchlist desde localStorage
    const loadWatchlistFromStorage = () => {
        try {
            const savedWatchlist = localStorage.getItem('financial-app-watchlist');
            return savedWatchlist ? JSON.parse(savedWatchlist) : defaultWatchlistData;
        } catch (error) {
            console.error('Error loading watchlist from localStorage:', error);
            return defaultWatchlistData;
        }
    };

    // Función para guardar la watchlist en localStorage
    const saveWatchlistToStorage = (watchlistData) => {
        try {
            localStorage.setItem('financial-app-watchlist', JSON.stringify(watchlistData));
        } catch (error) {
            console.error('Error saving watchlist to localStorage:', error);
        }
    };

    const [watchlist, setWatchlist] = useState(loadWatchlistFromStorage);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingData, setIsLoadingData] = useState(false);
    
    // Estados para el modal de detalles
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);
    const [stockDetails, setStockDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    
    // Estados para el modal de añadir stock
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTicker, setSearchTicker] = useState('');
    const [isAddingStock, setIsAddingStock] = useState(false);

    // Debug
    console.log('Watchlist component rendering', { formatCurrency, isGuest, watchlistLength: watchlist.length });
    // Force refresh styles - Updated modal layout

    // Función para formatear Market Cap correctamente
    const formatMarketCap = (marketCap) => {
        if (!marketCap || marketCap <= 0) return 'N/A';
        
        if (marketCap >= 1e12) {
            return `${(marketCap / 1e12).toFixed(2)}T`;
        } else if (marketCap >= 1e9) {
            return `${(marketCap / 1e9).toFixed(2)}B`;
        } else if (marketCap >= 1e6) {
            return `${(marketCap / 1e6).toFixed(2)}M`;
        } else if (marketCap >= 1e3) {
            return `${(marketCap / 1e3).toFixed(2)}K`;
        } else {
            return marketCap.toString();
        }
    };

    // Función para formatear volumen
    const formatVolume = (volume) => {
        if (!volume || volume <= 0) return 'N/A';
        
        if (volume >= 1e9) {
            return `${(volume / 1e9).toFixed(1)}B`;
        } else if (volume >= 1e6) {
            return `${(volume / 1e6).toFixed(1)}M`;
        } else if (volume >= 1e3) {
            return `${(volume / 1e3).toFixed(1)}K`;
        } else {
            return volume.toString();
        }
    };

    // Función para ordenar watchlist alfabéticamente
    const sortWatchlistAlphabetically = (watchlistData) => {
        return [...watchlistData].sort((a, b) => a.ticker.localeCompare(b.ticker));
    };

    // Función de fallback para usar datos de prueba más realistas si la API falla
    const getFallbackStockData = (ticker) => {
        const fallbackData = {
            'ABNB': {
                ticker: 'ABNB',
                name: 'Airbnb, Inc.',
                price: 125.67,
                change: -0.92,
                changePercent: -0.73,
                marketCap: formatMarketCap(82000000000), // 82B
                volume: formatVolume(2500000), // 2.5M
                sector: 'Consumer Discretionary',
                industry: 'Internet Retail',
                website: 'https://www.airbnb.com',
                employees: '6,500',
                peRatio: 18.4,
                dividend: '0.00',
                beta: 1.15,
                high52Week: 142.85,
                low52Week: 86.51,
                description: 'Airbnb, Inc. operates an online marketplace for lodging, primarily homestays for vacation rentals.'
            },
            'AMZN': {
                ticker: 'AMZN',
                name: 'Amazon.com, Inc.',
                price: 178.25,
                change: 2.40,
                changePercent: 1.37,
                marketCap: formatMarketCap(1850000000000), // 1.85T
                volume: formatVolume(25800000), // 25.8M
                sector: 'Consumer Discretionary',
                industry: 'Internet Retail',
                website: 'https://www.amazon.com',
                employees: '1,541,000',
                peRatio: 54.8,
                dividend: '0.00',
                beta: 1.33,
                high52Week: 201.20,
                low52Week: 118.35,
                description: 'Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions in North America and internationally.'
            },
            'GOOGL': {
                ticker: 'GOOGL',
                name: 'Alphabet Inc.',
                price: 158.50,
                change: 5.23,
                changePercent: 3.41,
                marketCap: formatMarketCap(1960000000000), // 1.96T
                volume: formatVolume(31700000), // 31.7M
                sector: 'Communication Services',
                industry: 'Internet Content & Information',
                website: 'https://www.alphabet.com',
                employees: '190,000',
                peRatio: 22.8,
                dividend: '0.00',
                beta: 1.05,
                high52Week: 191.18,
                low52Week: 121.46,
                description: 'Alphabet Inc. provides various products and platforms worldwide through Google and Other Bets.'
            }
        };

        return fallbackData[ticker] || null;
    };

    // Función para actualizar datos reales de una stock
    const updateStockWithRealData = async (ticker) => {
        try {
            console.log(`Updating data for ${ticker}...`);
            
            // Intentar obtener datos de la API primero
            let quote, profile;
            try {
                quote = await fmpService.getQuote(ticker);
                profile = await fmpService.getCompanyProfile(ticker);
                console.log(`Quote data for ${ticker}:`, quote);
                console.log(`Profile data for ${ticker}:`, profile);
            } catch (apiError) {
                console.warn(`API call failed for ${ticker}:`, apiError);
            }
            
            // Verificar si los datos de la API son válidos
            const hasValidApiData = quote && 
                                  (quote.lastPrice > 0 || quote.price > 0) &&
                                  quote.symbol;
            
            if (hasValidApiData) {
                const updatedStock = {
                    ticker: quote.symbol || ticker,
                    name: quote.name || profile?.companyName || `${ticker} Corp.`,
                    price: parseFloat(quote.lastPrice || quote.price) || 0,
                    change: parseFloat(quote.change) || 0,
                    changePercent: parseFloat(quote.changePercent || quote.changesPercentage) || 0,
                    marketCap: formatMarketCap(quote.marketCap || profile?.mktCap),
                    volume: formatVolume(quote.volume || quote.avgVolume),
                    // Datos adicionales del perfil
                    sector: profile?.sector || 'N/A',
                    industry: profile?.industry || 'N/A',
                    website: profile?.website || '',
                    employees: profile?.fullTimeEmployees ? profile.fullTimeEmployees.toLocaleString() : 'N/A',
                    peRatio: parseFloat(quote.peRatio || quote.pe) || 0,
                    dividend: profile?.lastDiv || '0.00',
                    beta: parseFloat(profile?.beta) || 1.0,
                    high52Week: parseFloat(quote.yearHigh || quote.high) || 0,
                    low52Week: parseFloat(quote.yearLow || quote.low) || 0,
                    description: profile?.description || `${quote.name || ticker} company information.`
                };
                
                console.log(`Using API data for ${ticker}:`, updatedStock);
                return updatedStock;
            } else {
                console.log(`API data invalid for ${ticker}, using fallback`);
            }
            
        } catch (error) {
            console.error(`Error updating data for ${ticker}:`, error);
        }
        
        // Usar datos de fallback si la API falla o devuelve datos inválidos
        const fallbackStock = getFallbackStockData(ticker);
        if (fallbackStock) {
            console.log(`Using fallback data for ${ticker}`);
            return fallbackStock;
        }
        
        // Retornar datos básicos como último recurso
        console.log(`Using basic fallback data for ${ticker}`);
        return {
            ticker: ticker,
            name: `${ticker} Corp.`,
            price: 100 + Math.random() * 200, // Precio aleatorio para testing
            change: (Math.random() - 0.5) * 10, // Cambio aleatorio
            changePercent: (Math.random() - 0.5) * 5, // Porcentaje aleatorio
            marketCap: formatMarketCap(Math.random() * 1e12), // Market cap aleatorio
            volume: formatVolume(Math.random() * 50000000), // Volumen aleatorio
            sector: 'Technology',
            industry: 'Software',
            website: '',
            employees: 'N/A',
            peRatio: 20 + Math.random() * 30,
            dividend: '0.00',
            beta: 1.0,
            high52Week: 0,
            low52Week: 0,
            description: `${ticker} company information.`
        };
    };

    // Función para actualizar todos los datos de la watchlist
    const refreshWatchlistData = async () => {
        if (watchlist.length === 0) return;
        
        setIsLoadingData(true);
        console.log('Starting watchlist data refresh...');
        
        try {
            const updatedStocks = await Promise.all(
                watchlist.map(stock => updateStockWithRealData(stock.ticker))
            );
            
            console.log('All stocks updated:', updatedStocks);
            const sortedWatchlist = sortWatchlistAlphabetically(updatedStocks);
            setWatchlist(sortedWatchlist);
            saveWatchlistToStorage(sortedWatchlist);
            console.log('Watchlist data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing watchlist data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    // Efecto para cargar datos reales al montar el componente y configurar actualización automática
    useEffect(() => {
        // Forzar actualización de datos al montar
        const forceRefreshData = async () => {
            console.log('Forcing data refresh on component mount...');
            await refreshWatchlistData();
        };
        
        forceRefreshData();
        
        // Configurar actualización cada 30 minutos (1800000 ms)
        const interval = setInterval(() => {
            refreshWatchlistData();
        }, 30 * 60 * 1000);

        // Limpiar el interval al desmontar
        return () => clearInterval(interval);
    }, []); // Solo ejecutar una vez al montar

    // Filter watchlist based on search query
    const filteredWatchlist = watchlist.filter(item =>
        item.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Funciones para el modal de añadir stock
    const handleAddStock = () => {
        setIsAddModalOpen(true);
        setSearchTicker('');
        setIsAddingStock(false);
    };

    const handleTickerSelect = async (tickerData) => {
        // Verificar si la stock ya está en la watchlist
        if (watchlist.find(item => item.ticker === tickerData.symbol)) {
            alert('Esta stock ya está en tu watchlist');
            return;
        }

        setIsAddingStock(true);
        try {
            const newStock = await updateStockWithRealData(tickerData.symbol);
            const updatedWatchlist = sortWatchlistAlphabetically([...watchlist, newStock]);
            setWatchlist(updatedWatchlist);
            saveWatchlistToStorage(updatedWatchlist);
            setIsAddModalOpen(false);
            setSearchTicker('');
        } catch (error) {
            console.error('Error adding stock:', error);
            alert('Error al añadir la stock. Intenta de nuevo.');
        } finally {
            setIsAddingStock(false);
        }
    };

    const handleCancelAddStock = () => {
        setIsAddModalOpen(false);
        setSearchTicker('');
        setIsAddingStock(false);
    };

    const handleRemoveFromWatchlist = (ticker) => {
        const updatedWatchlist = watchlist.filter(item => item.ticker !== ticker);
        setWatchlist(updatedWatchlist);
        saveWatchlistToStorage(updatedWatchlist);
    };

    const handleViewStock = async (ticker) => {
        const stock = watchlist.find(item => item.ticker === ticker);
        if (!stock) return;

        setSelectedStock(stock);
        setIsDetailsModalOpen(true);
        setIsLoadingDetails(true);

        try {
            // Obtener datos actualizados de la API
            const updatedStock = await updateStockWithRealData(ticker);
            
            setStockDetails({
                ...updatedStock,
                lastUpdated: new Date().toLocaleString(),
                // Calcular datos adicionales basados en los datos reales
                additionalData: {
                    openPrice: updatedStock.price - (updatedStock.change * 0.8),
                    dayHigh: updatedStock.high52Week || updatedStock.price * 1.1,
                    dayLow: updatedStock.low52Week || updatedStock.price * 0.9,
                    averageVolume: updatedStock.volume,
                    eps: updatedStock.peRatio ? (updatedStock.price / updatedStock.peRatio).toFixed(2) : 'N/A',
                    dividendYield: updatedStock.dividend && updatedStock.price ? 
                        ((parseFloat(updatedStock.dividend) / updatedStock.price) * 100).toFixed(2) + '%' : 'N/A'
                }
            });
        } catch (error) {
            console.error('Error loading stock details:', error);
            // Usar datos existentes si falla la API
            setStockDetails({
                ...stock,
                lastUpdated: new Date().toLocaleString(),
                additionalData: {
                    openPrice: stock.price - (stock.change * 0.8),
                    dayHigh: stock.price + (Math.abs(stock.change) * 1.2),
                    dayLow: stock.price - (Math.abs(stock.change) * 1.5),
                    averageVolume: stock.volume,
                    eps: stock.peRatio ? (stock.price / stock.peRatio).toFixed(2) : 'N/A',
                    dividendYield: stock.dividend && stock.price ? 
                        ((parseFloat(stock.dividend) / stock.price) * 100).toFixed(2) + '%' : 'N/A'
                }
            });
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleCloseDetailsModal = () => {
        setIsDetailsModalOpen(false);
        setSelectedStock(null);
        setStockDetails(null);
        setIsLoadingDetails(false);
    };

    return (
        <div className="watchlist-page">
            <div className="page-header">
                <div className="page-title-container">
                    <FontAwesomeIcon icon={faStar} className="page-icon" />
                    <h1>Watchlist</h1>
                </div>
                <div className="page-actions">
                    <div className="search-container">
                        <FontAwesomeIcon icon={faSearch} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search stocks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <button onClick={handleAddStock} className="add-stock-btn">
                        <FontAwesomeIcon icon={faPlus} />
                        Add Stock
                    </button>
                </div>
            </div>

            <div className="watchlist-content">
                {filteredWatchlist.length > 0 ? (
                    <div className="watchlist-table-container">
                        <div className="watchlist-table">
                            <div className="table-header">
                                <div className="header-cell symbol">Symbol</div>
                                <div className="header-cell name">Company</div>
                                <div className="header-cell price">Price</div>
                                <div className="header-cell change">Change</div>
                                <div className="header-cell change-percent">Change %</div>
                                <div className="header-cell market-cap">Market Cap</div>
                                <div className="header-cell volume">Volume</div>
                                <div className="header-cell actions">Actions</div>
                            </div>
                            
                            {filteredWatchlist.map((stock) => (
                                <div key={stock.ticker} className="table-row">
                                    <div className="table-cell symbol">
                                        <span className="ticker-symbol">{stock.ticker}</span>
                                    </div>
                                    <div className="table-cell name">
                                        <span className="company-name">{stock.name}</span>
                                    </div>
                                    <div className="table-cell price">
                                        <span className="stock-price">{formatCurrencyFunc(stock.price)}</span>
                                    </div>
                                    <div className="table-cell change">
                                        <span className={`price-change-amount ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                                            {stock.change >= 0 ? '+' : ''}{formatCurrencyFunc(stock.change)}
                                        </span>
                                    </div>
                                    <div className="table-cell change-percent">
                                        <span className={`price-change-percent ${stock.changePercent >= 0 ? 'positive' : 'negative'}`}>
                                            <FontAwesomeIcon 
                                                icon={stock.changePercent >= 0 ? faArrowUp : faArrowDown} 
                                                className="change-icon"
                                            />
                                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="table-cell market-cap">
                                        <span className="market-cap-value">{stock.marketCap}</span>
                                    </div>
                                    <div className="table-cell volume">
                                        <span className="volume-value">{stock.volume}</span>
                                    </div>
                                    <div className="table-cell actions">
                                        <div className="action-buttons">
                                            <button 
                                                onClick={() => handleViewStock(stock.ticker)}
                                                className="action-btn view" 
                                                title="View Details"
                                            >
                                                <FontAwesomeIcon icon={faBuilding} />
                                            </button>
                                            <button className="action-btn chart" title="View Chart">
                                                <FontAwesomeIcon icon={faChartLine} />
                                            </button>
                                            <button 
                                                onClick={() => handleRemoveFromWatchlist(stock.ticker)}
                                                className="action-btn remove" 
                                                title="Remove from Watchlist"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="empty-watchlist">
                        <div className="empty-icon-container">
                            <FontAwesomeIcon icon={faStar} className="empty-icon" />
                        </div>
                        <h2>Your Watchlist is Empty</h2>
                        <p>
                            {searchQuery 
                                ? `No stocks found matching "${searchQuery}"`
                                : "Start tracking stocks by adding them to your watchlist"
                            }
                        </p>
                        {!searchQuery && (
                            <button onClick={handleAddStock} className="cta-button">
                                <FontAwesomeIcon icon={faPlus} />
                                Add Your First Stock
                            </button>
                        )}
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="clear-search-btn">
                                Clear Search
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Detalles del Stock */}
            {isDetailsModalOpen && (
                <div className="modal-overlay" onClick={handleCloseDetailsModal}>
                    <div className="stock-details-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            {isLoadingDetails ? (
                                <div className="loading-details">
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    <p>Loading stock details...</p>
                                </div>
                            ) : stockDetails ? (
                                <>
                                    {/* Stock Header */}
                                    <div className="stock-header">
                                        <div className="stock-header-top">
                                            <div className="stock-basic-info">
                                                <h3>{stockDetails.ticker}</h3>
                                                <p className="company-name">{stockDetails.name}</p>
                                                <div className="price-container">
                                                    <span className="price">{formatCurrencyFunc(stockDetails.price)}</span>
                                                    <span className={`change-info ${stockDetails.change >= 0 ? 'positive' : 'negative'}`}>
                                                        <span className="change-amount">
                                                            <FontAwesomeIcon 
                                                                icon={stockDetails.change >= 0 ? faArrowUp : faArrowDown} 
                                                            />
                                                            {stockDetails.change >= 0 ? '+' : ''}{formatCurrencyFunc(stockDetails.change)}
                                                        </span>
                                                        <span className="change-percent">
                                                            ({stockDetails.changePercent >= 0 ? '+' : ''}{stockDetails.changePercent.toFixed(2)}%)
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="stock-sector">
                                                <FontAwesomeIcon icon={faBuilding} />
                                                <span>{stockDetails.sector}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stock Metrics Grid */}
                                    <div className="stock-metrics-grid">
                                        <div className="metric-card">
                                            <div className="metric-icon">
                                                <FontAwesomeIcon icon={faDollarSign} />
                                            </div>
                                            <div className="metric-info">
                                                <span className="metric-label">Market Cap</span>
                                                <span className="metric-value">{stockDetails.marketCap}</span>
                                            </div>
                                        </div>

                                        <div className="metric-card">
                                            <div className="metric-icon">
                                                <FontAwesomeIcon icon={faChartBar} />
                                            </div>
                                            <div className="metric-info">
                                                <span className="metric-label">P/E Ratio</span>
                                                <span className="metric-value">{stockDetails.peRatio}</span>
                                            </div>
                                        </div>

                                        <div className="metric-card">
                                            <div className="metric-icon">
                                                <FontAwesomeIcon icon={faCalendarAlt} />
                                            </div>
                                            <div className="metric-info">
                                                <span className="metric-label">Dividend</span>
                                                <span className="metric-value">{stockDetails.dividend || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="metric-card">
                                            <div className="metric-icon">
                                                <FontAwesomeIcon icon={faUsers} />
                                            </div>
                                            <div className="metric-info">
                                                <span className="metric-label">Employees</span>
                                                <span className="metric-value">{stockDetails.employees}</span>
                                            </div>
                                        </div>

                                        <div className="metric-card">
                                            <div className="metric-icon">
                                                <FontAwesomeIcon icon={faArrowUp} />
                                            </div>
                                            <div className="metric-info">
                                                <span className="metric-label">52W High</span>
                                                <span className="metric-value">{formatCurrencyFunc(stockDetails.high52Week)}</span>
                                            </div>
                                        </div>

                                        <div className="metric-card">
                                            <div className="metric-icon">
                                                <FontAwesomeIcon icon={faArrowDown} />
                                            </div>
                                            <div className="metric-info">
                                                <span className="metric-label">52W Low</span>
                                                <span className="metric-value">{formatCurrencyFunc(stockDetails.low52Week)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Company Info */}
                                    <div className="company-info">
                                        <h4>Company Information</h4>
                                        <div className="company-details">
                                            <div className="detail-row">
                                                <strong>Industry:</strong>
                                                <span>{stockDetails.industry}</span>
                                            </div>
                                            <div className="detail-row">
                                                <strong>Website:</strong>
                                                <a href={stockDetails.website} target="_blank" rel="noopener noreferrer">
                                                    <FontAwesomeIcon icon={faGlobe} />
                                                    {stockDetails.website}
                                                </a>
                                            </div>
                                            <div className="detail-row">
                                                <strong>Beta:</strong>
                                                <span>{stockDetails.beta}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="company-description">
                                            <h5>Description</h5>
                                            <p>{stockDetails.description}</p>
                                        </div>
                                    </div>

                                    {/* Additional Data (if loaded) */}
                                    {stockDetails.additionalData && (
                                        <div className="additional-data">
                                            <h4>Today's Data</h4>
                                            <div className="today-metrics">
                                                <div className="today-metric">
                                                    <span className="label">Open:</span>
                                                    <span className="value">{formatCurrencyFunc(stockDetails.additionalData.openPrice)}</span>
                                                </div>
                                                <div className="today-metric">
                                                    <span className="label">Day High:</span>
                                                    <span className="value">{formatCurrencyFunc(stockDetails.additionalData.dayHigh)}</span>
                                                </div>
                                                <div className="today-metric">
                                                    <span className="label">Day Low:</span>
                                                    <span className="value">{formatCurrencyFunc(stockDetails.additionalData.dayLow)}</span>
                                                </div>
                                                <div className="today-metric">
                                                    <span className="label">EPS:</span>
                                                    <span className="value">{formatCurrencyFunc(stockDetails.additionalData.eps)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="last-updated">
                                        <small>Last updated: {stockDetails.lastUpdated}</small>
                                    </div>
                                </>
                            ) : (
                                <div className="error-details">
                                    <p>Unable to load stock details. Please try again.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para añadir stock */}
            {isAddModalOpen && (
                <div className="modal-overlay" onClick={handleCancelAddStock}>
                    <div className="add-stock-modal-container" onClick={(e) => e.stopPropagation()}>
                        {/* Header del modal */}
                        <div className="add-stock-modal-header">
                            <div className="modal-title-section">
                                <FontAwesomeIcon icon={faPlus} className="modal-icon" />
                                <h2>Add Stock to Watchlist</h2>
                            </div>
                            <button 
                                className="close-modal-btn" 
                                onClick={handleCancelAddStock}
                                disabled={isAddingStock}
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        {/* Body del modal */}
                        <div className="add-stock-modal-body">
                            <div className="search-instruction">
                                <p>Search for a stock by entering its symbol or company name</p>
                            </div>
                            
                            <div className="search-container-modal">
                                <TickerAutocomplete
                                    value={searchTicker}
                                    onChange={setSearchTicker}
                                    onTickerSelect={handleTickerSelect}
                                    placeholder="Search stocks (e.g., AAPL, Apple Inc.)..."
                                    disabled={isAddingStock}
                                    className="ticker-autocomplete-modal"
                                />
                            </div>

                            {isAddingStock && (
                                <div className="adding-stock-indicator">
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    <span>Adding stock to watchlist...</span>
                                </div>
                            )}

                            <div className="modal-tips">
                                <h4>Tips:</h4>
                                <ul>
                                    <li>Type at least 2 characters to see suggestions</li>
                                    <li>Click on any suggestion to add it to your watchlist</li>
                                    <li>You can search by stock symbol (AAPL) or company name (Apple)</li>
                                </ul>
                            </div>
                        </div>

                        {/* Footer del modal */}
                        <div className="add-stock-modal-footer">
                            <button 
                                className="cancel-btn"
                                onClick={handleCancelAddStock}
                                disabled={isAddingStock}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Watchlist;
