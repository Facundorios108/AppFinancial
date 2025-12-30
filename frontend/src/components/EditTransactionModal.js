import React, { useState, useEffect } from 'react';
import './AddPositionModal.css'; // Re-using the same styles as they are similar

const EditTransactionModal = ({ isOpen, onClose, transaction, onSave }) => {
    const [purchaseDate, setPurchaseDate] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [quantity, setQuantity] = useState('');

    useEffect(() => {
        if (transaction) {
            setPurchaseDate(transaction.purchaseDate);
            setPurchasePrice(transaction.purchasePrice);
            setQuantity(transaction.quantity);
        }
    }, [transaction]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        const updatedTransaction = {
            ...transaction,
            purchaseDate,
            purchasePrice: parseFloat(purchasePrice),
            quantity: parseInt(quantity, 10),
        };
        onSave(updatedTransaction);
        // No llamar onClose() aquí - se maneja en handleSaveTransaction
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Edit Transaction</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="purchaseDate">Purchase Date</label>
                        <input 
                            type="date" 
                            id="purchaseDate" 
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
                            value={quantity} 
                            onChange={(e) => setQuantity(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-add">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTransactionModal;
