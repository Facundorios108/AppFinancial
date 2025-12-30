import React from 'react';
import './LoginScreen.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faUser } from '@fortawesome/free-solid-svg-icons';

const LoginScreen = ({ onGoogleSignIn, onGuestSignIn, isSigningIn }) => {
    return (
        <div className="login-container">
            <div className="login-box">
                <h1 className="login-title">My Financial Portfolio</h1>
                <p className="login-subtitle">Welcome! Please choose an option to continue.</p>
                <div className="login-actions">
                    <button 
                        className={`login-btn google ${isSigningIn ? 'loading' : ''}`}
                        onClick={onGoogleSignIn}
                        disabled={isSigningIn}
                    >
                        {isSigningIn ? (
                            <div className="login-loading">
                                <div className="loading-spinner small"></div>
                                <span>Signing in...</span>
                            </div>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faGoogle} className="btn-icon" />
                                <span>Sign In with Google</span>
                            </>
                        )}
                    </button>
                    <button 
                        className="login-btn guest" 
                        onClick={onGuestSignIn}
                        disabled={isSigningIn}
                    >
                        <FontAwesomeIcon icon={faUser} className="btn-icon" />
                        <span>Continue as Guest</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
