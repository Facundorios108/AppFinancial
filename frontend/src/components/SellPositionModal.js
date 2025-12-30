import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDollarSign, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import './SellPositionModal.css';
import { formatCurrency } from '../utils/formatting';

const SellPositionModal = ({ 
    isOpen, 
    onClose, 
    onSellPosition, 
    ticker, 
    position,
    currentPrice,
    formatCurrency: formatCurrencyProp
}) => {
    const [sellQuantity, setSellQuantity] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [sellType, setSellType] = useState('market'); // 'market' or 'limit'
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && position) {
            console.log('SellPositionModal - Position data:', position);
            console.log('SellPositionModal - Current price prop:', currentPrice);
            console.log('SellPositionModal - Ticker prop:', ticker);
            console.log('SellPositionModal - Position.marketValue:', position.marketValue);
            console.log('SellPositionModal - Position.currentPrice:', position.currentPrice);
            setSellQuantity('');
            setSellPrice(currentPrice ? currentPrice.toString() : '');
            setSellType('market');
            setErrors({});
        }
    }, [isOpen, position, currentPrice, ticker]);

    const validateForm = () => {
        const newErrors = {};

        // Validate quantity
        if (!sellQuantity || sellQuantity <= 0) {
            newErrors.quantity = 'Please enter a valid quantity';
        } else if (parseFloat(sellQuantity) > position.quantity) {
            newErrors.quantity = `Cannot sell more than ${position.quantity} shares`;
        } else if (!Number.isInteger(parseFloat(sellQuantity))) {
            newErrors.quantity = 'Quantity must be a whole number';
        }

        // Validate price for limit orders
        if (sellType === 'limit') {
            if (!sellPrice || sellPrice <= 0) {
                newErrors.price = 'Please enter a valid price';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const sellData = {
                ticker,
                quantity: parseInt(sellQuantity),
                price: sellType === 'market' ? currentPrice : parseFloat(sellPrice),
                type: sellType,
                timestamp: new Date().toISOString()
            };

            await onSellPosition(sellData);
            onClose();
        } catch (error) {
            console.error('Error selling position:', error);
            setErrors({ submit: 'Failed to sell position. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const calculateProceeds = () => {
        if (!sellQuantity || sellQuantity <= 0) return 0;
        const quantity = parseInt(sellQuantity) || 0;
        // Intentar obtener el precio desde múltiples fuentes
        const marketPrice = currentPrice || position?.marketValue || position?.currentPrice || 0;
        const price = sellType === 'market' ? marketPrice : parseFloat(sellPrice || 0);
        console.log('calculateProceeds - quantity:', quantity, 'price:', price, 'marketPrice:', marketPrice);
        if (isNaN(quantity) || isNaN(price)) return 0;
        return quantity * price;
    };

    const calculateGainLoss = () => {
        if (!sellQuantity || sellQuantity <= 0 || !position) return 0;
        const quantity = parseInt(sellQuantity) || 0;
        // Intentar obtener el precio desde múltiples fuentes
        const marketPrice = currentPrice || position?.marketValue || position?.currentPrice || 0;
        const price = sellType === 'market' ? marketPrice : parseFloat(sellPrice || 0);
        const avgPrice = position.avgPurchasePrice || 0;
        console.log('calculateGainLoss - quantity:', quantity, 'price:', price, 'avgPrice:', avgPrice);
        if (isNaN(quantity) || isNaN(price) || isNaN(avgPrice)) return 0;
        const costBasis = quantity * avgPrice;
        const proceeds = quantity * price;
        return proceeds - costBasis;
    };

    if (!isOpen) return null;

    const proceeds = calculateProceeds();
    const gainLoss = calculateGainLoss();
    const marketPrice = currentPrice || position?.marketValue || position?.currentPrice || 0;
    const currentSellPrice = sellType === 'market' ? marketPrice : parseFloat(sellPrice || 0);
    const gainLossPercent = position && position.avgPurchasePrice > 0 
        ? (currentSellPrice - position.avgPurchasePrice) / position.avgPurchasePrice * 100
        : 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="sell-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <FontAwesomeIcon icon={faDollarSign} className="modal-icon" />
                        <h3>Sell Position</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className="modal-content">
                    <div className="position-info">
                        <h4>{ticker}</h4>
                        <div className="position-details">
                            <div className="detail-row">
                                <span>Current Holdings:</span>
                                <span>{position?.quantity || 0} shares</span>
                            </div>
                            <div className="detail-row">
                                <span>Avg. Purchase Price:</span>
                                <span>{(formatCurrencyProp || formatCurrency)(position?.avgPurchasePrice || 0)}</span>
                            </div>
                            <div className="detail-row">
                                <span>Current Price:</span>
                                <span>{(formatCurrencyProp || formatCurrency)(marketPrice)}</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="sell-form">
                        <div className="form-group">
                            <label>Order Type</label>
                            <div className="order-type-buttons">
                                <button
                                    type="button"
                                    className={`order-type-btn ${sellType === 'market' ? 'active' : ''}`}
                                    onClick={() => setSellType('market')}
                                >
                                    Market Order
                                </button>
                                <button
                                    type="button"
                                    className={`order-type-btn ${sellType === 'limit' ? 'active' : ''}`}
                                    onClick={() => setSellType('limit')}
                                >
                                    Limit Order
                                </button>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="sellQuantity">Quantity to Sell</label>
                                <input
                                    type="number"
                                    id="sellQuantity"
                                    value={sellQuantity}
                                    onChange={(e) => setSellQuantity(e.target.value)}
                                    placeholder="Enter quantity"
                                    min="1"
                                    max={position?.quantity || 0}
                                    step="1"
                                    className={errors.quantity ? 'error' : ''}
                                />
                                {errors.quantity && (
                                    <span className="error-message">
                                        <FontAwesomeIcon icon={faExclamationTriangle} />
                                        {errors.quantity}
                                    </span>
                                )}
                            </div>

                            {sellType === 'limit' && (
                                <div className="form-group">
                                    <label htmlFor="sellPrice">Sell Price</label>
                                    <div className="price-input-container">
                                        <span className="currency-symbol">$</span>
                                        <input
                                            type="number"
                                            id="sellPrice"
                                            value={sellPrice}
                                            onChange={(e) => setSellPrice(e.target.value)}
                                            placeholder="0.00"
                                            min="0.01"
                                            step="0.01"
                                            className={errors.price ? 'error' : ''}
                                        />
                                    </div>
                                    {errors.price && (
                                        <span className="error-message">
                                            <FontAwesomeIcon icon={faExclamationTriangle} />
                                            {errors.price}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {sellQuantity && (
                            <div className="transaction-summary">
                                <h5>Transaction Summary</h5>
                                <div className="summary-details">
                                    <div className="detail-row">
                                        <span>Estimated Proceeds:</span>
                                        <span className="proceeds">{(formatCurrencyProp || formatCurrency)(proceeds)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Estimated Gain/Loss:</span>
                                        <span className={`gain-loss ${gainLoss >= 0 ? 'positive' : 'negative'}`}>
                                            {(formatCurrencyProp || formatCurrency)(gainLoss)} ({gainLossPercent.toFixed(2)}%)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {errors.submit && (
                            <div className="error-message submit-error">
                                <FontAwesomeIcon icon={faExclamationTriangle} />
                                {errors.submit}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="button" className="cancel-btn" onClick={onClose}>
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="sell-confirm-btn"
                                disabled={isLoading || !sellQuantity}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="loading-spinner"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faDollarSign} />
                                        Sell {sellQuantity || '0'} Shares
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SellPositionModal;