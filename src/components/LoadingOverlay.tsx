'use client';

import React from 'react';

interface LoadingOverlayProps {
    message?: string;
    style?: React.CSSProperties;
}

export default function LoadingOverlay({ message = 'Loading...', style }: LoadingOverlayProps) {
    return (
        <div className="loading-overlay" style={style}>
            <div className="spinner"></div>
            <div className="helper" style={{ fontSize: 13, color: 'var(--text)' }}>{message}</div>
        </div>
    );
}
