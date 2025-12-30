import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import './components/Tooltip.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faShieldAlt, faPlus, faChevronRight, faArrowUp, faCalendarAlt, faUserCircle, faSync, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import AddPositionModal from './components/AddPositionModal';
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
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { collection, doc, addDoc, getDocs, writeBatch, deleteDoc } from "firebase/firestore";
import { formatCurrency } from './utils/formatting';
import { calculatePortfolioXIRR } from './utils/xirr';
import { runXIRRTests } from './utils/xirrTests';
import fmpService from './services/fmpService'; // Import FMP service

function App() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState({});
    const [selectedTicker, setSelectedTicker] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [positions, setPositions] = useState([]);
    const [user, setUser] = useState(null);
    const [isGuest, setIsGuest] = useState(false); // State for guest mode
    const [loading, setLoading] = useState(true); // State for initial auth check
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [portfolioStats, setPortfolioStats] = useState({
        totalValue: 0,
        totalInvested: 0,
        totalPL: 0,
        totalReturn: 0,
        annualizedReturn: 0,
        hasMarketData: false,
    });
    const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
    const [portfolioLoaded, setPortfolioLoaded] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isAddingPosition, setIsAddingPosition] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingTickers, setLoadingTickers] = useState(new Set());
    const [errorTickers, setErrorTickers] = useState(new Set());
    const [lastUpdateTime, setLastUpdateTime] = useState(null);
    const [lastRefreshTime, setLastRefreshTime] = useState(null);
    const [notification, setNotification] = useState('');
    const [chartTimePeriod, setChartTimePeriod] = useState('30D'); // New state for chart time period

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const loadPortfolio = async (userId) => {
        if (!userId || isLoadingPortfolio) {
            console.log("Skipping portfolio load - no userId or already loading");
            return;
        }
        
        setIsLoadingPortfolio(true);
        console.log("Loading portfolio for user:", userId);
        
        try {
            const transactionsRef = collection(db, "users", userId, "transactions");
            const querySnapshot = await getDocs(transactionsRef);
            
            if (querySnapshot.empty) {
                console.log("No transactions found");
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

            console.log("Loaded transactions:", transactions.length);

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

            // Show positions immediately with purchase prices
            const initialPositions = Array.from(positionsMap.values()).map(pos => {
                // Ordenar el historial por fecha de compra para encontrar la primera
                const sortedHistory = pos.history.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
                const firstPurchaseDate = sortedHistory[0].purchaseDate;
                
                return {
                    ...pos,
                    avgPurchasePrice: pos.totalCost / pos.quantity,
                    marketValue: null, // No market value yet - will be loaded from API
                    priceLoading: true, // Flag to show loading state
                    priceError: false, // Flag to show error state
                    firstPurchaseDate: firstPurchaseDate // Agregar fecha de primera compra
                };
            }).sort((a, b) => new Date(a.firstPurchaseDate) - new Date(b.firstPurchaseDate)); // Ordenar por fecha de primera compra
            
            console.log("Setting initial positions:", initialPositions.length);
            setPositions(initialPositions);
            setPortfolioLoaded(true);
            
            // Immediately start loading market prices
            if (initialPositions.length > 0) {
                console.log("Starting immediate market price fetch for", initialPositions.length, "positions");
                fetchAllMarketPrices();
            }
            
        } catch (error) {
            console.error("Error loading portfolio:", error);
            setPositions([]);
            setPortfolioLoaded(true);
        } finally {
            setIsLoadingPortfolio(false);
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
            
            // Load portfolio manually after sign in
            if (result.user) {
                loadPortfolio(result.user.uid);
            }
        } catch (error) {
            console.error("Error signing in with Google:", error);
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleGuestSignIn = () => {
        setIsGuest(true);
        setIsSidebarOpen(false); // Close sidebar on guest sign in
        setIsLoadingPortfolio(false); // Ensure no loading state for guest
        setPortfolioLoaded(true); // Guest mode doesn't need to load from Firestore
    };

    const handleSignOut = async () => {
        try {
            console.log("Signing out user");
            await firebaseSignOut(auth);
            setIsGuest(false); // Explicitly set guest mode to false on any sign-out
            setPositions([]); // Clear positions immediately
            setIsSidebarOpen(false); // Close sidebar on sign out
        } catch (error) {
            console.error("Error signing out:", error);
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
        console.log("Adding position:", newPosition);
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

            // Update UI immediately with purchase price as market value
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
                existingPosition.marketValue = newPosition.purchasePrice; // Use purchase price for immediate display
                existingPosition.firstPurchaseDate = firstPurchaseDate;

                // Reordenar todas las posiciones por fecha de primera compra
                updatedPositions.sort((a, b) => new Date(a.firstPurchaseDate) - new Date(b.firstPurchaseDate));
                
                setPositions(updatedPositions);
                console.log("Updated existing position:", existingPosition);
            } else {
                // Agregar nueva posición
                const purchaseDate = newPosition.purchaseDate || new Date().toISOString().split('T')[0];
                const positionToAdd = {
                    ticker: newPosition.ticker,
                    quantity: newPosition.quantity,
                    totalCost: newPosition.purchasePrice * newPosition.quantity,
                    avgPurchasePrice: newPosition.purchasePrice,
                    marketValue: newPosition.purchasePrice, // Use purchase price for immediate display
                    history: [newTransaction],
                    firstPurchaseDate: purchaseDate // Agregar fecha de primera compra
                };
                
                setPositions(prevPositions => {
                    const newPositions = [...prevPositions, positionToAdd];
                    // Ordenar por fecha de primera compra (más antigua primero)
                    newPositions.sort((a, b) => new Date(a.firstPurchaseDate) - new Date(b.firstPurchaseDate));
                    console.log("New positions array:", newPositions);
                    return newPositions;
                });
                console.log("Added new position:", positionToAdd);
            }

            // Reset loading state immediately after UI update
            setIsAddingPosition(false);

            // Save to Firestore in background (don't block UI)
            if (user && user.uid) {
                try {
                    console.log("Saving to Firestore in background...");
                    
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
                    console.log("Successfully saved to Firestore with ID:", docRef.id);
                    
                } catch (firestoreError) {
                    console.error("Error saving to Firestore:", firestoreError);
                    // Show error but don't block the UI
                }
            } else {
                console.log("User not logged in, position saved only locally");
            }

            // Optionally fetch market price in background to update the position
            fetchMarketPriceInBackground(newPosition.ticker);

        } catch (error) {
            console.error("Error adding position:", error);
            alert(`Failed to add position: ${error.message}`);
            setIsAddingPosition(false); // Reset loading state on error
        }
    };

    // Helper function to fetch market price in background using FMP API
    const fetchMarketPriceInBackground = async (ticker) => {
        try {
            if (!fmpService.isConfigured()) {
                console.warn('FMP API not configured. Please set your API key.');
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
                
                console.log(`Updated market value for ${ticker}: $${quote.lastPrice} (FMP)`);
            }
            
        } catch (error) {
            console.log(`Could not fetch market price for ${ticker} from FMP:`, error.message);
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
            console.log('🔄 Starting FMP price fetch...');
            
            if (!fmpService.isConfigured()) {
                console.warn('FMP API not configured. Please set your API key.');
                setErrorTickers(new Set(tickers));
                return;
            }

            // Try to get quotes with timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 15000)
            );
            
            const quotesPromise = fmpService.getBulkQuotes(tickers);
            const profilesPromise = fmpService.getBulkCompanyProfiles(tickers); // Fetch profiles
            const [quotes, profiles] = await Promise.all([
                Promise.race([quotesPromise, timeoutPromise]),
                Promise.race([profilesPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Profiles timeout')), 15000))])
            ]);

            // Process logos from profiles
            if (profiles) {
                const logos = {};
                Object.values(profiles).forEach(profile => {
                    if (profile && profile.symbol && profile.image) {
                        logos[profile.symbol] = profile.image;
                    }
                });
                setTickerLogos(prevLogos => ({ ...prevLogos, ...logos }));
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
                
                console.log(`✅ Updated ${quotes.length} positions with FMP data`);
                
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
            console.error('❌ FMP price fetch failed:', error);
            
            // Set all tickers as error state
            setErrorTickers(new Set(tickers));
            setLoadingTickers(new Set());
            
            if (isManualAction) {
                setNotification('❌ Failed to update prices. Please try again.');
            }
            
            // Retry logic for network errors
            if (retryCount < 2 && (error.message.includes('timeout') || error.message.includes('network'))) {
                console.log(`Retrying bulk fetch (attempt ${retryCount + 1}/3)...`);
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
                    
                    console.log(`Successfully updated individual price for ${ticker}`);
                }
            } catch (error) {
                console.error(`Error fetching individual price for ${ticker}:`, error);
                
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
            
            console.log("Transaction updated successfully in Firestore");
            
        } catch (error) {
            console.error("Error updating transaction:", error);
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
            console.error("Transaction not found");
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
                console.log("Transaction deleted successfully from Firestore");
            } else {
                // Para modo guest, ya se eliminó del estado local
                console.log("Guest mode: transaction deleted from local state");
            }
            
        } catch (error) {
            console.error("Error deleting transaction:", error);
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
            console.error("Error refreshing portfolio:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        console.log("Setting up auth listener");
        let isMounted = true;
        
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!isMounted) return;
            
            console.log("Auth state changed:", currentUser ? "User logged in" : "No user");
            
            setUser(currentUser);
            setLoading(false); // Set loading to false once auth state is determined
            
            if (currentUser) {
                console.log("User signed in:", currentUser.email);
                setIsGuest(false);
                // Load portfolio asynchronously without blocking UI
                if (!portfolioLoaded) {
                    // Don't await - let it load in background
                    loadPortfolio(currentUser.uid).catch(error => {
                        console.error("Background portfolio load failed:", error);
                        setIsLoadingPortfolio(false); // Ensure loading stops on error
                    });
                } else {
                    // Portfolio already loaded, make sure loading state is false
                    setIsLoadingPortfolio(false);
                }
            } else {
                console.log("User signed out, clearing all data");
                setPositions([]);
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
                console.log('🧪 Prueba rápida XIRR:');
                const depositos = [
                    { date: "2023-01-01", amount: 10000 },
                    { date: "2023-06-01", amount: 5000 }
                ];
                const valorActual = 18000;
                const resultado = calculatePortfolioXIRR(depositos, valorActual);
                console.log(`📊 Depósitos: $10,000 (Ene 2023) + $5,000 (Jun 2023)`);
                console.log(`💰 Valor actual: $18,000`);
                console.log(`📈 XIRR: ${resultado}% anual`);
                return resultado;
            };
            
            console.log('🔬 Funciones XIRR disponibles:');
            console.log('  - testXIRR(): Prueba rápida con datos de ejemplo');
            console.log('  - runXIRRTests(): Ejecuta pruebas completas');
            console.log('  - calculatePortfolioXIRR(deposits, currentValue): Calcula XIRR directamente');
        }
    }, []);

    useEffect(() => {
        const calculatePortfolioStats = () => {
            // ✅ CORRECCIÓN: Calcular el total invertido real (TODAS las compras sin duplicar)
            const totalInvested = positions.reduce((acc, pos) => {
                let positionTotal = 0;
                
                // Opción 1: Si tiene historial completo, usar solo el historial (más preciso)
                if (pos.history && pos.history.length > 0) {
                    pos.history.forEach(transaction => {
                        positionTotal += transaction.purchasePrice * transaction.quantity;
                    });
                    console.log(`📊 ${pos.ticker}: Calculado desde historial = $${positionTotal.toFixed(2)}`);
                } else {
                    // Opción 2: Si no tiene historial, usar el promedio × cantidad
                    positionTotal = pos.avgPurchasePrice * pos.quantity;
                    console.log(`📊 ${pos.ticker}: Calculado desde promedio = $${positionTotal.toFixed(2)}`);
                }
                
                // También revisar additionalTransactions por compatibilidad (solo si no está en history)
                if (pos.additionalTransactions && pos.additionalTransactions.length > 0) {
                    pos.additionalTransactions.forEach(transaction => {
                        positionTotal += (transaction.purchasePrice || transaction.price) * transaction.quantity;
                    });
                }
                
                return acc + positionTotal;
            }, 0);
            
            console.log(`💰 Total invertido calculado: $${totalInvested.toFixed(2)}`);
            
            // Only calculate market-based stats for positions with loaded market values
            const positionsWithMarketValue = positions.filter(pos => pos.marketValue !== null && pos.marketValue !== undefined);
            
            let totalValue = 0;
            let totalPL = 0;
            let totalReturn = 0;
            let annualizedReturn = 0;
            let hasMarketData = false;
            
            if (positionsWithMarketValue.length > 0) {
                hasMarketData = true;
                totalValue = positionsWithMarketValue.reduce((acc, pos) => acc + (pos.marketValue * pos.quantity), 0);
                
                // ✅ CORRECCIÓN: Usar el total invertido real para calcular ganancias
                if (totalInvested > 0) {
                    totalPL = totalValue - totalInvested;
                    totalReturn = (totalPL / totalInvested) * 100;
                    
                    // ✅ CORRECCIÓN: Calcular XIRR usando TODAS las transacciones reales
                    // XIRR considera el timing exacto de cada inversión - igual que fondos profesionales
                    try {
                        // 1. Crear flujos de efectivo a partir de TODAS las transacciones (sin duplicar)
                        const cashFlows = [];
                        
                        positions.forEach(position => {
                            // Usar SOLO el historial si existe (más preciso y evita duplicados)
                            if (position.history && position.history.length > 0) {
                                position.history.forEach(transaction => {
                                    cashFlows.push({
                                        date: transaction.purchaseDate,
                                        amount: -(transaction.purchasePrice * transaction.quantity) // Negativo = dinero saliendo
                                    });
                                });
                            } else if (position.purchaseDate) {
                                // Solo usar purchaseDate si NO hay historial
                                cashFlows.push({
                                    date: position.purchaseDate,
                                    amount: -(position.avgPurchasePrice * position.quantity) // Negativo = dinero saliendo
                                });
                            }
                            
                            // Agregar transacciones adicionales por compatibilidad
                            if (position.additionalTransactions && position.additionalTransactions.length > 0) {
                                position.additionalTransactions.forEach(transaction => {
                                    cashFlows.push({
                                        date: transaction.purchaseDate || transaction.date,
                                        amount: -((transaction.purchasePrice || transaction.price) * transaction.quantity)
                                    });
                                });
                            }
                        });
                        
                        // 2. Agregar el valor actual como flujo positivo (dinero entrando hoy)
                        cashFlows.push({
                            date: new Date().toISOString().split('T')[0],
                            amount: totalValue // Positivo = dinero entrando
                        });
                        
                        // 3. Convertir a formato de depósitos para la función XIRR (invirtir signos)
                        const portfolioDeposits = cashFlows
                            .filter(cf => cf.amount < 0) // Solo los depósitos (negativos)
                            .map(cf => ({
                                date: cf.date,
                                amount: -cf.amount // Convertir a positivo para la función
                            }));
                        
                        // 4. Calcular XIRR solo si tenemos datos suficientes
                        if (portfolioDeposits.length >= 1) {
                            const xirrResult = calculatePortfolioXIRR(portfolioDeposits, totalValue);
                            
                            if (xirrResult !== null && isFinite(xirrResult)) {
                                annualizedReturn = xirrResult;
                                // Limitar a valores razonables (-99% a 1000% anual)
                                annualizedReturn = Math.max(-99, Math.min(1000, annualizedReturn));
                            } else {
                                // Fallback a CAGR simple si XIRR falla
                                if (portfolioDeposits.length > 0) {
                                    const firstDate = new Date(Math.min(...portfolioDeposits.map(d => new Date(d.date))));
                                    const currentDate = new Date();
                                    const yearsDifference = (currentDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25);
                                    
                                    if (yearsDifference >= 0.083) { // Al menos 1 mes
                                        const growthFactor = totalValue / totalInvested;
                                        if (growthFactor > 0) {
                                            annualizedReturn = (Math.pow(growthFactor, 1 / yearsDifference) - 1) * 100;
                                            annualizedReturn = Math.max(-99, Math.min(1000, annualizedReturn));
                                        } else {
                                            annualizedReturn = -100;
                                        }
                                    } else {
                                        annualizedReturn = 0;
                                    }
                                }
                            }
                        } else {
                            annualizedReturn = 0;
                        }
                        
                    } catch (error) {
                        console.error('Error calculando XIRR:', error);
                        // Fallback a cálculo simple en caso de error usando todas las transacciones (sin duplicar)
                        const allDates = [];
                        positions.forEach(position => {
                            if (position.history && position.history.length > 0) {
                                // Usar solo el historial si existe
                                position.history.forEach(tx => allDates.push(new Date(tx.purchaseDate)));
                            } else if (position.purchaseDate) {
                                // Solo usar purchaseDate si no hay historial
                                allDates.push(new Date(position.purchaseDate));
                            }
                            if (position.additionalTransactions) {
                                position.additionalTransactions.forEach(tx => 
                                    allDates.push(new Date(tx.purchaseDate || tx.date))
                                );
                            }
                        });
                        
                        if (allDates.length > 0) {
                            const firstDate = new Date(Math.min(...allDates));
                            const yearsDiff = (new Date() - firstDate) / (1000 * 60 * 60 * 24 * 365.25);
                            
                            if (yearsDiff >= 0.083) {
                                const growthFactor = totalValue / totalInvested;
                                if (growthFactor > 0) {
                                    annualizedReturn = (Math.pow(growthFactor, 1 / yearsDiff) - 1) * 100;
                                    annualizedReturn = Math.max(-99, Math.min(1000, annualizedReturn));
                                } else {
                                    annualizedReturn = -100;
                                }
                            } else {
                                annualizedReturn = 0;
                            }
                        }
                    }
                }
            } else if (positions.length > 0) {
                // If we have positions but no market data yet, show invested amount as current value
                // This gives users immediate feedback that their data is there
                totalValue = totalInvested;
            }

            setPortfolioStats({
                totalValue,
                totalInvested,
                totalPL,
                totalReturn,
                annualizedReturn,
                hasMarketData // Add flag to know if we should show colors/arrows
            });
        };

        if ((user || isGuest) && positions.length >= 0) { // Changed condition to always calculate
            calculatePortfolioStats();
        }
    }, [positions, user, isGuest]); // All dependencies included

    // Auto-refresh market prices every 30 seconds when portfolio is loaded
    useEffect(() => {
        let intervalId;
        
        if (positions.length > 0 && portfolioLoaded) {
            // Initial fetch
            fetchAllMarketPrices();
            
            // Set up interval for auto-refresh (30 seconds)
            intervalId = setInterval(() => {
                fetchAllMarketPrices();
            }, 30000); // 30 seconds
            
            console.log('Auto-refresh enabled for market prices (30s interval)');
        }
        
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
                console.log('Auto-refresh disabled');
            }
        };
    }, [positions.length, portfolioLoaded]); // Re-run when positions change or portfolio loads

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
                console.log('Tooltip mouse enter'); // Debug
                tooltip.style.opacity = '1';
                tooltip.style.visibility = 'visible';
                tooltip.style.transform = 'translateX(-50%) scale(1)';
            };
            
            const handleMouseLeave = () => {
                console.log('Tooltip mouse leave'); // Debug
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
        <BrowserRouter>
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
                                />
                            ) : (
                                <FontAwesomeIcon icon={faUserCircle} size="2x" />
                            )}
                        </button>
                        <div className="action-row">
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
                            
                            {user && (
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
                                loadingTickers={loadingTickers}
                                errorTickers={errorTickers}
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
                            />
                        } />
                    </Routes>
                </main>

                <AddPositionModal isOpen={isModalOpen} onClose={closeModal} onAddPosition={addPosition} />
                
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
                <div className="notification-toast">
                    {notification}
                </div>
            )}
        </BrowserRouter>
    );
}

export default App;
