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
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [wasDragging, setWasDragging] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setZoom(1);
            setPosition({ x: 0, y: 0 });
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, initialIndex]);

    // Reset zoom when changing image
    useEffect(() => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    }, [currentIndex]);

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

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (wasDragging) {
            setWasDragging(false);
            return;
        }

        if (zoom > 1) {
            setZoom(1);
            setPosition({ x: 0, y: 0 });
        } else {
            setZoom(2.5);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1) {
            setIsDragging(true);
            setWasDragging(false);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoom > 1) {
            e.preventDefault();
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;
            if (Math.abs(newX - position.x) > 2 || Math.abs(newY - position.y) > 2) {
                setWasDragging(true);
            }
            setPosition({
                x: newX,
                y: newY
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (zoom > 1) {
            setIsDragging(true);
            setWasDragging(false);
            const touch = e.touches[0];
            setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging && zoom > 1) {
            // e.preventDefault(); // Might interfere with scrolling if not careful, but we locked body scroll
            const touch = e.touches[0];
            const newX = touch.clientX - dragStart.x;
            const newY = touch.clientY - dragStart.y;
            if (Math.abs(newX - position.x) > 2 || Math.abs(newY - position.y) > 2) {
                setWasDragging(true);
            }
            setPosition({
                x: newX,
                y: newY
            });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };


    if (!isOpen || images.length === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                userSelect: 'none'
            }}
            onClick={onClose}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
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
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                }}
            >
                {images.length > 1 && (
                    <button
                        onClick={handlePrev}
                        style={{
                            position: 'absolute',
                            left: 20,
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
                    draggable={false}
                    onMouseDown={handleMouseDown}
                    onClick={handleImageClick}
                    onTouchStart={handleTouchStart}
                    style={{
                        maxWidth: zoom === 1 ? '90vw' : 'none',
                        maxHeight: zoom === 1 ? '85vh' : 'none',
                        objectFit: 'contain',
                        borderRadius: 4,
                        cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                        transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out, max-width 0.2s, max-height 0.2s',
                        transformOrigin: 'center center'
                    }}
                />

                {images.length > 1 && (
                    <button
                        onClick={handleNext}
                        style={{
                            position: 'absolute',
                            right: 20,
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
                <div style={{ position: 'absolute', bottom: 20, color: '#aaa', fontSize: 14 }}>
                    {currentIndex + 1} / {images.length}
                </div>
            )}
        </div>
    );
}
