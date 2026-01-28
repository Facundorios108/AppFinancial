import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import './PortfolioTable.css';
import { formatCurrency } from '../utils/formatting';

const PortfolioTable = ({ positions, onTickerClick, onSellPosition, loadingTickers = new Set(), errorTickers = new Set(), tickerLogos = {} }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedPositions = useMemo(() => {
        if (!sortConfig.key) {
            // Orden por defecto: por fecha de primera compra (más antigua primero)
            return [...positions].sort((a, b) => {
                const aDate = new Date(a.firstPurchaseDate || '1900-01-01');
                const bDate = new Date(b.firstPurchaseDate || '1900-01-01');
                return aDate - bDate;
            });
        }

        return [...positions].sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.key) {
                case 'ticker':
                    aValue = a.ticker;
                    bValue = b.ticker;
                    break;
                case 'quantity':
                    aValue = a.quantity;
                    bValue = b.quantity;
                    break;
                case 'avgPurchasePrice':
                    aValue = a.avgPurchasePrice;
                    bValue = b.avgPurchasePrice;
                    break;
                case 'marketValue':
                    aValue = a.marketValue;
                    bValue = b.marketValue;
                    break;
                case 'investmentToday':
                    aValue = a.marketValue * a.quantity;
                    bValue = b.marketValue * b.quantity;
                    break;
                case 'pnl':
                    // Ordenar por porcentaje de rendimiento, no por valor monetario
                    const aTotalCost = a.avgPurchasePrice * a.quantity;
                    const aInvestmentToday = a.marketValue * a.quantity;
                    const aPnl = aInvestmentToday - aTotalCost;
                    const aPnlPercent = (aPnl / aTotalCost) * 100;
                    
                    const bTotalCost = b.avgPurchasePrice * b.quantity;
                    const bInvestmentToday = b.marketValue * b.quantity;
                    const bPnl = bInvestmentToday - bTotalCost;
                    const bPnlPercent = (bPnl / bTotalCost) * 100;
                    
                    aValue = aPnlPercent;
                    bValue = bPnlPercent;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [positions, sortConfig]);

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <span className="sort-icon sort-icon-default">↕</span>;
        }
        return sortConfig.direction === 'asc' 
            ? <span className="sort-icon sort-icon-asc">↑</span>
            : <span className="sort-icon sort-icon-desc">↓</span>;
    };
    return (
        <div className="table-container">
            <table className="portfolio-table">
                <thead>
                    <tr>
                        <th></th>
                        <th onClick={() => handleSort('ticker')} className="sortable-header">
                            Stock {getSortIcon('ticker')}
                        </th>
                        <th onClick={() => handleSort('quantity')} className="sortable-header">
                            Quantity {getSortIcon('quantity')}
                        </th>
                        <th onClick={() => handleSort('avgPurchasePrice')} className="sortable-header">
                            Avg. Purchase Price {getSortIcon('avgPurchasePrice')}
                        </th>
                        <th onClick={() => handleSort('marketValue')} className="sortable-header">
                            Market Value {getSortIcon('marketValue')}
                        </th>
                        <th onClick={() => handleSort('investmentToday')} className="sortable-header">
                            Investment Today {getSortIcon('investmentToday')}
                        </th>
                        <th onClick={() => handleSort('pnl')} className="sortable-header">
                            P/L {getSortIcon('pnl')}
                        </th>
                        <th className="actions-header">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedPositions.map((pos) => {
                        const isLoading = loadingTickers.has(pos.ticker) || pos.priceLoading || pos.marketValue === null;
                        const hasError = errorTickers.has(pos.ticker) || pos.priceError;
                        
                        // Only calculate financial metrics when we have valid market data
                        let marketValue = 0;
                        let investmentToday = 0;
                        let pnl = 0;
                        let pnlPercent = 0;
                        let pnlClass = '';
                        
                        if (!isLoading && !hasError && pos.marketValue !== null) {
                            marketValue = pos.marketValue;
                            investmentToday = marketValue * pos.quantity;
                            const totalCost = pos.avgPurchasePrice * pos.quantity;
                            pnl = investmentToday - totalCost;
                            pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
                            pnlClass = pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
                        }

                        return (
                            <tr key={pos.ticker}>
                                <td className="logo-cell">
                                    <div className="logo-wrapper">
                                        {tickerLogos[pos.ticker] ? (
                                            <img 
                                                src={tickerLogos[pos.ticker]} 
                                                alt={`${pos.ticker} logo`}
                                                className="ticker-logo-small"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="ticker-logo-placeholder"></div>
                                        )}
                                    </div>
                                </td>
                                <td className="ticker-cell">
                                    <button className="ticker-button" onClick={() => onTickerClick(pos.ticker)}>
                                        <span className="ticker-text">{pos.ticker}</span>
                                    </button>
                                </td>
                                <td>{pos.quantity}</td>
                                <td>{formatCurrency(pos.avgPurchasePrice)}</td>
                                <td className="market-value-cell">
                                    {isLoading && !hasError ? (
                                        <span className="loading-indicator">
                                            <span className="loading-text">Loading...</span>
                                        </span>
                                    ) : hasError ? (
                                        <span className="error-indicator">
                                            <FontAwesomeIcon icon={faExclamationTriangle} />
                                            <span className="error-text">N/A</span>
                                        </span>
                                    ) : (
                                        formatCurrency(marketValue)
                                    )}
                                </td>
                                <td className="investment-today-cell">
                                    {isLoading && !hasError ? (
                                        <span className="loading-indicator">
                                            <span className="loading-text">Loading...</span>
                                        </span>
                                    ) : hasError ? (
                                        <span className="error-indicator">
                                            <FontAwesomeIcon icon={faExclamationTriangle} />
                                            <span className="error-text">N/A</span>
                                        </span>
                                    ) : (
                                        formatCurrency(investmentToday)
                                    )}
                                </td>
                                <td className={`pnl-cell ${pnlClass}`}>
                                    {isLoading && !hasError ? (
                                        <span className="loading-indicator">
                                            <span className="loading-text">Loading...</span>
                                        </span>
                                    ) : hasError ? (
                                        <span className="error-indicator">
                                            <FontAwesomeIcon icon={faExclamationTriangle} />
                                            <span className="error-text">N/A</span>
                                        </span>
                                    ) : (
                                        `${formatCurrency(pnl)} (${pnlPercent.toFixed(2)}%)`
                                    )}
                                </td>
                                <td className="actions-cell">
                                    <button 
                                        className="sell-btn"
                                        onClick={() => onSellPosition && onSellPosition(pos)}
                                        title="Sell Position"
                                    >
                                        <FontAwesomeIcon icon={faDollarSign} />
                                        Sell
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default PortfolioTable;
