import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faChartLine, 
    faShieldAlt, 
    faArrowUp, 
    faCalendarAlt, 
    faInfoCircle,
    faChevronRight,
    faPlus,
    faUserCircle,
    faDollarSign,
    faWallet,
    faEdit,
    faCheck,
    faTimes,
    faHistory
} from '@fortawesome/free-solid-svg-icons';
import PortfolioChart from '../components/PortfolioChart';
import PortfolioTable from '../components/PortfolioTable';
import Tooltip from '../components/Tooltip';
import CashDepositsModal from '../components/CashDepositsModal';

const Dashboard = ({ 
    positions,
    portfolioStats,
    chartTimePeriod,
    setChartTimePeriod,
    isLoadingPortfolio,
    isGuest,
    formatCurrency,
    getTopGainerAndLoser,
    openModal,
    openHistoryModal,
    onSellPosition,
    loadingTickers,
    errorTickers,
    tickerLogos,
    totalInvested,
    totalValue,
    availableCash,
    updateAvailableCash,
    addCashDeposit,
    cashDeposits,
    editCashDeposit,
    deleteCashDeposit
}) => {
    const [isEditingCash, setIsEditingCash] = useState(false);
    const [cashInputValue, setCashInputValue] = useState('');
    const [isAddingDeposit, setIsAddingDeposit] = useState(false);
    const [depositInputValue, setDepositInputValue] = useState('');
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [showCashDepositsModal, setShowCashDepositsModal] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const handleEditCash = () => {
        setIsEditingCash(true);
        setCashInputValue(availableCash.toString());
    };

    const handleSaveCash = () => {
        const newAmount = parseFloat(cashInputValue) || 0;
        updateAvailableCash(newAmount);
        setIsEditingCash(false);
        setCashInputValue('');
    };

    const handleCancelEditCash = () => {
        setIsEditingCash(false);
        setCashInputValue('');
    };

    const handleAddDeposit = () => {
        setIsAddingDeposit(true);
        setDepositInputValue('');
    };

    const handleSaveDeposit = () => {
        const depositAmount = parseFloat(depositInputValue) || 0;
        if (depositAmount > 0) {
            addCashDeposit(depositAmount);
        }
        setIsAddingDeposit(false);
        setDepositInputValue('');
    };

    const handleCancelDeposit = () => {
        setIsAddingDeposit(false);
        setDepositInputValue('');
    };

    // Funciones para custom range
    const handleCustomRangeApply = () => {
        if (customStartDate && customEndDate) {
            setShowCustomModal(false);
            setChartTimePeriod('custom');
            // Aquí podrías pasar las fechas personalizadas al PortfolioChart si es necesario
        }
    };

    const handleCustomRangeCancel = () => {
        setShowCustomModal(false);
    };

    return (
        <>
            <div className="dashboard-grid">
                {/* Fila 1: Métricas (izquierda) vs Best/Worst (derecha) */}
                <div className="stats-grid">
                        <div className="stat-card total-value-card">
                            <div className="icon-container">
                                <FontAwesomeIcon icon={faChartLine} />
                            </div>
                            <div className="text-content">
                                <p>Portfolio Value</p>
                                <div className="divided-stats">
                                    <div className="stat-section top">
                                        <span className="stat-label">Current Value</span>
                                        <div className="value-line">
                                            {positions.length === 0 ? (
                                                <h3 style={{ color: '#6b7280' }}>
                                                    $0.00
                                                </h3>
                                            ) : (
                                                <h3 style={{
                                                    color: portfolioStats.hasMarketData && portfolioStats.totalPL >= 0 ? '#10b981' :
                                                        portfolioStats.hasMarketData && portfolioStats.totalPL < 0 ? '#ef4444' :
                                                        '#6b7280'
                                                }}>
                                                    {formatCurrency(totalValue)}
                                                </h3>
                                            )}
                                            {portfolioStats.hasMarketData && positions.length > 0 && (
                                                <div className="daily-change-indicators">
                                                    <span className={`daily-change-amount ${portfolioStats.dailyPL >= 0 ? 'positive' : 'negative'}`}>
                                                        {portfolioStats.dailyPL >= 0 ? '+' : ''}{formatCurrency(portfolioStats.dailyPL)}
                                                    </span>
                                                    <span className={`daily-change-percent ${portfolioStats.dailyPL >= 0 ? 'positive' : 'negative'}`}>
                                                        ({portfolioStats.dailyPL >= 0 ? '+' : ''}{portfolioStats.dailyPLPercent ? portfolioStats.dailyPLPercent.toFixed(2) : '0.00'}%)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`divider ${
                                        positions.length === 0 ? 'neutral' :
                                            portfolioStats.hasMarketData ? (
                                                portfolioStats.totalPL > 0 ? 'positive' :
                                                    portfolioStats.totalPL < 0 ? 'negative' : 'neutral'
                                            ) : 'neutral'
                                    }`}></div>
                                    <div className="stat-section bottom">
                                        <span className="stat-label">Total Invested</span>
                                        <div className="value-line">
                                            <h3>{formatCurrency(totalInvested)}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="icon-container">
                                <FontAwesomeIcon icon={faArrowUp} />
                            </div>
                            <div className="text-content">
                                <p>Total P/L</p>
                                {positions.length === 0 ? (
                                    <h2 style={{ color: '#6b7280' }}>
                                        $0.00
                                    </h2>
                                ) : portfolioStats.hasMarketData ? (
                                    <h2 style={{ color: portfolioStats.totalPL >= 0 ? '#10b981' : '#ef4444' }}>
                                        {formatCurrency(portfolioStats.totalPL)}
                                    </h2>
                                ) : (
                                    <h2 style={{ color: '#6b7280' }}>
                                        Loading...
                                    </h2>
                                )}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="icon-container">
                                <FontAwesomeIcon icon={faShieldAlt} />
                            </div>
                            <div className="text-content">
                                <p>Total Return</p>
                                {positions.length === 0 ? (
                                    <h2 style={{ color: '#6b7280' }}>
                                        0.00%
                                    </h2>
                                ) : portfolioStats.hasMarketData ? (
                                    <h2 style={{ color: portfolioStats.totalPL >= 0 ? '#10b981' : '#ef4444' }}>
                                        {portfolioStats.totalReturn ? portfolioStats.totalReturn.toFixed(2) : '0.00'}%
                                    </h2>
                                ) : (
                                    <h2 style={{ color: '#6b7280' }}>
                                        Loading...
                                    </h2>
                                )}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="icon-container">
                                <FontAwesomeIcon icon={faCalendarAlt} />
                            </div>
                            <div className="text-content">
                                <div className="label-with-tooltip">
                                    <p>Annualized Return</p>
                                    <Tooltip
                                        trigger={<FontAwesomeIcon icon={faInfoCircle} className="info-icon" />}
                                        title="Annualized Return (XIRR Method)"
                                        description="Calculated using XIRR (Extended Internal Rate of Return), the gold standard used by professional fund managers. This method accounts for the exact timing and amount of each investment, providing the most accurate measure of your portfolio's performance. Automatically falls back to CAGR for simple cases or if XIRR calculation fails."
                                    />
                                </div>
                                {positions.length === 0 ? (
                                    <h2 style={{ color: '#6b7280' }}>
                                        0.00%
                                    </h2>
                                ) : portfolioStats.hasMarketData ? (
                                    portfolioStats.annualizedReturn !== null && portfolioStats.annualizedReturn !== undefined ? (
                                        <h2 style={{ color: portfolioStats.annualizedReturn >= 0 ? '#10b981' : '#ef4444' }}>
                                            {portfolioStats.annualizedReturn.toFixed(2)}%
                                        </h2>
                                    ) : (
                                        <h2 style={{ color: '#9ca3af', fontSize: '1.2rem' }}>
                                            Insufficient Data
                                        </h2>
                                    )
                                ) : (
                                    <h2 style={{ color: '#6b7280' }}>
                                        Loading...
                                    </h2>
                                )}
                            </div>
                        </div>
                        <div className="stat-card available-cash-card">
                            <div className="icon-container">
                                <FontAwesomeIcon icon={faWallet} />
                            </div>
                            <div className="text-content">
                                <div className="label-with-tooltip">
                                    <p>Available Cash</p>
                                    {cashDeposits && cashDeposits.length > 0 && (
                                        <button 
                                            onClick={() => setShowCashDepositsModal(true)} 
                                            className="history-icon-btn"
                                            title="View cash deposits history"
                                        >
                                            <FontAwesomeIcon icon={faHistory} />
                                        </button>
                                    )}
                                </div>
                                {isEditingCash ? (
                                    <div className="cash-edit-container">
                                        <input
                                            type="number"
                                            value={cashInputValue}
                                            onChange={(e) => setCashInputValue(e.target.value)}
                                            className="cash-input"
                                            placeholder="Enter amount"
                                            step="0.01"
                                            min="0"
                                        />
                                        <div className="cash-actions">
                                            <button onClick={handleSaveCash} className="cash-btn save">
                                                <FontAwesomeIcon icon={faCheck} />
                                            </button>
                                            <button onClick={handleCancelEditCash} className="cash-btn cancel">
                                                <FontAwesomeIcon icon={faTimes} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="cash-display-container">
                                        <div className="cash-amount-line">
                                            <h2 style={{ color: '#10b981' }}>
                                                {formatCurrency(availableCash)}
                                            </h2>
                                            <button onClick={handleEditCash} className="edit-cash-btn">
                                                <FontAwesomeIcon icon={faEdit} />
                                            </button>
                                        </div>
                                        <div className="cash-actions-line">
                                            {isAddingDeposit ? (
                                                <div className="deposit-input-container">
                                                    <input
                                                        type="number"
                                                        value={depositInputValue}
                                                        onChange={(e) => setDepositInputValue(e.target.value)}
                                                        className="deposit-input"
                                                        placeholder="Deposit amount"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                    <button onClick={handleSaveDeposit} className="cash-btn save">
                                                        <FontAwesomeIcon icon={faCheck} />
                                                    </button>
                                                    <button onClick={handleCancelDeposit} className="cash-btn cancel">
                                                        <FontAwesomeIcon icon={faTimes} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={handleAddDeposit} className="add-deposit-btn">
                                                    <FontAwesomeIcon icon={faDollarSign} />
                                                    Add Deposit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                {/* Fila 2: Performance (izquierda) vs Health (derecha) */}
                <div className="widget widget-portfolio-performance">
                        <div className="widget-header">
                            <div className="widget-title-container">
                                <FontAwesomeIcon icon={faChartLine} className="widget-icon" />
                                <h3>Portfolio Performance</h3>
                            </div>
                            <div className="widget-actions">
                                <select 
                                    className="period-selector" 
                                    value={chartTimePeriod} 
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setShowCustomModal(true);
                                        } else {
                                            setChartTimePeriod(e.target.value);
                                        }
                                    }}
                                >
                                    <option value="last2Weeks">2 weeks</option>
                                    <option value="last1Month">1 month</option>
                                    <option value="last3Months">3 months</option>
                                    <option value="last6Months">6 months</option>
                                    <option value="ytd">YTD</option>
                                    <option value="custom">Custom range</option>
                                </select>
                            </div>
                        </div>
                        <div className="widget-content">
                            <PortfolioChart 
                                positions={positions} 
                                timePeriod={chartTimePeriod}
                                onTimePeriodChange={setChartTimePeriod}
                                isWidget={true}
                                totalInvested={typeof totalInvested !== 'undefined' ? totalInvested : portfolioStats.totalInvested}
                                totalValue={typeof totalValue !== 'undefined' ? totalValue : portfolioStats.totalValue}
                                showPeriodGains={true}
                                formatCurrencyProp={formatCurrency}
                            />
                        </div>
                    </div>

                <div className="widget widget-performance">
                        <div className="widget-header">
                            <div className="widget-title-container">
                                <FontAwesomeIcon icon={faArrowUp} className="widget-icon" />
                                <h3>Best vs Worst</h3>
                            </div>
                            <div className="widget-actions">
                                <button className="widget-expand-btn">
                                    <FontAwesomeIcon icon={faChevronRight} />
                                </button>
                            </div>
                        </div>
                        <div className="widget-content">
                            {positions.length > 0 ? (
                                <div className="performance-comparison">
                                    {(() => {
                                        const { topGainer, topLoser } = getTopGainerAndLoser();
                                        return (
                                            <>
                                                {/* Top Gainer */}
                                                <div className={`performance-item ${topGainer ? 'gainer' : 'neutral'}`}>
                                                    <div className="performance-header">
                                                        <span className="performance-label">
                                                            {topGainer ? '🏆 TOP GAINER' : '📊 BEST POSITION'}
                                                        </span>
                                                    </div>
                                                    {topGainer ? (
                                                        <div className="performance-details">
                                                            <div className="ticker-name">{topGainer.ticker}</div>
                                                            <div className={`gain-amount ${topGainer.absoluteGain >= 0 ? 'positive' : 'negative'}`}>
                                                                {formatCurrency(topGainer.absoluteGain)}
                                                            </div>
                                                            <div className={`gain-percentage ${topGainer.percentageGain >= 0 ? 'positive' : 'negative'}`}>
                                                                {topGainer.percentageGain >= 0 ? '+' : ''}{topGainer.percentageGain ? topGainer.percentageGain.toFixed(1) : '0.0'}%
                                                            </div>
                                                            <div className="price-range">
                                                                {topGainer.percentageGain >= 0 ? '↗️' : '↘️'} {formatCurrency(topGainer.avgPurchasePrice)} → {formatCurrency(topGainer.marketValue)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="performance-details">
                                                            <div className="ticker-name">No positions</div>
                                                            <div className="gain-amount neutral">$0</div>
                                                            <div className="gain-percentage neutral">0%</div>
                                                            <div className="price-range">Add positions to compare</div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Divider */}
                                                <div className="performance-divider"></div>

                                                {/* Top Loser */}
                                                <div className={`performance-item ${topLoser ? 'loser' : 'neutral'}`}>
                                                    <div className="performance-header">
                                                        <span className="performance-label">
                                                            {topLoser ? '📉 TOP LOSER' : '📊 WORST POSITION'}
                                                        </span>
                                                    </div>
                                                    {topLoser ? (
                                                        <div className="performance-details">
                                                            <div className="ticker-name">{topLoser.ticker}</div>
                                                            <div className={`gain-amount ${topLoser.absoluteGain >= 0 ? 'positive' : 'negative'}`}>
                                                                {formatCurrency(topLoser.absoluteGain)}
                                                            </div>
                                                            <div className={`gain-percentage ${topLoser.percentageGain >= 0 ? 'positive' : 'negative'}`}>
                                                                {topLoser.percentageGain >= 0 ? '+' : ''}{topLoser.percentageGain ? topLoser.percentageGain.toFixed(1) : '0.0'}%
                                                            </div>
                                                            <div className="price-range">
                                                                {topLoser.percentageGain >= 0 ? '↗️' : '↘️'} {formatCurrency(topLoser.avgPurchasePrice)} → {formatCurrency(topLoser.marketValue)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="performance-details">
                                                            <div className="ticker-name">No positions</div>
                                                            <div className="gain-amount neutral">$0</div>
                                                            <div className="gain-percentage neutral">0%</div>
                                                            <div className="price-range">Add positions to compare</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="widget-placeholder">
                                    <FontAwesomeIcon icon={faArrowUp} className="placeholder-icon" />
                                    <p>Performance Data</p>
                                    <span>Add positions to see your best and worst performers</span>
                                </div>
                            )}
                        </div>
                    </div>

                <div className="widget widget-security">
                        <div className="widget-header">
                            <div className="widget-title-container">
                                <FontAwesomeIcon icon={faShieldAlt} className="widget-icon" />
                                <h3>Portfolio Health</h3>
                            </div>
                            <div className="widget-actions">
                                <button className="widget-expand-btn">
                                    <FontAwesomeIcon icon={faChevronRight} />
                                </button>
                            </div>
                        </div>
                        <div className="widget-content">
                            <div className="widget-placeholder">
                                <FontAwesomeIcon icon={faShieldAlt} className="placeholder-icon" />
                                <p>Health Monitor</p>
                                <span>Ready for risk analysis</span>
                            </div>
                        </div>
                </div>
            </div>

            <section className="portfolio-status">
                {/* Loading state - only show when actually loading */}
                {isLoadingPortfolio ? (
                    <div className="portfolio-loading">
                        <div className="loading-spinner large"></div>
                        <h3>Loading Portfolio</h3>
                        <p>Fetching your positions...</p>
                    </div>
                ) : /* Guest with no positions */
                isGuest && positions.length === 0 ? (
                     <div className="empty-portfolio guest-empty">
                        <div className="empty-icon-container">
                            <FontAwesomeIcon icon={faUserCircle} className="guest-icon" />
                            <div className="icon-badge">Guest</div>
                        </div>
                        <h2>Welcome to Your Portfolio Journey!</h2>
                        <p>You're currently in guest mode. Start exploring by adding some positions to see how your investments could perform.</p>
                        <div className="empty-actions">
                            <button className="cta-button" onClick={openModal}>
                                <FontAwesomeIcon icon={faPlus} />
                                Add Your First Position
                            </button>
                            <p className="sign-in-hint">
                                <FontAwesomeIcon icon={faShieldAlt} />
                                Sign in to save and sync your portfolio across devices
                            </p>
                        </div>
                    </div>
                ) : /* Authenticated user with no positions */
                !isGuest && positions.length === 0 ? (
                    <div className="empty-portfolio user-empty">
                        <div className="empty-icon-container">
                            <FontAwesomeIcon icon={faChartLine} className="portfolio-icon" />
                            <div className="icon-pulse"></div>
                        </div>
                        <h2>Ready to Build Your Portfolio?</h2>
                        <p>Start your investment journey by adding your first position. Track performance, monitor gains, and watch your wealth grow.</p>
                        <div className="empty-actions">
                            <button className="cta-button primary" onClick={openModal}>
                                <FontAwesomeIcon icon={faPlus} />
                                Add Your First Position
                            </button>
                            <div className="features-grid">
                                <div className="feature-item">
                                    <FontAwesomeIcon icon={faChartLine} />
                                    <span>Real-time tracking</span>
                                </div>
                                <div className="feature-item">
                                    <FontAwesomeIcon icon={faShieldAlt} />
                                    <span>Secure & private</span>
                                </div>
                                <div className="feature-item">
                                    <FontAwesomeIcon icon={faCalendarAlt} />
                                    <span>Performance history</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : /* Show table when we have positions */
                (
                    <div>
                        <PortfolioTable 
                            positions={positions} 
                            onTickerClick={openHistoryModal}
                            onSellPosition={onSellPosition}
                            loadingTickers={loadingTickers}
                            errorTickers={errorTickers}
                            tickerLogos={tickerLogos}
                        />
                    </div>
                )}
            </section>

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
                                    <label htmlFor="dashboardStartDate">Start Date</label>
                                    <input 
                                        type="date" 
                                        id="dashboardStartDate" 
                                        value={customStartDate} 
                                        onChange={(e) => setCustomStartDate(e.target.value)} 
                                        className="date-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="dashboardEndDate">End Date</label>
                                    <input 
                                        type="date" 
                                        id="dashboardEndDate" 
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

            {/* Cash Deposits History Modal */}
            <CashDepositsModal
                isOpen={showCashDepositsModal}
                onClose={() => setShowCashDepositsModal(false)}
                cashDeposits={cashDeposits || []}
                formatCurrency={formatCurrency}
                onEditDeposit={editCashDeposit}
                onDeleteDeposit={deleteCashDeposit}
            />
        </>
    );
};

export default Dashboard;
