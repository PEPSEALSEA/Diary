'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DiaryEditor from './diary/DiaryEditor';
import DiaryCalendar from './diary/DiaryCalendar';
import RecentList from './diary/RecentList';
import Header from './Header';

export default function Dashboard() {
    const { user } = useAuth();
    const [tab, setTab] = useState<'editor' | 'calendar'>('editor');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    if (!user) return null;

    const handleEntryChange = () => {
        setRefreshTrigger(p => p + 1);
    };

    return (
        <div className="container page-fade">
            <Header />

            <div className="row">
                <div className="col" style={{ flex: '2 1 400px' }}>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className={tab === 'editor' ? '' : 'ghost'} onClick={() => setTab('editor')}>Editor</button>
                            <button className={tab === 'calendar' ? '' : 'ghost'} onClick={() => setTab('calendar')}>Calendar</button>
                        </div>
                    </div>

                    {tab === 'editor' && <DiaryEditor user={user} onEntryChange={handleEntryChange} />}
                    {tab === 'calendar' && <DiaryCalendar user={user} refreshTrigger={refreshTrigger} />}
                </div>

                <div className="col" style={{ flex: '1 1 300px' }}>
                    <RecentList user={user} refreshTrigger={refreshTrigger} />
                </div>
            </div>

            <div className="footer">Make By PEPSEALSEA ©2025</div>
        </div>
    );
}
