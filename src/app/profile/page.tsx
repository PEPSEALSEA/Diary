'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { api, DiaryEntry, toDisplayDate } from '@/lib/api';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import LoadingOverlay from '@/components/LoadingOverlay';

function ProfileContent() {
    const params = useSearchParams();
    const username = params.get('u') || '';
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (username) loadUserPublic();
    }, [username]);

    const loadUserPublic = async () => {
        try {
            const res = await api.get({ action: 'getPublicDiaryEntries', username, limit: 100 });
            if (res.success && res.entries) {
                setEntries(res.entries);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!username) return <div className="container"><Header />No username specified</div>;

    return (
        <div className="container">
            <Header />

            <div className="card" style={{ position: 'relative', minHeight: 200 }}>
                {loading && <LoadingOverlay message="Loading profile..." />}
                <h2>{username}&apos;s Diary</h2>
                {loading ? <div className="helper">Loading...</div> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {entries.length === 0 && <div className="helper">No public entries found.</div>}
                        {entries.map((e, i) => (
                            <Link key={i} href={`/entry?u=${encodeURIComponent(username)}&d=${toDisplayDate(e.date)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: 10,
                                    padding: 16,
                                    height: '100%',
                                    background: 'var(--input)',
                                    transition: 'transform 0.2s',
                                }}
                                    onMouseEnter={ev => ev.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={ev => ev.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div className="helper" style={{ marginBottom: 8 }}>{toDisplayDate(e.date)}</div>
                                    <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--accent-2)' }}>{e.title || 'Untitled'}</div>
                                    <div className="helper truncate">{e.content}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <div className="footer">Make By PEPSEALSEA ©2025</div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfileContent />
        </Suspense>
    );
}
