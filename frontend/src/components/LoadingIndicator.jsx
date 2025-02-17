import React from 'react';

const LoadingIndicator = ({ message }) => {
    return (
        <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>{message || 'Loading...'}</p>
        </div>
    );
};

export default LoadingIndicator; 