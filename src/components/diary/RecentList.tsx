'use client';

import React, { useState, useEffect } from 'react';
import { api, DiaryEntry, toDisplayDate } from '@/lib/api';
import { User } from '@/lib/api';
import Link from 'next/link';
import LoadingOverlay from '../LoadingOverlay';

interface RecentListProps {
    user: User;
    refreshTrigger: number;
}

export default function RecentList({ user, refreshTrigger }: RecentListProps) {
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        loadRecent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

    const loadRecent = async () => {
        setLoading(true);
        try {
            const res = await api.get({ action: 'getUserDiaryEntries', userId: user.id });
            if (res.success && res.entries) {
                setEntries(res.entries);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(entries.length / pageSize) || 1;
    const displayEntries = entries.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="card" style={{ position: 'relative' }}>
            {loading && <LoadingOverlay message="Loading recent..." />}
            <h3>Recent entries</h3>
            <div className="pager">
                <button className="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>◀</button>
                <span className="helper">Page {page} / {totalPages}</span>
                <button className="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>▶</button>
            </div>

            {loading ? <div className="helper">Loading...</div> : (
                <div>
                    {displayEntries.length === 0 && <div className="helper">No entries.</div>}
                    {displayEntries.map(e => (
                        <div key={e.entryId || e.date} style={{ marginBottom: 12 }}>
                            <Link href={`/entry?u=${encodeURIComponent(user.username)}&d=${toDisplayDate(e.date)}`} target="_blank" className="link">
                                {toDisplayDate(e.date)} — {e.title || 'Untitled'}
                            </Link>
                            <div className="helper truncate">
                                {e.content?.slice(0, 100) || 'No content'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
