'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerProps {
    images: string[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageViewer({ images, initialIndex = 0, isOpen, onClose }: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            document.body.style.overflow = 'hidden'; // Lock scroll
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, initialIndex]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    }, [images.length]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    }, [images.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, handlePrev, handleNext]);

    if (!isOpen || images.length === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
            }}
            onClick={onClose}
        >
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10001
                }}
            >
                <X size={24} />
            </button>

            <div
                style={{
                    position: 'relative',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onClick={e => e.stopPropagation()} // Prevent close on image click
            >
                {images.length > 1 && (
                    <button
                        onClick={handlePrev}
                        style={{
                            position: 'absolute',
                            left: -60,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '50%',
                            width: 50,
                            height: 50,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10000
                        }}
                    >
                        <ChevronLeft size={32} />
                    </button>
                )}

                <img
                    src={images[currentIndex]}
                    alt={`View ${currentIndex + 1}`}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '85vh',
                        objectFit: 'contain',
                        borderRadius: 4,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}
                />

                {images.length > 1 && (
                    <button
                        onClick={handleNext}
                        style={{
                            position: 'absolute',
                            right: -60,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '50%',
                            width: 50,
                            height: 50,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10000
                        }}
                    >
                        <ChevronRight size={32} />
                    </button>
                )}
            </div>

            {images.length > 1 && (
                <div style={{ marginTop: 16, color: '#aaa', fontSize: 14 }}>
                    {currentIndex + 1} / {images.length}
                </div>
            )}
        </div>
    );
}
