'use client';

import React from 'react';
import { DiaryEntry, toDisplayDate, ApiResponse } from '@/lib/api';
import Link from 'next/link';
import LoadingOverlay from './LoadingOverlay';
import { useCachedQuery } from '@/hooks/useCachedQuery';

export default function PublicFeed() {
    const { data, loading, validating } = useCachedQuery<ApiResponse>('public_feed', { action: 'getPublicDiaryEntries', limit: 50 });

    const entries = data?.entries || [];

    return (
        <div className="card" style={{ position: 'relative', minHeight: 200 }}>
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
                        {e.content?.slice(0, 200)}
                        {(e.content?.length || 0) > 200 && '...'}
                    </div>
                </div>
            ))}
        </div>
    );
}
