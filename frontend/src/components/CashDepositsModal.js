import React, { useState } from 'react';
import './CashDepositsModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDollarSign, faArrowUp, faArrowDown, faEdit, faTrash, faCheck, faBan } from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from './ConfirmModal';

const CashDepositsModal = ({ isOpen, onClose, cashDeposits, formatCurrency, onEditDeposit, onDeleteDeposit }) => {
    const [editingId, setEditingId] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [depositToDelete, setDepositToDelete] = useState(null);

    if (!isOpen) return null;

    const totalDeposited = cashDeposits.reduce((sum, deposit) => {
        return deposit.type === 'deposit' ? sum + deposit.amount : sum;
    }, 0);

    const totalWithdrawn = cashDeposits.reduce((sum, deposit) => {
        return deposit.type === 'withdrawal' ? sum + Math.abs(deposit.amount) : sum;
    }, 0);

    const netCashFlow = totalDeposited - totalWithdrawn;

    const handleEditClick = (deposit) => {
        setEditingId(deposit.id);
        setEditAmount(Math.abs(deposit.amount).toString());
        setEditDate(deposit.date);
    };

    const handleSaveEdit = (deposit) => {
        const newAmount = parseFloat(editAmount);
        if (isNaN(newAmount) || newAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        // Mantener el signo según el tipo
        const finalAmount = deposit.type === 'withdrawal' ? -Math.abs(newAmount) : Math.abs(newAmount);

        onEditDeposit(deposit.id, {
            amount: finalAmount,
            date: editDate,
            type: deposit.type
        });

        setEditingId(null);
        setEditAmount('');
        setEditDate('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditAmount('');
        setEditDate('');
    };

    const handleDelete = (deposit) => {
        setDepositToDelete(deposit);
        setShowConfirmDelete(true);
    };

    const confirmDelete = () => {
        if (depositToDelete) {
            onDeleteDeposit(depositToDelete.id);
            setDepositToDelete(null);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content cash-deposits-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <FontAwesomeIcon icon={faDollarSign} className="modal-icon" />
                        Cash Deposits History
                    </h2>
                    <button className="close-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className="cash-summary">
                    <div className="summary-item positive">
                        <span className="summary-label">Total Deposited</span>
                        <span className="summary-value">{formatCurrency(totalDeposited)}</span>
                    </div>
                    <div className="summary-item negative">
                        <span className="summary-label">Total Withdrawn</span>
                        <span className="summary-value">{formatCurrency(totalWithdrawn)}</span>
                    </div>
                    <div className={`summary-item ${netCashFlow >= 0 ? 'positive' : 'negative'}`}>
                        <span className="summary-label">Net Cash Flow</span>
                        <span className="summary-value">{formatCurrency(netCashFlow)}</span>
                    </div>
                </div>

                <div className="modal-body">
                    {cashDeposits.length === 0 ? (
                        <div className="empty-state">
                            <p>No cash deposits or withdrawals recorded yet.</p>
                            <p className="empty-state-hint">
                                Use the "Add Deposit" button in the Available Cash card to record deposits.
                            </p>
                        </div>
                    ) : (
                        <div className="deposits-list">
                            <table className="deposits-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashDeposits.map((deposit) => (
                                        <tr key={deposit.id} className={deposit.type}>
                                            {editingId === deposit.id ? (
                                                <>
                                                    <td>
                                                        <input
                                                            type="date"
                                                            value={editDate}
                                                            onChange={(e) => setEditDate(e.target.value)}
                                                            className="edit-input date-input"
                                                        />
                                                    </td>
                                                    <td>
                                                        <span className={`type-badge ${deposit.type}`}>
                                                            <FontAwesomeIcon 
                                                                icon={deposit.type === 'deposit' ? faArrowDown : faArrowUp} 
                                                            />
                                                            {deposit.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={editAmount}
                                                            onChange={(e) => setEditAmount(e.target.value)}
                                                            className="edit-input amount-input"
                                                            step="0.01"
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-btn save-btn"
                                                                onClick={() => handleSaveEdit(deposit)}
                                                                title="Save"
                                                            >
                                                                <FontAwesomeIcon icon={faCheck} />
                                                            </button>
                                                            <button
                                                                className="action-btn cancel-btn"
                                                                onClick={handleCancelEdit}
                                                                title="Cancel"
                                                            >
                                                                <FontAwesomeIcon icon={faBan} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>{new Date(deposit.date).toLocaleDateString()}</td>
                                                    <td>
                                                        <span className={`type-badge ${deposit.type}`}>
                                                            <FontAwesomeIcon 
                                                                icon={deposit.type === 'deposit' ? faArrowDown : faArrowUp} 
                                                            />
                                                            {deposit.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                                        </span>
                                                    </td>
                                                    <td className={`amount ${deposit.type === 'deposit' ? 'positive' : 'negative'}`}>
                                                        {deposit.type === 'deposit' ? '+' : '-'}
                                                        {formatCurrency(Math.abs(deposit.amount))}
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-btn edit-btn"
                                                                onClick={() => handleEditClick(deposit)}
                                                                title="Edit"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} />
                                                            </button>
                                                            <button
                                                                className="action-btn delete-btn"
                                                                onClick={() => handleDelete(deposit)}
                                                                title="Delete"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <p className="info-text">
                        💡 Cash deposits are included in XIRR calculations for accurate annualized returns.
                    </p>
                </div>
            </div>

            <ConfirmModal
                isOpen={showConfirmDelete}
                onClose={() => {
                    setShowConfirmDelete(false);
                    setDepositToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Transaction"
                message={`Are you sure you want to delete this ${depositToDelete?.type === 'deposit' ? 'deposit' : 'withdrawal'} of ${depositToDelete ? formatCurrency(Math.abs(depositToDelete.amount)) : ''}?`}
                confirmText="Delete"
                cancelText="Cancel"
                confirmType="danger"
            />
        </div>
    );
};

export default CashDepositsModal;
