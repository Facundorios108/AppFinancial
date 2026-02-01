import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import logger from '../utils/logger';
import { 
    faUserCircle, 
    faSignInAlt, 
    faSignOutAlt, 
    faArrowRight,
    faHome,
    faChartLine,
    faStar,
    faCheckCircle
} from '@fortawesome/free-solid-svg-icons';

const Sidebar = ({ isOpen, onClose, user, isGuest, onSignIn, onSignOut }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignIn = () => {
        onSignIn();
        onClose();
    };

    const handleSignOut = () => {
        onSignOut();
        onClose();
    };

    const handleNavigation = (path) => {
        navigate(path);
        onClose();
    };

    const isActiveRoute = (path) => {
        return location.pathname === path;
    };

    const navigationItems = [
        { path: '/', icon: faHome, label: 'Dashboard', emoji: '🏠' },
        { path: '/stocks', icon: faChartLine, label: 'Stocks', emoji: '📈' },
        { path: '/watchlist', icon: faStar, label: 'Watchlist', emoji: '⭐' },
        { path: '/realized', icon: faCheckCircle, label: 'Realized', emoji: '📊' },
        // Future sections (commented for now)
        // { path: '/portfolio', icon: faListAlt, label: 'Portfolio', emoji: '📊' },
        // { path: '/transactions', icon: faHistory, label: 'Transactions', emoji: '📋' },
        // { path: '/settings', icon: faCog, label: 'Settings', emoji: '⚙️' },
    ];

    return (
        <>
            <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="profile-section">
                        {user ? (
                            <>
                                <img 
                                    src={user.photoURL || ''} 
                                    alt={user.displayName} 
                                    className="profile-photo"
                                    onError={(e) => {
                                        logger.log('Sidebar profile photo failed to load:', user.photoURL);
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                    referrerPolicy="no-referrer"
                                />
                                <FontAwesomeIcon 
                                    icon={faUserCircle} 
                                    size="2x" 
                                    className="profile-photo-fallback"
                                    style={{ display: 'none' }}
                                />
                            </>
                        ) : (
                            <FontAwesomeIcon icon={faUserCircle} size="2x" />
                        )}
                        <h2>{user ? user.displayName : isGuest ? 'Guest Mode' : 'Profile'}</h2>
                    </div>
                    <button onClick={onClose} className="close-sidebar-btn">
                        <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                </div>

                {/* Navigation Menu */}
                {(user || isGuest) && (
                    <div className="sidebar-navigation">
                        <div className="nav-section">
                            <h3 className="nav-section-title">Navigation</h3>
                            <ul className="nav-list">
                                {navigationItems.map((item) => (
                                    <li key={item.path}>
                                        <button
                                            onClick={() => handleNavigation(item.path)}
                                            className={`nav-item ${isActiveRoute(item.path) ? 'active' : ''}`}
                                        >
                                            <span className="nav-emoji">{item.emoji}</span>
                                            <span className="nav-label">{item.label}</span>
                                            {isActiveRoute(item.path) && (
                                                <span className="active-indicator">●</span>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <div className="sidebar-menu">
                    {user || isGuest ? (
                        <button onClick={handleSignOut} className="sidebar-action-btn">
                            <FontAwesomeIcon icon={faSignOutAlt} />
                            <span>Logout</span>
                        </button>
                    ) : (
                        <button onClick={handleSignIn} className="sidebar-action-btn">
                            <FontAwesomeIcon icon={faSignInAlt} />
                            <span>Login with Google</span>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default Sidebar;
