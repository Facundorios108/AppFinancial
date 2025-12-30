import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faArrowUp, 
    faArrowDown, 
    faEdit
} from '@fortawesome/free-solid-svg-icons';
import './Stocks.css';

const Stocks = ({ 
    positions, 
    portfolioStats,
    formatCurrency,
    openHistoryModal,
    loadingTickers,
    errorTickers,
    openModal,
    tickerLogos 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('all'); // all, gainers, losers

    // Utility functions - declared first to avoid hoisting issues
    const calculateGainPercent = (position) => {
        if (!position.marketValue) return 0;
        return ((position.marketValue - position.avgPurchasePrice) / position.avgPurchasePrice) * 100;
    };

    const calculateGainAmount = (position) => {
        if (!position.marketValue) return 0;
        return (position.marketValue - position.avgPurchasePrice) * position.quantity;
    };

    const getPerformanceClass = (position) => {
        if (!position.marketValue) return 'neutral';
        const gain = ((position.marketValue - position.avgPurchasePrice) / position.avgPurchasePrice) * 100;
        return gain >= 0 ? 'positive' : 'negative';
    };

    // Filter positions based on search term
    const filteredPositions = positions.filter(position =>
        position.ticker.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort positions by first purchase date (oldest first), then by ticker as fallback
    const sortedPositions = [...filteredPositions].sort((a, b) => {
        // Primary sort: by first purchase date (oldest first)
        const dateA = new Date(a.firstPurchaseDate || '1970-01-01');
        const dateB = new Date(b.firstPurchaseDate || '1970-01-01');
        
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
        }
        
        // Fallback sort: by ticker alphabetically
        return a.ticker.localeCompare(b.ticker);
    });

    // Apply additional filters
    const finalPositions = sortedPositions.filter(position => {
        if (filterBy === 'gainers') {
            return position.marketValue && calculateGainPercent(position) > 0;
        } else if (filterBy === 'losers') {
            return position.marketValue && calculateGainPercent(position) < 0;
        }
        return true;
    });

    return (
        <div className="stocks-page">
            <div className="stocks-controls">
                <div className="search-box">
                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search stocks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-controls">
                    <select 
                        value={filterBy} 
                        onChange={(e) => setFilterBy(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Stocks</option>
                        <option value="gainers">Gainers</option>
                        <option value="losers">Losers</option>
                    </select>
                </div>
            </div>

            <div className="stocks-stats">
                <div className="stat-card">
                    <div className="stat-label">Total Stocks</div>
                    <div className="stat-value">{positions.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Gainers</div>
                    <div className="stat-value positive">
                        {positions.filter(p => p.marketValue && calculateGainPercent(p) > 0).length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Losers</div>
                    <div className="stat-value negative">
                        {positions.filter(p => p.marketValue && calculateGainPercent(p) < 0).length}
                    </div>
                </div>
            </div>

            <div className="stocks-grid">
                {finalPositions.length === 0 ? (
                    <div className="no-stocks-message">
                        <div className="no-stocks-content">
                            <FontAwesomeIcon icon={faSearch} className="no-stocks-icon" />
                            <h3>{searchTerm ? 'No stocks found matching your search' : 'No stocks in your portfolio yet'}</h3>
                            <p>{searchTerm ? 'Try adjusting your search terms' : 'Start building your portfolio by adding your first stock'}</p>
                        </div>
                    </div>
                ) : (
                    finalPositions.map((position) => {
                        const investmentToday = position.marketValue ? position.marketValue * position.quantity : 0;
                        const totalInvestment = position.avgPurchasePrice * position.quantity;
                        const gainLoss = investmentToday - totalInvestment;
                        const gainLossPercent = calculateGainPercent(position);
                        const performanceClass = getPerformanceClass(position);
                        
                        return (
                            <div 
                                key={position.ticker} 
                                className={`stock-card ${performanceClass}`}
                                onClick={() => openHistoryModal(position.ticker)}
                            >
                                <div className="stock-card-header">
                                    <div className="stock-logo-container">
                                        {tickerLogos[position.ticker] ? (
                                            <img 
                                                src={tickerLogos[position.ticker]} 
                                                alt={`${position.ticker} logo`}
                                                className="stock-card-logo"
                                            />
                                        ) : (
                                            <div className="stock-card-logo-placeholder">
                                                {position.ticker.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="stock-card-info">
                                        <h3 className="stock-ticker">{position.ticker}</h3>
                                        <p className="stock-shares">{position.quantity} shares</p>
                                    </div>
                                    <div className="stock-card-actions">
                                        <button 
                                            className="card-action-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openModal({ ticker: position.ticker, delete: true });
                                            }}
                                            title={`Edit ${position.ticker}`}
                                        >
                                            <FontAwesomeIcon icon={faEdit} />
                                        </button>
                                    </div>
                                </div>

                                <div className="stock-card-metrics">
                                    <div className="metric-row">
                                        <span className="metric-label">Current Price</span>
                                        <span className="metric-value">
                                            {position.marketValue ? formatCurrency(position.marketValue) : '-'}
                                        </span>
                                    </div>
                                    <div className="metric-row">
                                        <span className="metric-label">Avg. Buy Price</span>
                                        <span className="metric-value">{formatCurrency(position.avgPurchasePrice)}</span>
                                    </div>
                                </div>

                                <div className="stock-card-investment">
                                    <div className="investment-summary">
                                        <div className="investment-item">
                                            <span className="investment-label">Invested</span>
                                            <span className="investment-value">{formatCurrency(totalInvestment)}</span>
                                        </div>
                                        <div className="investment-item">
                                            <span className="investment-label">Current Value</span>
                                            <span className="investment-value">
                                                {position.marketValue ? formatCurrency(investmentToday) : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {position.marketValue && (
                                    <div className={`stock-card-performance ${performanceClass}`}>
                                        <div className="performance-badge">
                                            <FontAwesomeIcon 
                                                icon={gainLoss >= 0 ? faArrowUp : faArrowDown} 
                                                className="performance-icon"
                                            />
                                            <span className="performance-amount">{formatCurrency(Math.abs(gainLoss))}</span>
                                            <span className="performance-percent">
                                                ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Stocks;
