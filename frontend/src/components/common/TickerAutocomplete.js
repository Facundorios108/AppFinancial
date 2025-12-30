import React, { useState, useEffect, useRef } from 'react';
import fmpService from '../../services/fmpService';
import logger from '../../utils/logger';
import styles from './TickerAutocomplete.module.css';

const TickerAutocomplete = ({ 
    value, 
    onChange, 
    onTickerSelect, 
    placeholder = "Ingrese símbolo...",
    disabled = false,
    className = ""
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const debounceRef = useRef(null);

    // Debounced search function
    const searchTickers = async (query) => {
        if (query.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsLoading(true);
        try {
            const results = await fmpService.searchTickers(query);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
            setSelectedIndex(-1);
        } catch (error) {
            logger.error('Error searching tickers:', error);
            setSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle input change
    const handleInputChange = (e) => {
        const inputValue = e.target.value.toUpperCase();
        onChange(inputValue);

        // Clear existing debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Set new debounce
        debounceRef.current = setTimeout(() => {
            searchTickers(inputValue);
        }, 300);
    };

    // Handle suggestion selection
    const handleSuggestionClick = (suggestion) => {
        onChange(suggestion.symbol);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        setSuggestions([]); // Limpiar sugerencias para evitar que reaparezcan
        
        if (onTickerSelect) {
            onTickerSelect(suggestion);
        }
        
        inputRef.current?.focus();
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!showSuggestions) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    handleSuggestionClick(suggestions[selectedIndex]);
                } else if (suggestions.length === 1) {
                    // Si solo hay una sugerencia, seleccionarla automáticamente
                    handleSuggestionClick(suggestions[0]);
                }
                break;
            
            case 'Escape':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                setSuggestions([]); // Limpiar sugerencias
                inputRef.current?.blur(); // Quitar el foco del input
                break;
            
            default:
                // No action needed for other keys
                break;
        }
    };

    // Handle input focus
    const handleFocus = () => {
        if (suggestions.length > 0) {
            setShowSuggestions(true);
        }
    };

    // Handle input blur
    const handleBlur = () => {
        // Pequeño delay para permitir que los clics en sugerencias se procesen
        setTimeout(() => {
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }, 200);
    };

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
                inputRef.current && !inputRef.current.contains(event.target)) {
                setShowSuggestions(false);
                setSelectedIndex(-1);
                setSuggestions([]); // Limpiar sugerencias cuando se hace clic fuera
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return (
        <div className={`${styles.autocompleteContainer} ${className}`}>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                className={styles.autocompleteInput}
                autoComplete="off"
            />
            
            {isLoading && (
                <div className={styles.loadingIndicator}>
                    <div className={styles.loadingSpinner}></div>
                </div>
            )}
            
            {showSuggestions && suggestions.length > 0 && (
                <div ref={suggestionsRef} className={styles.suggestionsList}>
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.symbol}
                            className={`${styles.suggestionItem} ${
                                index === selectedIndex ? styles.selected : ''
                            }`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <div className={styles.suggestionMain}>
                                <span className={styles.suggestionSymbol}>
                                    {suggestion.symbol}
                                </span>
                                <span className={styles.suggestionName}>
                                    {suggestion.name}
                                </span>
                            </div>
                            {suggestion.exchangeShortName && (
                                <span className={styles.suggestionExchange}>
                                    {suggestion.exchangeShortName}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TickerAutocomplete;
