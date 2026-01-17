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

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
                <div className="main-content">
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className={tab === 'editor' ? '' : 'ghost'} onClick={() => setTab('editor')}>Editor</button>
                                <button className={tab === 'calendar' ? '' : 'ghost'} onClick={() => setTab('calendar')}>Calendar</button>
                            </div>
                            <div className="helper">Manage your thoughts</div>
                        </div>
                    </div>

                    {tab === 'editor' && <DiaryEditor user={user} onEntryChange={handleEntryChange} refreshTrigger={refreshTrigger} />}
                    {tab === 'calendar' && <DiaryCalendar user={user} refreshTrigger={refreshTrigger} />}
                </div>

                <aside className="sidebar">
                    <RecentList user={user} refreshTrigger={refreshTrigger} />
                </aside>
            </div>

            <style jsx>{`
                @media (max-width: 900px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .sidebar {
                        order: 2;
                    }
                    .main-content {
                        order: 1;
                    }
                }
            `}</style>
            <div className="footer">Make By PEPSEALSEA ©2025</div>
        </div>
    );
}
