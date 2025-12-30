import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faInfoCircle,
    faCalendarAlt,
    faChartLine,
    faDollarSign
} from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/formatting';
import './Realized.css';

const Realized = ({ isGuest, realizedSales = [], user, formatCurrency: formatCurrencyProp, tickerLogos = {} }) => {
    const [dateRange, setDateRange] = useState('last2Weeks');
    const [symbolFilter, setSymbolFilter] = useState('');
    const [symbolInput, setSymbolInput] = useState(''); // Separate state for input
    const [realizedData, setRealizedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('gainLoss'); // 'gainLoss' or 'analyzer'
    const [viewMode, setViewMode] = useState('dollar'); // 'dollar' or 'percentage'
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [pendingDateRange, setPendingDateRange] = useState(null);
    const [contentVisible, setContentVisible] = useState(true);

    // Use the prop function or fallback to imported one
    const formatCurrencyFunc = formatCurrencyProp || formatCurrency;

    // Empty data structure for when user has no realized trades
    const emptyRealizedData = {
        reportingPeriod: {
            start: '01/01/2025',
            end: '09/23/2025'
        },
        summary: {
            totalProceeds: 0,
            totalCostBasis: 0,
            netGainLoss: 0,
            longTermGain: 0,
            shortTermLoss: 0,
            gainLossRatio: 0,
            gainRate: 0
        },
        transactions: [],
        analytics: {
            bestTrade: 0,
            worstTrade: 0,
            gainCount: 0,
            lossCount: 0,
            totalTransactions: 0
        }
    };

    // Función para procesar las ventas realizadas
    const processRealizedSales = (sales) => {
        // Calcular fechas dinámicas basadas en dateRange
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        let startDate, endDate;

        switch (dateRange) {
            case 'last2Weeks':
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 14);
                endDate = currentDate;
                break;
            case 'last1Month':
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                endDate = currentDate;
                break;
            case 'last3Months':
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 3);
                endDate = currentDate;
                break;
            case 'last6Months':
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 6);
                endDate = currentDate;
                break;
            case 'ytd':
                startDate = new Date(currentYear, 0, 1); // 1 de enero del año actual
                endDate = currentDate;
                break;
            case 'custom':
                // Usar fechas personalizadas si están definidas, sino usar último mes
                if (customStartDate && customEndDate) {
                    startDate = new Date(customStartDate);
                    endDate = new Date(customEndDate);
                } else {
                    startDate = new Date();
                    startDate.setMonth(startDate.getMonth() - 1);
                    endDate = currentDate;
                }
                break;
            default:
                // Por defecto últimas 2 semanas
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 14);
                endDate = currentDate;
        }

        if (!sales || sales.length === 0) {
            return {
                ...emptyRealizedData,
                reportingPeriod: {
                    start: startDate.toLocaleDateString(),
                    end: endDate.toLocaleDateString()
                }
            };
        }

        // Filtrar por símbolo si está especificado
        let filteredSales = sales;
        if (symbolFilter) {
            filteredSales = sales.filter(sale => 
                sale.ticker.toLowerCase().includes(symbolFilter.toLowerCase())
            );
        }

        // Usar las fechas ya calculadas arriba

        filteredSales = filteredSales.filter(sale => {
            const saleDate = new Date(sale.saleDate);
            return saleDate >= startDate && saleDate <= endDate;
        });

        // Calcular estadísticas
        const totalProceeds = filteredSales.reduce((sum, sale) => sum + (sale.proceeds || 0), 0);
        const totalCostBasis = filteredSales.reduce((sum, sale) => sum + (sale.costBasis || 0), 0);
        const netGainLoss = filteredSales.reduce((sum, sale) => sum + (sale.realizedGainLoss || 0), 0);
        
        const gains = filteredSales.filter(sale => (sale.realizedGainLoss || 0) > 0);
        const losses = filteredSales.filter(sale => (sale.realizedGainLoss || 0) < 0);
        
        const totalGains = gains.reduce((sum, sale) => sum + (sale.realizedGainLoss || 0), 0);
        const totalLosses = Math.abs(losses.reduce((sum, sale) => sum + (sale.realizedGainLoss || 0), 0));
        
        const gainLossRatio = losses.length > 0 ? gains.length / losses.length : gains.length;
        const gainRate = filteredSales.length > 0 ? (gains.length / filteredSales.length) * 100 : 0;

        // Convertir ventas al formato esperado por el componente
        const transactions = filteredSales.map(sale => ({
            id: sale.id,
            symbol: sale.ticker,
            date: sale.saleDate,
            quantity: sale.quantity,
            sellPrice: sale.salePrice,
            proceeds: sale.proceeds,
            costBasis: sale.costBasis,
            realizedGainLoss: sale.realizedGainLoss,
            type: sale.type || 'market',
            gainLossPercent: sale.costBasis > 0 ? ((sale.realizedGainLoss / sale.costBasis) * 100) : 0
        }));

        return {
            reportingPeriod: {
                start: startDate.toLocaleDateString(),
                end: endDate.toLocaleDateString()
            },
            summary: {
                totalProceeds,
                totalCostBasis,
                netGainLoss,
                totalGains,
                totalLosses,
                gainLossRatio,
                gainRate
            },
            transactions: transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
            analytics: {
                bestTrade: filteredSales.length > 0 ? Math.max(...filteredSales.map(sale => sale.realizedGainLoss || 0)) : 0,
                worstTrade: filteredSales.length > 0 ? Math.min(...filteredSales.map(sale => sale.realizedGainLoss || 0)) : 0,
                gainCount: gains.length,
                lossCount: losses.length,
                totalTransactions: filteredSales.length
            }
        };
    };

    // Función para aplicar filtros
    const handleSearch = () => {
        setSymbolFilter(symbolInput);
    };

    // Manejar Enter en el input
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Manejar cambio de rango de fechas con transición suave
    const handleDateRangeChange = (e) => {
        const newRange = e.target.value;
        if (newRange === 'custom') {
            setShowCustomModal(true);
        } else {
            // Paso 1: Ocultar contenido con fade-out
            setContentVisible(false);
            
            setTimeout(() => {
                // Paso 2: Mostrar loader después del fade-out
                setIsTransitioning(true);
                
                setTimeout(() => {
                    // Paso 3: Procesar datos mientras loader está visible
                    setDateRange(newRange);
                }, 100);
            }, 200); // Tiempo para fade-out
        }
    };

    // Aplicar rango personalizado con transición
    const handleCustomRangeApply = () => {
        if (customStartDate && customEndDate) {
            setShowCustomModal(false);
            
            // Mismo proceso de transición suave
            setContentVisible(false);
            
            setTimeout(() => {
                setIsTransitioning(true);
                
                setTimeout(() => {
                    setDateRange('custom');
                }, 100);
            }, 200);
        }
    };

    // Cancelar rango personalizado
    const handleCustomRangeCancel = () => {
        setShowCustomModal(false);
        // Si no había fechas personalizadas, volver al rango anterior
        if (!customStartDate || !customEndDate) {
            setDateRange(dateRange === 'custom' ? 'last2Weeks' : dateRange);
        }
    };

    useEffect(() => {
        // Solo mostrar loading completo si no es una transición
        if (!isTransitioning) {
            setLoading(true);
        }
        
        const processData = () => {
            const processedData = processRealizedSales(realizedSales);
            setRealizedData(processedData);
            
            // Si estamos en transición, manejar el fade-in suave
            if (isTransitioning) {
                setTimeout(() => {
                    // Paso 4: Ocultar loader
                    setIsTransitioning(false);
                    
                    setTimeout(() => {
                        // Paso 5: Mostrar contenido con fade-in
                        setContentVisible(true);
                    }, 100); // Pequeño delay para transición suave
                }, 300); // Tiempo para que se vea el loader
            } else {
                setLoading(false);
            }
        };

        if (isTransitioning) {
            // Durante transición, procesar con delay mínimo
            setTimeout(processData, 50);
        } else {
            // Carga normal con delay
            setTimeout(processData, 100);
        }
    }, [realizedSales, dateRange, symbolFilter]);

    if (loading) {
        return (
            <div className="realized-page">
                <div className="loading-container">
                    <div className="loading-spinner-circle"></div>
                    <p className="loading-text">Loading realized transactions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="realized-page">
            {/* Filters Section */}
            <div className="realized-controls">
                <div className="filters-row">
                    <div className="filter-group">
                        <label className="filter-label">
                            <FontAwesomeIcon icon={faCalendarAlt} className="label-icon" />
                            Date Range
                        </label>
                        <select 
                            value={dateRange} 
                            onChange={handleDateRangeChange}
                            className="filter-select"
                        >
                            <option value="last2Weeks">2 weeks</option>
                            <option value="last1Month">1 month</option>
                            <option value="last3Months">3 months</option>
                            <option value="last6Months">6 months</option>
                            <option value="ytd">YTD</option>
                            <option value="custom">Custom range</option>
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <label className="filter-label">
                            <FontAwesomeIcon icon={faSearch} className="label-icon" />
                            Symbol <span className="optional-text">(Optional)</span>
                        </label>
                        <div className="search-box">
                            <FontAwesomeIcon icon={faSearch} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Enter symbol..."
                                value={symbolInput}
                                onChange={(e) => setSymbolInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="search-input"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="search-button-container">
                    <button onClick={handleSearch} className="search-btn">
                        <FontAwesomeIcon icon={faSearch} />
                        Search
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="realized-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'gainLoss' ? 'active' : ''}`}
                    onClick={() => setActiveTab('gainLoss')}
                >
                    <FontAwesomeIcon icon={faChartLine} />
                    Gain/Loss Summary
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'analyzer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analyzer')}
                >
                    <FontAwesomeIcon icon={faDollarSign} />
                    Transaction Analyzer
                </button>
            </div>

            {/* Transition Loading Overlay */}
            {isTransitioning && (
                <div className="transition-overlay">
                    <div className="transition-loader">
                        <div className="loader-spinner"></div>
                        <p>Updating realized gains...</p>
                    </div>
                </div>
            )}

            {/* Content Based on Active Tab */}
            {activeTab === 'gainLoss' && (
                <div className={`tab-content ${contentVisible ? 'visible' : 'hidden'}`}>
                    {/* Summary Cards */}
                    <div className="summary-grid">
                        <div className="summary-card">
                            <div className="card-header">
                                <div className="card-icon">
                                    <FontAwesomeIcon icon={faCalendarAlt} />
                                </div>
                                <h3>Reporting Period</h3>
                            </div>
                            <div className="card-content">
                                <p className="period-display">
                                    {realizedData.reportingPeriod.start} to {realizedData.reportingPeriod.end}
                                </p>
                                <div className="period-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Total</span>
                                        <span className="detail-value">{formatCurrencyFunc(realizedData.summary.totalProceeds)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Net Gain/Loss</span>
                                        <span className={`detail-value ${realizedData.summary.netGainLoss >= 0 ? 'positive' : 'negative'}`}>
                                            {formatCurrencyFunc(realizedData.summary.netGainLoss)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="card-header">
                                <div className="card-icon">
                                    <FontAwesomeIcon icon={faChartLine} />
                                </div>
                                <h3>Trading Statistics</h3>
                            </div>
                            <div className="card-content">
                                <div className="gain-loss-items">
                                    <div className="detail-item">
                                        <span className="detail-label">Total Transactions</span>
                                        <span className="detail-value">{realizedData.analytics.totalTransactions}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Win Rate</span>
                                        <span className="detail-value">{realizedData.summary.gainRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Rentabilidad Total</span>
                                        <span className={`detail-value ${realizedData.summary.totalCostBasis > 0 ? 
                                            ((realizedData.summary.netGainLoss / realizedData.summary.totalCostBasis) >= 0 ? 'positive' : 'negative') 
                                            : ''}`}>
                                            {realizedData.summary.totalCostBasis > 0 
                                                ? `${((realizedData.summary.netGainLoss / realizedData.summary.totalCostBasis) * 100).toFixed(2)}%`
                                                : '0.00%'
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="card-header">
                                <div className="card-icon">
                                    <FontAwesomeIcon icon={faInfoCircle} />
                                </div>
                                <h3>Performance Summary</h3>
                            </div>
                            <div className="card-content">
                                <div className="performance-display">
                                    <div className="ratio-circle">
                                        <div className="ratio-inner" style={{
                                            background: realizedData.analytics.gainCount > 0 
                                                ? `conic-gradient(#10b981 0deg ${(realizedData.analytics.gainCount / Math.max(realizedData.analytics.totalTransactions, 1)) * 360}deg, #ef4444 ${(realizedData.analytics.gainCount / Math.max(realizedData.analytics.totalTransactions, 1)) * 360}deg 360deg)`
                                                : '#ef4444'
                                        }}>
                                            <div className="ratio-center">
                                                <span className="ratio-text">
                                                    {realizedData.analytics.gainCount}/{realizedData.analytics.totalTransactions}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="performance-stats">
                                        <div className="detail-item">
                                            <span className="detail-label">Total Gains</span>
                                            <span className="detail-value positive">{formatCurrencyFunc(realizedData.summary.totalGains)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Total Losses</span>
                                            <span className="detail-value negative">{formatCurrencyFunc(realizedData.summary.totalLosses)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="transactions-section">
                        <div className="section-header">
                            <h3>Realized Gain/Loss Details</h3>
                            <div className="view-toggle">
                                <span className="toggle-label">View:</span>
                                <div className="toggle-buttons">
                                    <button 
                                        className={`toggle-btn ${viewMode === 'dollar' ? 'active' : ''}`}
                                        onClick={() => setViewMode('dollar')}
                                    >
                                        $
                                    </button>
                                    <button 
                                        className={`toggle-btn ${viewMode === 'percentage' ? 'active' : ''}`}
                                        onClick={() => setViewMode('percentage')}
                                    >
                                        %
                                    </button>
                                </div>
                            </div>
                        </div>

                        {realizedData.transactions.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <FontAwesomeIcon icon={faChartLine} />
                                </div>
                                <h3>No Realized Transactions</h3>
                                <p>You haven't sold any positions yet. When you sell stocks, your realized gains and losses will appear here.</p>
                            </div>
                        ) : (
                            <div className="transactions-table-container">
                                <table className="transactions-table">
                                    <thead>
                                        <tr>
                                            <th>Symbol</th>
                                            <th>Date</th>
                                            <th>Quantity</th>
                                            <th>Sell Price</th>
                                            <th>Total</th>
                                            <th className={viewMode === 'dollar' ? 'primary-column' : 'secondary-column'}>
                                                Gain/Loss ($)
                                            </th>
                                            <th className={viewMode === 'percentage' ? 'primary-column' : 'secondary-column'}>
                                                Gain/Loss (%)
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {realizedData.transactions.map((transaction) => (
                                            <tr key={transaction.id}>
                                                <td className="symbol-cell">
                                                    <div className="symbol-with-logo">
                                                        {tickerLogos[transaction.symbol] ? (
                                                            <img 
                                                                src={tickerLogos[transaction.symbol]} 
                                                                alt={`${transaction.symbol} logo`}
                                                                className="ticker-logo-small"
                                                            />
                                                        ) : (
                                                            <div className="ticker-logo-placeholder">
                                                                {transaction.symbol.charAt(0)}
                                                            </div>
                                                        )}
                                                        <span className="symbol">{transaction.symbol}</span>
                                                    </div>
                                                </td>
                                                <td>{new Date(transaction.date).toLocaleDateString()}</td>
                                                <td>{transaction.quantity}</td>
                                                <td>{formatCurrencyFunc(transaction.sellPrice)}</td>
                                                <td>{formatCurrencyFunc(transaction.proceeds)}</td>
                                                <td className={`${transaction.realizedGainLoss >= 0 ? 'gain' : 'loss'} ${viewMode === 'dollar' ? 'primary-column' : 'secondary-column'}`}>
                                                    {formatCurrencyFunc(transaction.realizedGainLoss)}
                                                </td>
                                                <td className={`${transaction.gainLossPercent >= 0 ? 'gain' : 'loss'} ${viewMode === 'percentage' ? 'primary-column' : 'secondary-column'}`}>
                                                    {transaction.gainLossPercent.toFixed(2)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'analyzer' && (
                <div className={`tab-content ${contentVisible ? 'visible' : 'hidden'}`}>
                    {/* Analytics Summary */}
                    <div className="summary-grid">
                        <div className="summary-card">
                            <div className="card-header">
                                <div className="card-icon">
                                    <FontAwesomeIcon icon={faCalendarAlt} />
                                </div>
                                <h3>Analysis Period</h3>
                            </div>
                            <div className="card-content">
                                <p className="period-display">
                                    {realizedData.reportingPeriod.start} to {realizedData.reportingPeriod.end}
                                </p>
                                <div className="period-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Total Transactions</span>
                                        <span className="detail-value">{realizedData.analytics.totalTransactions}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="card-header">
                                <div className="card-icon">
                                    <FontAwesomeIcon icon={faChartLine} />
                                </div>
                                <h3>Transaction Averages</h3>
                            </div>
                            <div className="card-content">
                                <div className="gain-loss-items">
                                    <div className="detail-item">
                                        <span className="detail-label">Mejor Operación</span>
                                        <span className="detail-value positive">{formatCurrencyFunc(realizedData.analytics.bestTrade)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Peor Operación</span>
                                        <span className="detail-value negative">{formatCurrencyFunc(realizedData.analytics.worstTrade)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="card-header">
                                <div className="card-icon">
                                    <FontAwesomeIcon icon={faInfoCircle} />
                                </div>
                                <h3>Transaction Breakdown</h3>
                            </div>
                            <div className="card-content">
                                <div className="performance-display">
                                    <div className="ratio-circle">
                                        <div className="ratio-inner">
                                        </div>
                                    </div>
                                    <div className="performance-stats">
                                        <div className="detail-item">
                                            <span className="detail-label">Winning Trades</span>
                                            <span className="detail-value">{realizedData.analytics.gainCount}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Losing Trades</span>
                                            <span className="detail-value">{realizedData.analytics.lossCount}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Empty State for Analysis */}
                    <div className="transactions-section">
                        <div className="section-header">
                            <h3>Transaction Analysis</h3>
                        </div>

                        <div className="empty-state">
                            <div className="empty-icon">
                                <FontAwesomeIcon icon={faDollarSign} />
                            </div>
                            <h3>No Transaction Data</h3>
                            <p>Start trading to see detailed analytics of your investment performance and patterns.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Custom Range */}
            {showCustomModal && (
                <div className="modal-overlay">
                    <div className="modal-content custom-date-modal">
                        <div className="modal-header">
                            <h2>Select Custom Date Range</h2>
                            <button onClick={handleCustomRangeCancel} className="close-button">&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="date-inputs">
                                <div className="form-group">
                                    <label htmlFor="startDate">Start Date</label>
                                    <input 
                                        type="date" 
                                        id="startDate" 
                                        value={customStartDate} 
                                        onChange={(e) => setCustomStartDate(e.target.value)} 
                                        className="date-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="endDate">End Date</label>
                                    <input 
                                        type="date" 
                                        id="endDate" 
                                        value={customEndDate} 
                                        onChange={(e) => setCustomEndDate(e.target.value)} 
                                        className="date-input"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={handleCustomRangeCancel} className="btn btn-secondary">
                                Cancel
                            </button>
                            <button 
                                onClick={handleCustomRangeApply} 
                                className="btn btn-primary"
                                disabled={!customStartDate || !customEndDate}
                            >
                                Apply Range
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Realized;