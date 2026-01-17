'use client';

import React from 'react';
import { DiaryEntry, toDisplayDate, ApiResponse, User } from '@/lib/api';
import Link from 'next/link';
import LoadingOverlay from '../LoadingOverlay';
import { useCachedQuery } from '@/hooks/useCachedQuery';

interface RecentListProps {
    user: User;
    refreshTrigger: number;
}

export default function RecentList({ user, refreshTrigger }: RecentListProps) {
    const [page, setPage] = React.useState(1);
    const pageSize = 10;

    const { data, loading, validating } = useCachedQuery<ApiResponse>(
        'recent_entries',
        { action: 'getUserDiaryEntries', userId: user.id },
        { refreshTrigger }
    );

    const entries = data?.entries || [];
    const totalPages = Math.ceil(entries.length / pageSize) || 1;
    const displayEntries = entries.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="card" style={{ position: 'relative' }}>
            {loading && <LoadingOverlay message="Loading recent..." />}
            {validating && !loading && (
                <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    fontSize: 10,
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    animation: 'pulse 2s infinite'
                }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }}></div>
                    Syncing...
                </div>
            )}

            <h3 style={{ fontSize: 16, margin: '0 0 16px 0' }}>Recent entries</h3>
            <div className="pager" style={{ marginBottom: 16, justifyContent: 'space-between', fontSize: 12 }}>
                <button className="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 8px' }}>◀</button>
                <span className="helper">Page {page} / {totalPages}</span>
                <button className="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 8px' }}>▶</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayEntries.length === 0 && !loading && <div className="helper">No entries.</div>}
                {displayEntries.map(e => (
                    <div key={e.entryId || e.date} className="recent-item" style={{
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: 8,
                        transition: 'transform 0.2s'
                    }}>
                        <Link
                            href={`/entry?u=${encodeURIComponent(user.username)}&d=${toDisplayDate(e.date)}`}
                            target="_blank"
                            className="link truncate"
                            style={{
                                display: 'block',
                                fontSize: 13,
                                fontWeight: 600,
                                marginBottom: 2
                            }}
                        >
                            {toDisplayDate(e.date)} — {e.title || 'Untitled'}
                        </Link>
                        <div className="helper truncate" style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {String(e.content || '').slice(0, 60) || 'No content...'}
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .recent-item:hover {
                    transform: translateX(4px);
                }
                .recent-item:last-child {
                    border-bottom: none;
                }
            `}</style>
        </div>
    );
}
