'use client';

import React from 'react';
import { DiaryEntry, toDisplayDate, ApiResponse } from '@/lib/api';
import Link from 'next/link';
import LoadingOverlay from './LoadingOverlay';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import ImageViewer from './ImageViewer';

export default function PublicFeed() {
    const { data, loading, validating } = useCachedQuery<ApiResponse>('public_feed', { action: 'getPublicDiaryEntries', limit: 50 });

    const entries = data?.entries || [];

    const [viewer, setViewer] = React.useState<{ isOpen: boolean, images: string[], index: number }>({ isOpen: false, images: [], index: 0 });

    const openViewer = (images: string[], index: number = 0) => {
        setViewer({ isOpen: true, images, index });
    };

    const closeViewer = () => setViewer(prev => ({ ...prev, isOpen: false }));

    return (
        <div className="card" style={{ position: 'relative', minHeight: 200 }}>
            <ImageViewer
                isOpen={viewer.isOpen}
                images={viewer.images}
                initialIndex={viewer.index}
                onClose={closeViewer}
            />
            {loading && <LoadingOverlay message="Loading feed..." />}
            {/* Optional: Indicator for background update */}
            {validating && !loading && (
                <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, opacity: 0.5 }}>Updating...</div>
            )}

            <h2>Public Entries</h2>

            {entries.length === 0 && !loading && <div className="helper">No public entries found.</div>}

            {entries.map((e, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <Link href={`/profile?u=${encodeURIComponent(e.username || '')}`} className="badge" style={{ textDecoration: 'none' }}>{e.username}</Link>
                        <span className="helper">{toDisplayDate(e.date)}</span>
                    </div>
                    <Link href={`/entry?u=${encodeURIComponent(e.username || '')}&d=${toDisplayDate(e.date)}`} className="link" style={{ fontSize: 18, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                        {e.title || 'Untitled'}
                    </Link>
                    <div style={{ lineHeight: 1.5 }}>
                        {e.pictures && e.pictures.length > 0 && (
                            <div
                                className="card"
                                style={{ padding: 4, width: '100%', height: 200, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'var(--card-bg)', cursor: 'pointer' }}
                                onClick={() => openViewer(e.pictures || [], 0)}
                            >
                                <img src={e.pictures[0]} alt="Entry attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {e.pictures.length > 1 && (
                                    <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
                                        +{e.pictures.length - 1} more
                                    </div>
                                )}
                            </div>
                        )}
                        {String(e.content || '').slice(0, 200)}
                        {String(e.content || '').length > 200 && '...'}
                    </div>
                </div>
            ))}
        </div>
    );
}
