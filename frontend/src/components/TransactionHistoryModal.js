import React from 'react';
import './TransactionHistoryModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/formatting';

const TransactionHistoryModal = ({ isOpen, onClose, transactions, ticker, marketValue, onEdit, onDelete }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content transaction-modal">
                <div className="modal-header">
                    <h2>Transaction History for {ticker}</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="modal-body">
                    <div className="table-container">
                        <table className="transaction-table">
                            <thead>
                                <tr>
                                    <th>Purchase Date</th>
                                    <th>Quantity</th>
                                    <th>Purchase Price</th>
                                    <th>Performance</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => {
                                    const cost = tx.purchasePrice * tx.quantity;
                                    const currentValue = marketValue * tx.quantity;
                                    const pnl = currentValue - cost;
                                    const pnlPercent = cost !== 0 ? (pnl / cost) * 100 : 0;
                                    const pnlClass = pnl >= 0 ? 'pnl-positive' : 'pnl-negative';

                                    return (
                                        <tr key={tx.id}>
                                            <td>{tx.purchaseDate}</td>
                                            <td>{tx.quantity}</td>
                                            <td>{formatCurrency(tx.purchasePrice)}</td>
                                            <td className={pnlClass}>
                                                {formatCurrency(pnl)} ({pnlPercent.toFixed(2)}%)
                                            </td>
                                            <td className="transaction-actions">
                                                <button className="action-btn edit-btn" onClick={() => onEdit(tx)}>
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button className="action-btn delete-btn" onClick={() => onDelete(tx.id)}>
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionHistoryModal;
