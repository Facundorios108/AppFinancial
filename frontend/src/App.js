import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import './components/Tooltip.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faShieldAlt, faPlus, faChevronRight, faArrowUp, faCalendarAlt, faUserCircle, faSync, faInfoCircle, faDollarSign, faWallet } from '@fortawesome/free-solid-svg-icons';
import AddPositionModal from './components/AddPositionModal';
import SellPositionModal from './components/SellPositionModal';
import PortfolioTable from './components/PortfolioTable';
import TransactionHistoryModal from './components/TransactionHistoryModal';
import EditTransactionModal from './components/EditTransactionModal';
import ConfirmModal from './components/ConfirmModal';
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen'; // Import LoginScreen
import Tooltip from './components/Tooltip';
import FMPStatus from './components/FMPStatus'; // Import FMP Status
import PortfolioChart from './components/PortfolioChart'; // Import Portfolio Chart
import Dashboard from './pages/Dashboard'; // Import Dashboard
import Stocks from './pages/Stocks'; // Import Stocks
import Watchlist from './pages/Watchlist'; // Import Watchlist
import Realized from './pages/Realized'; // Import Realized
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { collection, doc, addDoc, getDocs, writeBatch, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { formatCurrency } from './utils/formatting';
import { calculatePortfolioXIRR } from './utils/xirr';
import { runXIRRTests } from './utils/xirrTests';
import fmpService from './services/fmpService'; // Import FMP service
import logger from './utils/logger'; // Import logger

// Componente interno que tiene acceso a useLocation
function AppContent() {
    const location = useLocation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [sellModalData, setSellModalData] = useState(null);
    const [confirmModalData, setConfirmModalData] = useState({});
    const [selectedTicker, setSelectedTicker] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [positions, setPositions] = useState([]);
    const [user, setUser] = useState(null);
    const [isGuest, setIsGuest] = useState(false); // State for guest mode
    const [loading, setLoading] = useState(true); // State for initial auth check
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [realizedSales, setRealizedSales] = useState([]); // State for realized sales
    const [cashDeposits, setCashDeposits] = useState([]); // State for cash deposits/withdrawals
    const [portfolioStats, setPortfolioStats] = useState({
        totalValue: 0,
        totalInvested: 0,
        totalPL: 0,
        dailyPL: 0, // Ganancia/pérdida del día
        dailyPLPercent: 0, // Ganancia/pérdida porcentual del día
        totalReturn: 0,
        annualizedReturn: 0,
        hasMarketData: false,
    });
    const [availableCash, setAvailableCash] = useState(0); // Estado para cash disponible
    const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
    const [portfolioLoaded, setPortfolioLoaded] = useState(false);
    const hasFetchedInitialPrices = useRef(false); // Flag para evitar fetch doble
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isAddingPosition, setIsAddingPosition] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingTickers, setLoadingTickers] = useState(new Set());
    const [errorTickers, setErrorTickers] = useState(new Set());
    const [lastUpdateTime, setLastUpdateTime] = useState(null);
    const [lastRefreshTime, setLastRefreshTime] = useState(null);
    const [notification, setNotification] = useState('');
    const [chartTimePeriod, setChartTimePeriod] = useState('last2Weeks'); // New state for chart time period
    const [tickerLogos, setTickerLogos] = useState({}); // State for company logos

    const openModal = (options = {}) => {
        if (options.ticker) {
            // Si se pasa un ticker, abrir el modal de historial de transacciones
            setSelectedTicker(options.ticker);
            setIsHistoryModalOpen(true);
        } else {
            // Comportamiento por defecto: abrir modal de agregar posición
            setIsModalOpen(true);
        }
    };
    const closeModal = () => setIsModalOpen(false);

    // Sell Position Modal Functions
    const openSellModal = (position) => {
        logger.log('Opening sell modal with position:', position);
        setSellModalData(position);
        setIsSellModalOpen(true);
    };

    const closeSellModal = () => {
        setIsSellModalOpen(false);
        setSellModalData(null);
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const loadPortfolio = async (userId) => {
        if (!userId || isLoadingPortfolio) {
            logger.log("Skipping portfolio load - no userId or already loading");
            return;
        }
        
        setIsLoadingPortfolio(true);
        logger.log("Loading portfolio for user:", userId);
        
        try {
            // Cargar transacciones
            const transactionsRef = collection(db, "users", userId, "transactions");
            const querySnapshot = await getDocs(transactionsRef);
            
            // Cargar cash disponible, ventas realizadas y depósitos de efectivo
            await loadAvailableCash(userId);
            await loadRealizedSales(userId);
            await loadCashDeposits(userId);
            
            if (querySnapshot.empty) {
                logger.log("No transactions found");
                setPositions([]);
                setPortfolioLoaded(true);
                setIsLoadingPortfolio(false); // Important: stop loading when no transactions
                return;
            }
            
            const transactions = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                transactions.push({ 
                    id: doc.id, 
                    ticker: data.ticker,
                    quantity: Number(data.quantity),
                    purchasePrice: Number(data.purchasePrice),
                    purchaseDate: data.purchaseDate
                });
            });

            logger.log("Loaded transactions:", transactions.length);

            // Load sales to subtract from positions
            const salesRef = collection(db, "users", userId, "sales");
            const salesSnapshot = await getDocs(salesRef);
            const salesByTicker = new Map();
            
            salesSnapshot.forEach((doc) => {
                const sale = doc.data();
                const ticker = sale.ticker;
                if (!salesByTicker.has(ticker)) {
                    salesByTicker.set(ticker, []);
                }
                salesByTicker.get(ticker).push({
                    quantity: Number(sale.quantity),
                    saleDate: sale.saleDate
                });
            });
            
            logger.log("Loaded sales for", salesByTicker.size, "tickers");

            // Group by ticker
            const positionsMap = new Map();

            transactions.forEach(tx => {
                if (!positionsMap.has(tx.ticker)) {
                    positionsMap.set(tx.ticker, {
                        ticker: tx.ticker,
                        quantity: 0,
                        totalCost: 0,
                        history: []
                    });
                }
                
                const pos = positionsMap.get(tx.ticker);
                pos.quantity += tx.quantity;
                pos.totalCost += tx.purchasePrice * tx.quantity;
                pos.history.push(tx);
            });

            // Apply sales using FIFO method
            positionsMap.forEach((pos, ticker) => {
                const sales = salesByTicker.get(ticker);
                if (sales && sales.length > 0) {
                    // Sort history by purchase date (FIFO)
                    pos.history.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
                    
                    // Sort sales by date
                    sales.sort((a, b) => new Date(a.saleDate) - new Date(b.saleDate));
                    
                    // Apply each sale
                    sales.forEach(sale => {
                        let remainingToSell = sale.quantity;
                        
                        // Deduct from transactions using FIFO
                        for (let i = 0; i < pos.history.length && remainingToSell > 0; i++) {
                            const tx = pos.history[i];
                            if (tx.quantity > 0) {
                                const quantityToDeduct = Math.min(tx.quantity, remainingToSell);
                                const costToDeduct = quantityToDeduct * tx.purchasePrice;
                                
                                tx.quantity -= quantityToDeduct;
                                pos.quantity -= quantityToDeduct;
                                pos.totalCost -= costToDeduct;
                                remainingToSell -= quantityToDeduct;
                            }
                        }
                    });
                    
                    // Remove transactions with zero quantity
                    pos.history = pos.history.filter(tx => tx.quantity > 0);
                    
                    logger.log(`Applied ${sales.length} sales to ${ticker}. Remaining quantity: ${pos.quantity}`);
                }
            });

            // Filter out positions with zero quantity and show positions immediately with purchase prices
            const initialPositions = Array.from(positionsMap.values())
                .filter(pos => pos.quantity > 0) // Only keep positions with remaining shares
                .map(pos => {
                    // Ordenar el historial por fecha de compra para encontrar la primera
                    const sortedHistory = pos.history.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
                    const firstPurchaseDate = sortedHistory.length > 0 ? sortedHistory[0].purchaseDate : new Date().toISOString();
                    
                    return {
                        ...pos,
                        avgPurchasePrice: pos.quantity > 0 ? pos.totalCost / pos.quantity : 0,
                        marketValue: null, // No market value yet - will be loaded from API
                        priceLoading: true, // Flag to show loading state
                        priceError: false, // Flag to show error state
                        firstPurchaseDate: firstPurchaseDate // Agregar fecha de primera compra
                    };
                }).sort((a, b) => new Date(a.firstPurchaseDate) - new Date(b.firstPurchaseDate)); // Ordenar por fecha de primera compra
            
            logger.log("Setting initial positions:", initialPositions.length);
            setPositions(initialPositions);
            setPortfolioLoaded(true);
            hasFetchedInitialPrices.current = false; // Reset flag al cargar nuevas posiciones
            
        } catch (error) {
            logger.error("Error loading portfolio:", error);
            setPositions([]);
            setPortfolioLoaded(true);
        } finally {
            setIsLoadingPortfolio(false);
        }
    };

    // Funciones para manejar el cash disponible
    const loadAvailableCash = async (userId) => {
        try {
            if (userId && userId !== 'guest') {
                // Cargar desde Firebase para usuarios autenticados
                const cashRef = doc(db, "users", userId, "settings", "availableCash");
                const cashDoc = await getDoc(cashRef);
                
                if (cashDoc.exists()) {
                    setAvailableCash(cashDoc.data().amount || 0);
                } else {
                    setAvailableCash(0);
                }
            } else {
                // Cargar desde localStorage para modo guest
                const savedCash = localStorage.getItem('availableCash');
                setAvailableCash(savedCash ? parseFloat(savedCash) : 0);
            }
        } catch (error) {
            logger.error("Error loading available cash:", error);
            setAvailableCash(0);
        }
    };

    const updateAvailableCash = async (newAmount) => {
        try {
            setAvailableCash(newAmount);
            
            if (user && user.uid && user.uid !== 'guest') {
                // Guardar en Firebase para usuarios autenticados
                const cashRef = doc(db, "users", user.uid, "settings", "availableCash");
                await setDoc(cashRef, { amount: newAmount }, { merge: true });
            } else {
                // Guardar en localStorage para modo guest
                localStorage.setItem('availableCash', newAmount.toString());
            }
        } catch (error) {
            logger.error("Error updating available cash:", error);
        }
    };

    const addCashDeposit = async (depositAmount) => {
        try {
            const newAmount = availableCash + depositAmount;
            await updateAvailableCash(newAmount);
            
            // Registrar el depósito en la colección cash_deposits con fecha
            const depositDate = new Date().toISOString().split('T')[0];
            const depositRecord = {
                amount: depositAmount,
                date: depositDate,
                type: depositAmount >= 0 ? 'deposit' : 'withdrawal',
                timestamp: new Date().toISOString()
            };
            
            if (user && user.uid && user.uid !== 'guest') {
                // Guardar en Firebase
                const depositRef = await addDoc(collection(db, "users", user.uid, "cash_deposits"), depositRecord);
                
                // Actualizar estado local
                setCashDeposits(prevDeposits => [
                    { id: depositRef.id, ...depositRecord },
                    ...prevDeposits
                ]);
                
                logger.log(`Cash deposit recorded: ${formatCurrency(depositAmount)} on ${depositDate}`);
            } else {
                // Para modo guest, guardar en localStorage
                const guestDeposits = JSON.parse(localStorage.getItem('cashDeposits') || '[]');
                const newDeposit = { id: Date.now().toString(), ...depositRecord };
                guestDeposits.unshift(newDeposit);
                localStorage.setItem('cashDeposits', JSON.stringify(guestDeposits));
                setCashDeposits(guestDeposits);
            }
        } catch (error) {
            logger.error("Error adding cash deposit:", error);
        }
    };

    // Load cash deposits from Firebase
    const loadCashDeposits = async (userId) => {
        if (!userId) {
            setCashDeposits([]);
            return;
        }

        try {
            if (userId === 'guest') {
                // Cargar desde localStorage para modo guest
                const guestDeposits = JSON.parse(localStorage.getItem('cashDeposits') || '[]');
                setCashDeposits(guestDeposits);
                return;
            }

            const depositsRef = collection(db, "users", userId, "cash_deposits");
            const depositsSnapshot = await getDocs(depositsRef);
            
            const deposits = [];
            depositsSnapshot.forEach((doc) => {
                const data = doc.data();
                deposits.push({
                    id: doc.id,
                    amount: Number(data.amount),
                    date: data.date,
                    type: data.type,
                    timestamp: data.timestamp
                });
            });
            
            // Ordenar por fecha descendente (más reciente primero)
            deposits.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            setCashDeposits(deposits);
            logger.log(`Loaded ${deposits.length} cash deposits`);
        } catch (error) {
            logger.error("Error loading cash deposits:", error);
            setCashDeposits([]);
        }
    };

    // Edit cash deposit
    const editCashDeposit = async (depositId, updatedData) => {
        try {
            const { amount, date, type } = updatedData;
            
            if (user && user.uid && user.uid !== 'guest') {
                // Actualizar en Firestore
                const depositRef = doc(db, "users", user.uid, "cash_deposits", depositId);
                await setDoc(depositRef, {
                    amount,
                    date,
                    type,
                    timestamp: new Date().toISOString()
                }, { merge: true });
                
                logger.log(`Cash deposit ${depositId} updated in Firestore`);
            } else {
                // Actualizar en localStorage para modo guest
                const guestDeposits = JSON.parse(localStorage.getItem('cashDeposits') || '[]');
                const updatedDeposits = guestDeposits.map(dep => 
                    dep.id === depositId 
                        ? { ...dep, amount, date, type, timestamp: new Date().toISOString() }
                        : dep
                );
                localStorage.setItem('cashDeposits', JSON.stringify(updatedDeposits));
            }
            
            // Actualizar estado local
            setCashDeposits(prevDeposits => 
                prevDeposits.map(dep => 
                    dep.id === depositId 
                        ? { ...dep, amount, date, type }
                        : dep
                ).sort((a, b) => new Date(b.date) - new Date(a.date))
            );
            
            // Recalcular el available cash basado en el historial actualizado
            await recalculateAvailableCashFromHistory();
            
        } catch (error) {
            logger.error("Error editing cash deposit:", error);
            alert("Failed to update transaction. Please try again.");
        }
    };

    // Delete cash deposit
    const deleteCashDeposit = async (depositId) => {
        try {
            if (user && user.uid && user.uid !== 'guest') {
                // Eliminar de Firestore
                const depositRef = doc(db, "users", user.uid, "cash_deposits", depositId);
                await deleteDoc(depositRef);
                
                logger.log(`Cash deposit ${depositId} deleted from Firestore`);
            } else {
                // Eliminar de localStorage para modo guest
                const guestDeposits = JSON.parse(localStorage.getItem('cashDeposits') || '[]');
                const updatedDeposits = guestDeposits.filter(dep => dep.id !== depositId);
                localStorage.setItem('cashDeposits', JSON.stringify(updatedDeposits));
            }
            
            // Actualizar estado local
            setCashDeposits(prevDeposits => 
                prevDeposits.filter(dep => dep.id !== depositId)
            );
            
            // Recalcular el available cash basado en el historial actualizado
            await recalculateAvailableCashFromHistory();
            
        } catch (error) {
            logger.error("Error deleting cash deposit:", error);
            alert("Failed to delete transaction. Please try again.");
        }
    };

    // Recalculate available cash from deposit history
    const recalculateAvailableCashFromHistory = async () => {
        try {
            // Obtener el historial actualizado de cashDeposits
            let deposits = [];
            
            if (user && user.uid && user.uid !== 'guest') {
                const depositsRef = collection(db, "users", user.uid, "cash_deposits");
                const depositsSnapshot = await getDocs(depositsRef);
                depositsSnapshot.forEach((doc) => {
                    const data = doc.data();
                    deposits.push({
                        id: doc.id,
                        amount: Number(data.amount),
                        date: data.date,
                        type: data.type
                    });
                });
            } else {
                deposits = JSON.parse(localStorage.getItem('cashDeposits') || '[]');
            }
            
            // Calcular el total sumando todos los deposits (positivos y negativos)
            const totalCash = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
            
            // Actualizar availableCash
            await updateAvailableCash(totalCash);
            
            logger.log(`Available cash recalculated: ${formatCurrency(totalCash)}`);
            
        } catch (error) {
            logger.error("Error recalculating available cash:", error);
        }
    };

    // Load realized sales from Firebase
    const loadRealizedSales = async (userId) => {
        if (!userId || userId === 'guest') {
            setRealizedSales([]);
            return;
        }

        try {
            const salesRef = collection(db, "users", userId, "sales");
            const salesSnapshot = await getDocs(salesRef);
            const sales = [];
            
            salesSnapshot.forEach((doc) => {
                const saleData = doc.to_dict();
                sales.push({
                    id: doc.id,
                    ...saleData
                });
            });
            
            // Ordenar por fecha de venta (más reciente primero)
            sales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
            
            setRealizedSales(sales);
            logger.log(`Loaded ${sales.length} realized sales`);
        } catch (error) {
            logger.error("Error loading realized sales:", error);
            setRealizedSales([]);
        }
    };

    const handleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        setIsSigningIn(true);
        try {
            const result = await signInWithPopup(auth, provider);
            setIsGuest(false);
            setIsSidebarOpen(false);

            if (result.user) {
                // Crear usuario en Firestore si no existe
                const userRef = doc(db, "users", result.user.uid);
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        email: result.user.email,
                        name: result.user.displayName || "",
                    });
                }
                loadPortfolio(result.user.uid);
            }
        } catch (error) {
            logger.error("Error signing in with Google:", error);
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleGuestSignIn = () => {
        setIsGuest(true);
        setIsSidebarOpen(false); // Close sidebar on guest sign in
        setIsLoadingPortfolio(false); // Ensure no loading state for guest
        setPortfolioLoaded(true); // Guest mode doesn't need to load from Firestore
        // Cargar cash disponible y depósitos desde localStorage para modo guest
        loadAvailableCash('guest');
        loadCashDeposits('guest');
    };

    const handleSignOut = async () => {
        try {
            logger.log("Signing out user");
            await firebaseSignOut(auth);
            setIsGuest(false); // Explicitly set guest mode to false on any sign-out
            setPositions([]); // Clear positions immediately
            setIsSidebarOpen(false); // Close sidebar on sign out
        } catch (error) {
            logger.error("Error signing out:", error);
        }
    };

    const openHistoryModal = (ticker) => {
        setSelectedTicker(ticker);
        setIsHistoryModalOpen(true);
    };

    const closeHistoryModal = () => {
        setIsHistoryModalOpen(false);
        setSelectedTicker(null);
    };

    const openEditModal = (transaction) => {
        // Cerrar el modal de historial primero
        setIsHistoryModalOpen(false);
        // Abrir el modal de edición con la transacción seleccionada
        setSelectedTransaction(transaction);
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        const ticker = selectedTransaction?.ticker;
        setSelectedTransaction(null);
        
        // Reabrir el modal de historial si había un ticker seleccionado
        if (ticker) {
            setSelectedTicker(ticker);
            setIsHistoryModalOpen(true);
        }
    };

    const addPosition = async (newPosition) => {
        logger.log("Adding position:", newPosition);
        setIsAddingPosition(true);
        
        try {
            // Close modal immediately to allow adding more positions
            closeModal();
            
            // Crear la transacción inmediatamente
            const newTransaction = {
                ...newPosition,
                id: Date.now().toString(),
                userId: user ? user.uid : 'guest'
            };

            // Primero, obtener el precio de mercado actual del backend
            logger.log(`Fetching market price for ${newPosition.ticker} from backend...`);
            let marketPrice = null;
            let quoteData = null;
            
            try {
                const response = await fetch('/api/market/quotes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([newPosition.ticker])
                });
                const data = await response.json();
                
                if (data.data && data.data.length > 0) {
                    const quote = data.data[0];
                    marketPrice = quote.lastPrice;
                    quoteData = quote;
                    logger.log(`Got market price for ${newPosition.ticker}: $${marketPrice}`);
                }
            } catch (priceError) {
                logger.warn(`Could not fetch market price for ${newPosition.ticker}:`, priceError.message);
            }

            // Si no se obtuvo precio, usar precio de compra
            if (!marketPrice || marketPrice <= 0) {
                marketPrice = newPosition.purchasePrice;
                logger.warn(`Using purchase price as fallback: $${marketPrice}`);
            }

            // Update UI with real market price
            const existingPositionIndex = positions.findIndex(p => p.ticker === newPosition.ticker);

            if (existingPositionIndex > -1) {
                // Actualizar posición existente
                const updatedPositions = [...positions];
                const existingPosition = updatedPositions[existingPositionIndex];
                
                const newHistory = [...existingPosition.history, newTransaction];
                const newQuantity = existingPosition.quantity + newPosition.quantity;
                const newTotalCost = existingPosition.totalCost + (newPosition.purchasePrice * newPosition.quantity);

                // Recalcular la fecha de primera compra
                const sortedHistory = newHistory.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
                const firstPurchaseDate = sortedHistory[0].purchaseDate;

                existingPosition.history = newHistory;
                existingPosition.quantity = newQuantity;
                existingPosition.totalCost = newTotalCost;
                existingPosition.avgPurchasePrice = newTotalCost / newQuantity;
                existingPosition.marketValue = marketPrice;
                existingPosition.firstPurchaseDate = firstPurchaseDate;
                
                // Agregar datos adicionales si están disponibles
                if (quoteData) {
                    existingPosition.lastUpdate = quoteData.lastUpdate;
                    existingPosition.dailyChange = quoteData.change;
                    existingPosition.dailyChangePercent = quoteData.changePercent;
                    existingPosition.volume = quoteData.volume;
                    existingPosition.high = quoteData.high;
                    existingPosition.low = quoteData.low;
                    existingPosition.open = quoteData.open;
                }

                // Reordenar todas las posiciones por fecha de primera compra
                updatedPositions.sort((a, b) => new Date(a.firstPurchaseDate) - new Date(b.firstPurchaseDate));
                
                setPositions(updatedPositions);
                logger.log("Updated existing position:", existingPosition);
            } else {
                // Agregar nueva posición con precio de mercado real
                const purchaseDate = newPosition.purchaseDate || new Date().toISOString().split('T')[0];
                const positionToAdd = {
                    ticker: newPosition.ticker,
                    quantity: newPosition.quantity,
                    totalCost: newPosition.purchasePrice * newPosition.quantity,
                    avgPurchasePrice: newPosition.purchasePrice,
                    marketValue: marketPrice,
                    history: [newTransaction],
                    firstPurchaseDate: purchaseDate
                };
                
                // Agregar datos adicionales si están disponibles
                if (quoteData) {
                    positionToAdd.lastUpdate = quoteData.lastUpdate;
                    positionToAdd.dailyChange = quoteData.change;
                    positionToAdd.dailyChangePercent = quoteData.changePercent;
                    positionToAdd.volume = quoteData.volume;
                    positionToAdd.high = quoteData.high;
                    positionToAdd.low = quoteData.low;
                    positionToAdd.open = quoteData.open;
                }
                
                setPositions(prevPositions => {
                    const newPositions = [...prevPositions, positionToAdd];
                    // Ordenar por fecha de primera compra (más antigua primero)
                    newPositions.sort((a, b) => new Date(a.firstPurchaseDate) - new Date(b.firstPurchaseDate));
                    logger.log("New positions array:", newPositions);
                    return newPositions;
                });
                logger.log("Added new position:", positionToAdd);
            }

            // Reducir cash disponible automáticamente
            const investmentAmount = newPosition.purchasePrice * newPosition.quantity;
            const newCashAmount = Math.max(0, availableCash - investmentAmount);
            await updateAvailableCash(newCashAmount);
            logger.log(`Reduced available cash by ${formatCurrency(investmentAmount)}. New balance: ${formatCurrency(newCashAmount)}`);

            // Save to Firestore in background (don't block UI)
            if (user && user.uid) {
                try {
                    logger.log("Saving to Firestore in background...");
                    
                    // Validate data before saving
                    if (!newTransaction.ticker || !newTransaction.quantity || !newTransaction.purchasePrice) {
                        throw new Error("Invalid transaction data");
                    }
                    
                    const docRef = await addDoc(collection(db, "users", user.uid, "transactions"), {
                        ticker: String(newTransaction.ticker).toUpperCase(),
                        quantity: Number(newTransaction.quantity),
                        purchasePrice: Number(newTransaction.purchasePrice),
                        purchaseDate: newTransaction.purchaseDate || new Date().toISOString().split('T')[0]
                    });
                    logger.log("Successfully saved to Firestore with ID:", docRef.id);
                    
                } catch (firestoreError) {
                    logger.error("Error saving to Firestore:", firestoreError);
                    // Show error but don't block the UI
                }
            } else {
                logger.log("User not logged in, position saved only locally");
            }

            // Reset loading state
            setIsAddingPosition(false);

        } catch (error) {
            logger.error("Error adding position:", error);
            alert(`Failed to add position: ${error.message}`);
            setIsAddingPosition(false); // Reset loading state on error
        }
    };

    // Sell Position Function
    const sellPosition = async (sellData) => {
        logger.log("Selling position:", sellData);
        
        try {
            const { ticker, quantity, price, type } = sellData;
            
            // Find the position to sell
            const positionIndex = positions.findIndex(p => p.ticker === ticker);
            if (positionIndex === -1) {
                throw new Error("Position not found");
            }
            
            const position = positions[positionIndex];
            if (position.quantity < quantity) {
                throw new Error("Cannot sell more shares than owned");
            }
            
            // Create sale transaction for realized gains tracking
            const saleTransaction = {
                ticker,
                quantity,
                salePrice: price,
                saleDate: new Date().toISOString().split('T')[0],
                type,
                id: Date.now().toString(),
                userId: user ? user.uid : 'guest'
            };
            
            // Calculate realized gain/loss using FIFO method
            let remainingQuantityToSell = quantity;
            let totalCostBasis = 0;
            let updatedHistory = [...position.history];
            
            // Process sales using FIFO (First In, First Out)
            for (let i = 0; i < updatedHistory.length && remainingQuantityToSell > 0; i++) {
                const transaction = updatedHistory[i];
                if (transaction.quantity > 0) {
                    const quantityToTakeFromTransaction = Math.min(transaction.quantity, remainingQuantityToSell);
                    totalCostBasis += quantityToTakeFromTransaction * transaction.purchasePrice;
                    transaction.quantity -= quantityToTakeFromTransaction;
                    remainingQuantityToSell -= quantityToTakeFromTransaction;
                }
            }
            
            // Remove transactions with zero quantity
            updatedHistory = updatedHistory.filter(t => t.quantity > 0);
            
            // Calculate realized gain/loss
            const proceeds = quantity * price;
            const realizedGainLoss = proceeds - totalCostBasis;
            
            // Update position or remove if fully sold
            const updatedPositions = [...positions];
            const newQuantity = position.quantity - quantity;
            
            if (newQuantity === 0) {
                // Remove position completely
                updatedPositions.splice(positionIndex, 1);
            } else {
                // Update position
                const newTotalCost = position.totalCost - totalCostBasis;
                updatedPositions[positionIndex] = {
                    ...position,
                    quantity: newQuantity,
                    totalCost: newTotalCost,
                    avgPurchasePrice: newTotalCost / newQuantity,
                    history: updatedHistory
                };
            }
            
            setPositions(updatedPositions);
            
            // Add proceeds to available cash
            const newCashAmount = availableCash + proceeds;
            await updateAvailableCash(newCashAmount);
            logger.log(`Added ${formatCurrency(proceeds)} to available cash. New balance: ${formatCurrency(newCashAmount)}`);
            
            // Save sale transaction to Firestore for realized gains tracking
            if (user && user.uid) {
                try {
                    const saleDoc = await addDoc(collection(db, "users", user.uid, "sales"), {
                        ticker: String(ticker).toUpperCase(),
                        quantity: Number(quantity),
                        salePrice: Number(price),
                        saleDate: saleTransaction.saleDate,
                        proceeds: Number(proceeds),
                        costBasis: Number(totalCostBasis),
                        realizedGainLoss: Number(realizedGainLoss),
                        type: String(type)
                    });
                    
                    // Actualizar el estado local de ventas realizadas
                    const newSale = {
                        id: saleDoc.id,
                        ticker: String(ticker).toUpperCase(),
                        quantity: Number(quantity),
                        salePrice: Number(price),
                        saleDate: saleTransaction.saleDate,
                        proceeds: Number(proceeds),
                        costBasis: Number(totalCostBasis),
                        realizedGainLoss: Number(realizedGainLoss),
                        type: String(type)
                    };
                    
                    setRealizedSales(prevSales => [newSale, ...prevSales]);
                    logger.log("Sale transaction saved to Firestore and state updated");
                } catch (firestoreError) {
                    logger.error("Error saving sale to Firestore:", firestoreError);
                }
            }
            
            logger.log(`Successfully sold ${quantity} shares of ${ticker} for ${formatCurrency(proceeds)}`);
            logger.log(`Realized ${realizedGainLoss >= 0 ? 'gain' : 'loss'}: ${formatCurrency(realizedGainLoss)}`);
            
        } catch (error) {
            logger.error("Error selling position:", error);
            throw error; // Re-throw to let the modal handle the error
        }
    };

    // Helper function to fetch market price in background using FMP API
    const fetchMarketPriceInBackground = async (ticker) => {
        try {
            if (!fmpService.isConfigured()) {
                logger.warn('FMP API not configured. Please set your API key.');
                return;
            }

            const quote = await fmpService.getQuote(ticker);
            
            if (quote && quote.lastPrice > 0) {
                // Update the position with real market value
                setPositions(prevPositions => 
                    prevPositions.map(pos => 
                        pos.ticker === ticker 
                            ? { 
                                ...pos, 
                                marketValue: quote.lastPrice,
                                lastUpdate: quote.lastUpdate,
                                dailyChange: quote.change,
                                dailyChangePercent: quote.changePercent,
                                volume: quote.volume,
                                high: quote.high,
                                low: quote.low,
                                open: quote.open
                            }
                            : pos
                    )
                );
                
                logger.log(`Updated market value for ${ticker}: $${quote.lastPrice} (FMP)`);
            }
            
        } catch (error) {
            logger.log(`Could not fetch market price for ${ticker} from FMP:`, error.message);
        }
    };

    // NEW: Unified function to fetch market prices with Yahoo Finance + FMP fallback
    const fetchAllMarketPrices = async (retryCount = 0, isManualAction = false) => {
        if (positions.length === 0) return;
        
        setIsRefreshing(true);
        const tickers = [...new Set(positions.map(pos => pos.ticker))];
        
        // Set all tickers as loading
        setLoadingTickers(new Set(tickers));
        setErrorTickers(new Set());
        
        try {
            logger.log('🔄 Starting backend price fetch...');

            // Call backend directly (using Finnhub/yfinance with cache)
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 60000)
            );
            
            // Get quotes from backend
            const quotesPromise = fetch('/api/market/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tickers)
            }).then(res => res.json()).then(data => data.data || []);
            
            const quotes = await Promise.race([quotesPromise, timeoutPromise]);
            
            // Fetch company profiles (logos) from Finnhub via backend
            const profilesPromise = fetch('/api/market/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tickers)
            }).then(res => res.json()).then(data => data.data || []);
            
            const profiles = await Promise.race([profilesPromise, timeoutPromise]);

            // Update ticker logos from profiles
            if (profiles && profiles.length > 0) {
                const logos = {};
                profiles.forEach(profile => {
                    if (profile && profile.symbol && profile.logo) {
                        logos[profile.symbol] = profile.logo;
                    }
                });
                setTickerLogos(logos);
                console.log(`📸 Loaded ${Object.keys(logos).length} company logos`);
            }
            
            if (quotes && quotes.length > 0) {
                // Create a map of ticker to quote data
                const quotesMap = {};
                const successfulTickers = new Set();
                const failedTickers = new Set();
                
                quotes.forEach(quote => {
                    if (quote && quote.ticker && quote.lastPrice > 0) {
                        quotesMap[quote.ticker.toUpperCase()] = quote;
                        successfulTickers.add(quote.ticker.toUpperCase());
                    }
                });
                
                // Identify failed tickers
                tickers.forEach(ticker => {
                    if (!successfulTickers.has(ticker.toUpperCase())) {
                        failedTickers.add(ticker.toUpperCase());
                    }
                });
                
                // Update positions
                setPositions(prevPositions => 
                    prevPositions.map(pos => {
                        const quote = quotesMap[pos.ticker.toUpperCase()];
                        if (quote && quote.lastPrice > 0) {
                            return {
                                ...pos,
                                marketValue: quote.lastPrice,
                                lastUpdate: quote.lastUpdate,
                                dailyChange: quote.change,
                                dailyChangePercent: quote.changePercent,
                                volume: quote.volume,
                                high: quote.high,
                                low: quote.low,
                                open: quote.open,
                                priceError: false,
                                priceLoading: false
                            };
                        } else {
                            return {
                                ...pos,
                                priceError: true,
                                priceLoading: false
                            };
                        }
                    })
                );
                
                // Update loading and error states
                setLoadingTickers(new Set());
                setErrorTickers(failedTickers);
                setLastUpdateTime(new Date());
                
                logger.log(`✅ Updated ${quotes.length} positions with real-time data from backend`);
                
                if (isManualAction) {
                    const successCount = successfulTickers.size;
                    const totalCount = tickers.length;
                    
                    if (successCount === totalCount) {
                        setNotification(`✅ All ${totalCount} prices updated successfully!`);
                    } else if (successCount > 0) {
                        setNotification(`⚠️ ${successCount}/${totalCount} prices updated. Some failed to load.`);
                    } else {
                        setNotification('❌ Failed to update prices. Please try again.');
                    }
                }
                
                // Update last refresh timestamp
                setLastRefreshTime(new Date());
                
            } else {
                throw new Error('No quotes received from API');
            }
            
        } catch (error) {
            logger.error('❌ Backend price fetch failed:', error);
            
            // Set all tickers as error state
            setErrorTickers(new Set(tickers));
            setLoadingTickers(new Set());
            
            if (isManualAction) {
                setNotification('❌ Failed to update prices. Please try again.');
            }
            
            // Retry logic for network errors
            if (retryCount < 2 && (error.message.includes('timeout') || error.message.includes('network'))) {
                logger.log(`Retrying bulk fetch (attempt ${retryCount + 1}/3)...`);
                setTimeout(() => {
                    fetchAllMarketPrices(retryCount + 1, isManualAction);
                }, 5000);
            }
            
        } finally {
            setIsRefreshing(false);
            setLoadingTickers(new Set());
        }
    };

    // Function to fetch individual prices for failed tickers
    const fetchIndividualPrices = async (failedTickers) => {
        if (failedTickers.length === 0) return;
        
        setLoadingTickers(new Set(failedTickers));
        
        for (const ticker of failedTickers) {
            try {
                const quote = await fmpService.getQuote(ticker);
                
                if (quote && quote.lastPrice > 0) {
                    setPositions(prevPositions => 
                        prevPositions.map(pos => {
                            if (pos.ticker.toUpperCase() === ticker.toUpperCase()) {
                                return {
                                    ...pos,
                                    marketValue: quote.lastPrice,
                                    lastUpdate: quote.lastUpdate,
                                    dailyChange: quote.change,
                                    dailyChangePercent: quote.changePercent,
                                    volume: quote.volume,
                                    high: quote.high,
                                    low: quote.low,
                                    open: quote.open,
                                    priceError: false,
                                    priceLoading: false
                                };
                            }
                            return pos;
                        })
                    );
                    
                    // Remove from loading and error states
                    setLoadingTickers(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(ticker);
                        return newSet;
                    });
                    
                    setErrorTickers(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(ticker);
                        return newSet;
                    });
                    
                    logger.log(`Successfully updated individual price for ${ticker}`);
                }
            } catch (error) {
                logger.error(`Error fetching individual price for ${ticker}:`, error);
                
                // Remove from loading but keep in error state
                setLoadingTickers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(ticker);
                    return newSet;
                });
            }
        }
    };

    const handleSaveTransaction = async (updatedTransaction) => {
        if (!user) return;
        
        try {
            // 1. ACTUALIZACIÓN OPTIMISTA INMEDIATA
            // Actualizar el estado local inmediatamente para respuesta instantánea
            setPositions(prevPositions => {
                return prevPositions.map(position => {
                    if (position.ticker === updatedTransaction.ticker) {
                        // Actualizar la transacción en el historial
                        const updatedHistory = position.history.map(tx => 
                            tx.id === updatedTransaction.id ? updatedTransaction : tx
                        );
                        
                        // Recalcular totales con la transacción actualizada
                        const newTotalCost = updatedHistory.reduce((sum, tx) => sum + (tx.purchasePrice * tx.quantity), 0);
                        const newQuantity = updatedHistory.reduce((sum, tx) => sum + tx.quantity, 0);
                        const newAvgPurchasePrice = newTotalCost / newQuantity;
                        
                        // Encontrar la fecha de primera compra
                        const sortedHistory = updatedHistory.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
                        const firstPurchaseDate = sortedHistory[0]?.purchaseDate;
                        
                        return {
                            ...position,
                            history: updatedHistory,
                            totalCost: newTotalCost,
                            quantity: newQuantity,
                            avgPurchasePrice: newAvgPurchasePrice,
                            firstPurchaseDate: firstPurchaseDate
                        };
                    }
                    return position;
                }).sort((a, b) => new Date(a.firstPurchaseDate) - new Date(b.firstPurchaseDate)); // Mantener orden por fecha
            });
            
            // 2. CERRAR MODAL Y MOSTRAR CAMBIOS INMEDIATAMENTE
            setIsEditModalOpen(false);
            setSelectedTransaction(null);
            
            // Reabrir el modal de historial inmediatamente con datos actualizados
            if (updatedTransaction.ticker) {
                setSelectedTicker(updatedTransaction.ticker);
                setIsHistoryModalOpen(true);
            }
            
            // 3. SINCRONIZAR CON FIRESTORE EN SEGUNDO PLANO
            // Esto se ejecuta sin bloquear la UI
            const batch = writeBatch(db);
            const docRef = doc(db, "users", user.uid, "transactions", updatedTransaction.id);
            batch.update(docRef, updatedTransaction);
            await batch.commit();
            
            logger.log("Transaction updated successfully in Firestore");
            
        } catch (error) {
            logger.error("Error updating transaction:", error);
            // En caso de error, revertir cambios recargando desde Firestore
            if (user && user.uid) {
                await loadPortfolio(user.uid);
            }
        }
    };

    const handleDeleteTransaction = (transactionId) => {
        // Encontrar la transacción para mostrar información en el modal de confirmación
        let transactionInfo = null;
        for (const position of positions) {
            const transaction = position.history?.find(tx => tx.id === transactionId);
            if (transaction) {
                transactionInfo = transaction;
                break;
            }
        }

        if (!transactionInfo) {
            logger.error("Transaction not found");
            return;
        }

        // Configurar el modal de confirmación
        setTransactionToDelete(transactionId);
        setConfirmModalData({
            title: "Delete Transaction",
            message: `Are you sure you want to delete this transaction?<br><br><strong>${transactionInfo.ticker}: ${transactionInfo.quantity} shares at ${formatCurrency(transactionInfo.purchasePrice)} on ${transactionInfo.purchaseDate}</strong><br><br>This action cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            confirmType: "danger"
        });
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteTransaction = async () => {
        if (!transactionToDelete) return;

        try {
            // 1. ELIMINACIÓN OPTIMISTA INMEDIATA
            // Actualizar el estado local inmediatamente para respuesta instantánea
            setPositions(prevPositions => {
                return prevPositions.map(position => {
                    // Encontrar la posición que contiene la transacción a eliminar
                    const transactionIndex = position.history?.findIndex(tx => tx.id === transactionToDelete);
                    
                    if (transactionIndex !== -1) {
                        // Eliminar la transacción del historial
                        const updatedHistory = position.history.filter(tx => tx.id !== transactionToDelete);
                        
                        // Si no quedan transacciones, eliminar toda la posición
                        if (updatedHistory.length === 0) {
                            return null; // Marcar para eliminación
                        }
                        
                        // Recalcular totales sin la transacción eliminada
                        const newTotalCost = updatedHistory.reduce((sum, tx) => sum + (tx.purchasePrice * tx.quantity), 0);
                        const newQuantity = updatedHistory.reduce((sum, tx) => sum + tx.quantity, 0);
                        const newAvgPurchasePrice = newTotalCost / newQuantity;
                        
                        // Encontrar la nueva fecha de primera compra
                        const sortedHistory = updatedHistory.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
                        const firstPurchaseDate = sortedHistory[0]?.purchaseDate;
                        
                        return {
                            ...position,
                            history: updatedHistory,
                            totalCost: newTotalCost,
                            quantity: newQuantity,
                            avgPurchasePrice: newAvgPurchasePrice,
                            firstPurchaseDate: firstPurchaseDate
                        };
                    }
                    return position;
                }).filter(position => position !== null) // Eliminar posiciones marcadas como null
                .sort((a, b) => new Date(a.firstPurchaseDate) - new Date(b.firstPurchaseDate)); // Mantener orden por fecha
            });
            
            // 2. CERRAR MODALES INMEDIATAMENTE
            setIsConfirmModalOpen(false);
            setTransactionToDelete(null);
            
            // Si había un modal de historial abierto, cerrarlo también
            setIsHistoryModalOpen(false);
            setSelectedTicker(null);
            
            // 3. SINCRONIZAR CON FIRESTORE EN SEGUNDO PLANO
            if (user && user.uid) {
                // Eliminar de Firestore sin bloquear la UI
                await deleteDoc(doc(db, "users", user.uid, "transactions", transactionToDelete));
                logger.log("Transaction deleted successfully from Firestore");
            } else {
                // Para modo guest, ya se eliminó del estado local
                logger.log("Guest mode: transaction deleted from local state");
            }
            
        } catch (error) {
            logger.error("Error deleting transaction:", error);
            // En caso de error, revertir cambios recargando desde Firestore
            if (user && user.uid) {
                await loadPortfolio(user.uid);
            }
        }
    };

    const handleRefresh = async () => {
        if (isRefreshing) return;
        
        setIsRefreshing(true);
        try {
            if (user) {
                // For authenticated users, reload from Firestore and then fetch market prices
                await loadPortfolio(user.uid);
                // After loading portfolio, fetch prices with manual flag
                await fetchAllMarketPrices(0, true);
            } else {
                // For guest users, just refresh market prices
                await fetchAllMarketPrices(0, true);
            }
        } catch (error) {
            logger.error("Error refreshing portfolio:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        logger.log("Setting up auth listener");
        let isMounted = true;
        
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!isMounted) return;
            
            logger.log("Auth state changed:", currentUser ? "User logged in" : "No user");
            
            setUser(currentUser);
            setLoading(false); // Set loading to false once auth state is determined
            
            if (currentUser) {
                logger.log("User signed in:", currentUser.email);
                setIsGuest(false);
                // Load portfolio asynchronously without blocking UI
                if (!portfolioLoaded) {
                    // Don't await - let it load in background
                    loadPortfolio(currentUser.uid).catch(error => {
                        logger.error("Background portfolio load failed:", error);
                        setIsLoadingPortfolio(false); // Ensure loading stops on error
                    });
                } else {
                    // Portfolio already loaded, make sure loading state is false
                    setIsLoadingPortfolio(false);
                }
            } else {
                logger.log("User signed out, clearing all data");
                setPositions([]);
                setAvailableCash(0); // Reset available cash
                setIsGuest(false);
                setPortfolioLoaded(false);
                setIsLoadingPortfolio(false); // Reset loading state on sign out
            }
        });
        
        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []); // NO dependencies to avoid circular calls

    // Hacer disponibles las funciones de prueba XIRR en el navegador
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.runXIRRTests = runXIRRTests;
            window.calculatePortfolioXIRR = calculatePortfolioXIRR;
            
            // Función de prueba simple
            window.testXIRR = () => {
                logger.log('🧪 Prueba rápida XIRR:');
                const depositos = [
                    { date: "2023-01-01", amount: 10000 },
                    { date: "2023-06-01", amount: 5000 }
                ];
                const valorActual = 18000;
                const resultado = calculatePortfolioXIRR(depositos, valorActual);
                logger.log(`📊 Depósitos: $10,000 (Ene 2023) + $5,000 (Jun 2023)`);
                logger.log(`💰 Valor actual: $18,000`);
                logger.log(`📈 XIRR: ${resultado}% anual`);
                return resultado;
            };
            
            logger.log('🔬 Funciones XIRR disponibles:');
            logger.log('  - testXIRR(): Prueba rápida con datos de ejemplo');
            logger.log('  - runXIRRTests(): Ejecuta pruebas completas');
            logger.log('  - calculatePortfolioXIRR(deposits, currentValue): Calcula XIRR directamente');
        }
    }, []);

    useEffect(() => {
        const calculatePortfolioStats = () => {
            // Calcular el total invertido en ACCIONES (todas las compras de acciones)
            const totalInvestedInStocks = positions.reduce((acc, pos) => {
                let positionTotal = 0;
                if (pos.history && pos.history.length > 0) {
                    pos.history.forEach(transaction => {
                        positionTotal += transaction.purchasePrice * transaction.quantity;
                    });
                } else {
                    positionTotal = pos.avgPurchasePrice * pos.quantity;
                }
                if (pos.additionalTransactions && pos.additionalTransactions.length > 0) {
                    pos.additionalTransactions.forEach(transaction => {
                        positionTotal += (transaction.purchasePrice || transaction.price) * transaction.quantity;
                    });
                }
                return acc + positionTotal;
            }, 0);

            // TOTAL INVERTIDO = Dinero invertido en acciones + Efectivo disponible
            // Esto representa todo el capital que has aportado al portfolio
            const totalInvested = totalInvestedInStocks + availableCash;

            // Buscar posiciones con valor de mercado
            const positionsWithMarketValue = positions.filter(pos => pos.marketValue !== null && pos.marketValue !== undefined);

            let stocksValue = 0; // Valor solo de las acciones
            let totalValue = 0;  // Valor total incluyendo available cash
            let totalPL = 0;
            let dailyPL = 0;
            let dailyPLPercent = 0;
            let totalReturn = 0;
            let annualizedReturn = 0;
            let hasMarketData = false;

            if (positionsWithMarketValue.length > 0) {
                hasMarketData = true;
                stocksValue = positionsWithMarketValue.reduce((acc, pos) => acc + (pos.marketValue * pos.quantity), 0);
                dailyPL = positionsWithMarketValue.reduce((acc, pos) => acc + ((pos.dailyChange || 0) * pos.quantity), 0);
                
                const previousDayValue = stocksValue - dailyPL;
                if (previousDayValue !== 0) {
                    dailyPLPercent = (dailyPL / previousDayValue) * 100;
                }

                // Valor total del portfolio (acciones + efectivo)
                totalValue = stocksValue + availableCash;

                // P/L TOTAL = Valor total actual - Total invertido
                // Esto muestra cuánto has ganado o perdido considerando TODO tu capital
                if (totalInvested > 0) {
                    totalPL = totalValue - totalInvested;
                    totalReturn = (totalPL / totalInvested) * 100;
                }

                // Calcular XIRR con TODAS las transacciones (acciones + depósitos de efectivo)
                // Preparar flujos de efectivo: todas las inversiones son flujos negativos
                const cashFlows = [];
                
                // 1. Agregar todas las transacciones de compra de acciones (flujos negativos)
                positions.forEach(p => {
                    if (p.history && p.history.length > 0) {
                        p.history.forEach(t => {
                            cashFlows.push({
                                amount: -(t.purchasePrice * t.quantity), // NEGATIVO: dinero que salió
                                date: t.purchaseDate
                            });
                        });
                    }
                });

                // 2. Agregar todos los depósitos/retiros de efectivo con sus fechas
                if (cashDeposits && cashDeposits.length > 0) {
                    cashDeposits.forEach(deposit => {
                        // Los depósitos son negativos (dinero que entra al portfolio)
                        // Los retiros son positivos (dinero que sale del portfolio)
                        const flowAmount = deposit.type === 'deposit' ? -Math.abs(deposit.amount) : Math.abs(deposit.amount);
                        cashFlows.push({
                            amount: flowAmount,
                            date: deposit.date
                        });
                    });
                }

                // Debug: Log de flujos de efectivo
                console.log('📊 XIRR Calculation Debug:');
                console.log('Cash Flows:', cashFlows);
                console.log('Total Value (current):', totalValue);
                console.log('Number of flows:', cashFlows.length);

                if (cashFlows.length > 0) {
                    // El valor actual para XIRR debe ser el valor TOTAL (acciones + cash)
                    try {
                        annualizedReturn = calculatePortfolioXIRR(cashFlows, totalValue);
                        console.log('✅ XIRR Result:', annualizedReturn);
                    } catch (error) {
                        console.error('❌ Error calculating XIRR:', error);
                        annualizedReturn = null;
                    }
                }

            } else {
                // Si no hay posiciones o no hay precios de mercado
                if (positions.length > 0) {
                    stocksValue = totalInvestedInStocks;
                } else {
                    stocksValue = 0;
                }
                totalValue = stocksValue + availableCash;
                totalPL = 0;
                totalReturn = 0;
                hasMarketData = false;
            }

            setPortfolioStats({
                totalValue,
                totalInvested,
                totalPL,
                dailyPL,
                dailyPLPercent,
                totalReturn,
                annualizedReturn,
                hasMarketData
            });
        };

        if ((user || isGuest)) {
            calculatePortfolioStats();
        }
    }, [positions, user, isGuest, availableCash, cashDeposits]);

    // Auto-refresh market prices every 30 seconds when portfolio is loaded
    // Fetch inicial de precios de mercado solo una vez tras cargar posiciones
    useEffect(() => {
        if (positions.length > 0 && portfolioLoaded && !hasFetchedInitialPrices.current) {
            fetchAllMarketPrices();
            hasFetchedInitialPrices.current = true;
        }
    }, [positions.length, portfolioLoaded]);

    // Auto-refresh cada 30 minutos SOLO si ya se hizo el fetch inicial
    useEffect(() => {
        let intervalId;
        if (positions.length > 0 && portfolioLoaded && hasFetchedInitialPrices.current) {
            intervalId = setInterval(() => {
                fetchAllMarketPrices();
            }, 1800000); // 30 minutos = 30 * 60 * 1000 = 1,800,000 ms
            logger.log('Auto-refresh enabled for market prices (30 min interval)');
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
                logger.log('Auto-refresh disabled');
            }
        };
    }, [positions.length, portfolioLoaded]);

    // Calculate top gainer and top loser
    const getTopGainerAndLoser = () => {
        // Only consider positions with loaded market values
        const positionsWithMarketValues = positions.filter(pos => pos.marketValue !== null && pos.marketValue !== undefined);
        
        if (positionsWithMarketValues.length === 0) {
            return { topGainer: null, topLoser: null };
        }

        const positionsWithPerformance = positionsWithMarketValues.map(position => {
            const currentValue = position.marketValue * position.quantity;
            const investedValue = position.avgPurchasePrice * position.quantity;
            const absoluteGain = currentValue - investedValue;
            const percentageGain = investedValue > 0 ? (absoluteGain / investedValue) * 100 : 0;
            
            return {
                ...position,
                absoluteGain,
                percentageGain,
                currentValue,
                investedValue
            };
        });

        // Si solo hay una posición, será tanto el gainer como el loser
        if (positionsWithPerformance.length === 1) {
            const singlePosition = positionsWithPerformance[0];
            return { 
                topGainer: singlePosition.absoluteGain >= 0 ? singlePosition : null,
                topLoser: singlePosition.absoluteGain < 0 ? singlePosition : null
            };
        }

        const topGainer = positionsWithPerformance.reduce((max, pos) => 
            pos.absoluteGain > max.absoluteGain ? pos : max
        );

        const topLoser = positionsWithPerformance.reduce((min, pos) => 
            pos.absoluteGain < min.absoluteGain ? pos : min
        );

        // Evitar mostrar la misma posición en ambos lados si todas tienen el mismo performance
        if (topGainer.ticker === topLoser.ticker && positionsWithPerformance.length > 1) {
            const sortedByGain = [...positionsWithPerformance].sort((a, b) => b.absoluteGain - a.absoluteGain);
            return {
                topGainer: sortedByGain[0],
                topLoser: sortedByGain[sortedByGain.length - 1]
            };
        }

        return { topGainer, topLoser };
    };

    // Enhanced tooltip positioning logic - Simplificado
    useEffect(() => {
        const tooltipContainers = document.querySelectorAll('.tooltip-container');
        
        tooltipContainers.forEach(container => {
            const tooltip = container.querySelector('.tooltip');
            const icon = container.querySelector('.info-icon');
            
            if (!tooltip || !icon) return;
            
            // Limpiar eventos previos
            const newIcon = icon.cloneNode(true);
            icon.parentNode.replaceChild(newIcon, icon);
            
            const handleMouseEnter = () => {
                logger.log('Tooltip mouse enter'); // Debug
                tooltip.style.opacity = '1';
                tooltip.style.visibility = 'visible';
                tooltip.style.transform = 'translateX(-50%) scale(1)';
            };
            
            const handleMouseLeave = () => {
                logger.log('Tooltip mouse leave'); // Debug
                tooltip.style.opacity = '0';
                tooltip.style.visibility = 'hidden';
                tooltip.style.transform = 'translateX(-50%) scale(0.95)';
            };
            
            // Solo usar eventos de mouse
            newIcon.addEventListener('mouseenter', handleMouseEnter);
            newIcon.addEventListener('mouseleave', handleMouseLeave);
        });
    }, [portfolioStats]);

    // Clear notification after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Show loading while checking auth state
    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="loading-content">
                    <div className="loading-spinner large"></div>
                    <h3>Financial Portfolio</h3>
                    <p>Initializing your investment dashboard</p>
                    <div className="loading-dots">
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!user && !isGuest) {
        return <LoginScreen onGoogleSignIn={handleSignIn} onGuestSignIn={handleGuestSignIn} isSigningIn={isSigningIn} />;
    }

    return (
        <>
            <div className="container">
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    onClose={toggleSidebar} 
                    user={user} 
                    isGuest={isGuest}
                    onSignIn={handleSignIn} 
                    onSignOut={handleSignOut} 
                />
                <header>
                    <div className="title">
                        <h1>My <span>Financial</span> Portfolio</h1>
                        <p>Track your investments with confidence</p>
                    </div>
                    <div className="header-actions">
                        <button className={`profile-btn ${!user ? 'no-user' : ''}`} onClick={toggleSidebar}>
                            {user ? (
                                <img 
                                    src={user.photoURL} 
                                    alt="Profile" 
                                    onError={(e) => {
                                        logger.log('Profile photo failed to load:', user.photoURL);
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                            ) : (
                                <FontAwesomeIcon icon={faUserCircle} size="2x" />
                            )}
                            {user && (
                                <FontAwesomeIcon 
                                    icon={faUserCircle} 
                                    size="2x" 
                                    style={{ display: 'none' }}
                                />
                            )}
                        </button>
                        <div className="action-row">
                            {/* Only show Add Position button if NOT on watchlist or realized page */}
                            {location.pathname !== '/watchlist' && location.pathname !== '/realized' && (
                                <button 
                                    className={`add-position-btn ${isAddingPosition ? 'loading' : ''}`}
                                    onClick={openModal}
                                    disabled={isAddingPosition}
                                >
                                    {isAddingPosition ? (
                                        <>
                                            <div className="loading-spinner small"></div>
                                            <span>Adding...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faPlus} />
                                            <span>Add Position</span>
                                        </>
                                    )}
                                </button>
                            )}
                            
                            {user && location.pathname !== '/realized' && (
                                <span 
                                    className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`}
                                    onClick={handleRefresh}
                                    title="Refresh Portfolio"
                                >
                                    {isRefreshing ? (
                                        <div className="loading-spinner small"></div>
                                    ) : (
                                        <FontAwesomeIcon icon={faSync} />
                                    )}
                                </span>
                            )}
                        </div>
                    </div>
                </header>

                <div className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                    <main>
                        <Routes>
                            <Route path="/" element={
                                <Dashboard 
                                    positions={positions}
                                    portfolioStats={portfolioStats}
                                    chartTimePeriod={chartTimePeriod}
                                    setChartTimePeriod={setChartTimePeriod}
                                    isLoadingPortfolio={isLoadingPortfolio}
                                    isGuest={isGuest}
                                    formatCurrency={formatCurrency}
                                    getTopGainerAndLoser={getTopGainerAndLoser}
                                    openModal={openModal}
                                    openHistoryModal={openHistoryModal}
                                    onSellPosition={openSellModal}
                                    loadingTickers={loadingTickers}
                                    errorTickers={errorTickers}
                                    tickerLogos={tickerLogos}
                                    totalInvested={portfolioStats.totalInvested}
                                    totalValue={portfolioStats.totalValue}
                                    availableCash={availableCash}
                                    updateAvailableCash={updateAvailableCash}
                                    addCashDeposit={addCashDeposit}
                                    cashDeposits={cashDeposits}
                                    editCashDeposit={editCashDeposit}
                                    deleteCashDeposit={deleteCashDeposit}
                                />
                            } />
                            <Route path="/stocks" element={
                                <Stocks 
                                    positions={positions}
                                    portfolioStats={portfolioStats}
                                    formatCurrency={formatCurrency}
                                    openHistoryModal={openHistoryModal}
                                    openModal={openModal}
                                    loadingTickers={loadingTickers}
                                    errorTickers={errorTickers}
                                    tickerLogos={tickerLogos}
                                />
                            } />
                            <Route path="/watchlist" element={
                                <Watchlist 
                                    formatCurrency={formatCurrency}
                                    isGuest={isGuest}
                                />
                            } />
                            <Route path="/realized" element={
                                <Realized 
                                    formatCurrency={formatCurrency}
                                    isGuest={isGuest}
                                    realizedSales={realizedSales}
                                    user={user}
                                    tickerLogos={tickerLogos}
                                />
                            } />
                        </Routes>
                    </main>
                </div>

                <AddPositionModal isOpen={isModalOpen} onClose={closeModal} onAddPosition={addPosition} />
                
                {sellModalData && (
                    <SellPositionModal 
                        isOpen={isSellModalOpen}
                        onClose={closeSellModal}
                        position={sellModalData}
                        ticker={sellModalData.ticker}
                        currentPrice={sellModalData.marketValue || sellModalData.currentPrice}
                        onSellPosition={sellPosition}
                        formatCurrency={formatCurrency}
                    />
                )}
                
                {selectedTicker && (
                    <TransactionHistoryModal
                        isOpen={isHistoryModalOpen}
                        onClose={closeHistoryModal}
                        ticker={selectedTicker}
                        transactions={positions.find(p => p.ticker === selectedTicker)?.history || []}
                        marketValue={positions.find(p => p.ticker === selectedTicker)?.marketValue || 0}
                        onEdit={openEditModal}
                        onDelete={handleDeleteTransaction}
                        isGuest={isGuest}
                    />
                )}

                {selectedTransaction && (
                    <EditTransactionModal
                        isOpen={isEditModalOpen}
                        onClose={closeEditModal}
                        transaction={selectedTransaction}
                        onSave={handleSaveTransaction}
                    />
                )}

                <ConfirmModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={confirmDeleteTransaction}
                    title={confirmModalData.title}
                    message={confirmModalData.message}
                    confirmText={confirmModalData.confirmText}
                    cancelText={confirmModalData.cancelText}
                    confirmType={confirmModalData.confirmType}
                />

                <footer>
                    <p>© 2024 Financial Portfolio App. All rights reserved.</p>
                </footer>
            </div>
            
            {/* AllTick Status Indicator */}
            <FMPStatus />
            
            {/* Notification Toast */}
            {notification && (
                <div className={`notification-toast ${
                    notification.includes('✅') ? 'success' :
                    notification.includes('⚠️') ? 'warning' :
                    notification.includes('❌') ? 'error' :
                    'default'
                }`}>
                    {notification}
                </div>
            )}
        </>
    );
}

// Wrapper component con BrowserRouter
function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
