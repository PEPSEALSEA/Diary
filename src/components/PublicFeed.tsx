'use client';

import React from 'react';
import { DiaryEntry, toDisplayDate, ApiResponse } from '@/lib/api';
import Link from 'next/link';
import LoadingOverlay from './LoadingOverlay';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import ImageViewer from './ImageViewer';
import HighlightText from './HighlightText';
import { Search } from 'lucide-react';

export default function PublicFeed() {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data, loading, validating } = useCachedQuery<ApiResponse>('public_feed', {
        action: 'getPublicDiaryEntries',
        limit: 50,
        q: debouncedSearch
    });

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
                <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    fontSize: 11,
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 10,
                    animation: 'pulse 2s infinite'
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></div>
                    Updating Live...
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>Public Entries</h2>
                <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                        type="text"
                        placeholder="Search entries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input"
                        style={{ paddingLeft: 36, width: '100%', marginBottom: 0 }}
                    />
                </div>
            </div>

            {entries.length === 0 && !loading && <div className="helper">No public entries found.</div>}

            {entries.map((e, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <Link href={`/profile?u=${encodeURIComponent(e.username || '')}`} className="badge" style={{ textDecoration: 'none' }}>
                            <HighlightText text={e.username || ''} query={debouncedSearch} />
                        </Link>
                        <span className="helper">
                            <HighlightText text={toDisplayDate(e.date)} query={debouncedSearch} />
                        </span>
                    </div>
                    <Link href={`/entry?u=${encodeURIComponent(e.username || '')}&d=${toDisplayDate(e.date)}`} className="link" style={{ fontSize: 18, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                        <HighlightText text={e.title || 'Untitled'} query={debouncedSearch} />
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
                        <HighlightText
                            text={String(e.content || '').slice(0, 200)}
                            query={debouncedSearch}
                        />
                        {String(e.content || '').length > 200 && '...'}
                    </div>
                </div>
            ))}
        </div>
    );
}
