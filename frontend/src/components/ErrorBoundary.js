import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details to console for debugging
        console.error('Error caught by boundary:', error, errorInfo);
        
        // Update state with error details
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // TODO: Send error to logging service
        // Example: logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({ 
            hasError: false,
            error: null,
            errorInfo: null
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <div className="error-icon">⚠️</div>
                        <h1>Oops! Something went wrong</h1>
                        <p className="error-message">
                            We're sorry, but something unexpected happened. 
                            Please try refreshing the page or contact support if the problem persists.
                        </p>
                        
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="error-details">
                                <summary>Error Details (Development Only)</summary>
                                <div className="error-stack">
                                    <p><strong>Error:</strong> {this.state.error.toString()}</p>
                                    {this.state.errorInfo && (
                                        <pre>{this.state.errorInfo.componentStack}</pre>
                                    )}
                                </div>
                            </details>
                        )}
                        
                        <div className="error-actions">
                            <button 
                                className="error-btn primary" 
                                onClick={() => window.location.reload()}
                            >
                                Reload Page
                            </button>
                            <button 
                                className="error-btn secondary" 
                                onClick={this.handleReset}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
