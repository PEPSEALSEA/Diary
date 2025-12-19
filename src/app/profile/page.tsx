'use client';

import React, { Suspense } from 'react';
import { DiaryEntry, toDisplayDate, ApiResponse } from '@/lib/api';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useCachedQuery } from '@/hooks/useCachedQuery';

function ProfileContent() {
    const params = useSearchParams();
    const username = params.get('u') || '';

    const { data, loading, validating } = useCachedQuery<ApiResponse>(
        'profile',
        { action: 'getPublicDiaryEntries', username, limit: 100 },
        { enabled: !!username }
    );

    const entries = data?.entries || [];

    if (!username) return <div className="container"><Header />No username specified</div>;

    return (
        <div className="container">
            <Header />

            <div className="card" style={{ position: 'relative', minHeight: 200 }}>
                {loading && <LoadingOverlay message="Loading profile..." />}
                {validating && !loading && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, opacity: 0.5 }}>Updating...</div>}

                <h2>{username}&apos;s Diary</h2>

                {entries.length === 0 && !loading && <div className="helper">No public entries found.</div>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
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
