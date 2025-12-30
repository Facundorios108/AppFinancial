import React, { useState } from 'react';
import TickerAutocomplete from './common/TickerAutocomplete.js';
import './AddPositionModal.css';

const AddPositionModal = ({ isOpen, onClose, onAddPosition }) => {
    const [ticker, setTicker] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
    const [purchasePrice, setPurchasePrice] = useState('');
    const [quantity, setQuantity] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        const newPosition = {
            ticker,
            purchaseDate,
            purchasePrice: parseFloat(purchasePrice),
            quantity: parseInt(quantity, 10),
        };
        onAddPosition(newPosition);
        setTicker('');
        setPurchasePrice('');
        setQuantity('');
        onClose(); // Close modal after adding
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Add New Position</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="ticker">Stock Ticker</label>
                        <TickerAutocomplete
                            value={ticker}
                            onChange={setTicker}
                            onTickerSelect={(suggestion) => {
                                setTicker(suggestion.symbol);
                                // El dropdown se cierra automáticamente en el componente TickerAutocomplete
                            }}
                            placeholder="e.g., AAPL, TSLA"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="purchaseDate">Purchase Date</label>
                        <input 
                            type="date" 
                            id="purchaseDate" 
                            name="purchaseDate" 
                            value={purchaseDate} 
                            onChange={(e) => setPurchaseDate(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="price">Purchase Price (USD)</label>
                        <input 
                            type="number" 
                            id="price" 
                            name="price" 
                            placeholder="e.g., 150.75" 
                            value={purchasePrice} 
                            onChange={(e) => setPurchasePrice(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="quantity">Number of Shares</label>
                        <input 
                            type="number" 
                            id="quantity" 
                            name="quantity" 
                            placeholder="e.g., 10" 
                            value={quantity} 
                            onChange={(e) => setQuantity(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-add">Add Position</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPositionModal;
