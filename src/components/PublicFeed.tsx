'use client';

import React, { useState, useEffect } from 'react';
import { api, DiaryEntry, toDisplayDate } from '@/lib/api';
import Link from 'next/link';
import LoadingOverlay from './LoadingOverlay';

export default function PublicFeed() {
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPublic();
    }, []);

    const loadPublic = async () => {
        try {
            const res = await api.get({ action: 'getPublicDiaryEntries', limit: 50 });
            if (res.success && res.entries) {
                setEntries(res.entries);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ position: 'relative', minHeight: 200 }}>
            {loading && <LoadingOverlay message="Loading feed..." />}
            <h2>Public Entries</h2>
            {loading ? <div className="helper">Loading...</div> : (
                <div>
                    {entries.length === 0 && <div className="helper">No public entries found.</div>}
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
            )}
        </div>
    );
}
