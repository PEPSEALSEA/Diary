'use client';

import React, { useState } from 'react';
import { DiaryEntry, toDisplayDate, ApiResponse, User } from '@/lib/api';
import Link from 'next/link';
import LoadingOverlay from '../LoadingOverlay';
import { useCachedQuery } from '@/hooks/useCachedQuery';

interface DiaryCalendarProps {
    user: User;
    refreshTrigger: number;
}

export default function DiaryCalendar({ user, refreshTrigger }: DiaryCalendarProps) {
    const [date, setDate] = useState(new Date());

    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const { data, loading, validating } = useCachedQuery<ApiResponse>(
        'calendar',
        { action: 'getUserDiaryEntries', userId: user.id, month: monthStr },
        { refreshTrigger }
    );

    const entries = data?.entries || [];

    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 = Sunday

    const renderDays = () => {
        const cells = [];
        // Padding
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`pad-${i}`} />);
        }
        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEntries = entries.filter(e => e.date === dayStr);
            cells.push(
                <div key={d} style={{
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 4,
                    minHeight: 80,
                    background: 'var(--input)',
                    overflow: 'hidden',
                    fontSize: 12
                }}>
                    <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{d}</div>
                    {dayEntries.map(e => (
                        <div key={e.entryId || e.date} className="truncate" style={{ marginBottom: 2 }}>
                            <Link href={`/entry?u=${encodeURIComponent(user.username)}&d=${toDisplayDate(e.date)}`} target="_blank" className="link">
                                {e.title || 'Untitled'}
                                {e.privacy === 'private' && ' 🔒'}
                                {e.privacy === 'friend' && ' ★'}
                            </Link>
                        </div>
                    ))}
                </div>
            );
        }
        return cells;
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + delta);
        setDate(newDate);
    };

    return (
        <div className="card" style={{ position: 'relative' }}>
            {loading && <LoadingOverlay message="Loading month..." />}
            {validating && !loading && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, opacity: 0.5 }}>Updating...</div>}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button className="ghost" onClick={() => changeMonth(-1)}>Prev</button>
                <span className="badge" style={{ fontSize: 14 }}>{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button className="ghost" onClick={() => changeMonth(1)}>Next</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="helper">{d}</div>)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {renderDays()}
            </div>
        </div>
    );
}
