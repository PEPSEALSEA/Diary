'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Dashboard from '@/components/Dashboard';
import Header from '@/components/Header';
import Link from 'next/link';

export default function DashboardPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="container page-fade">
                <Header />
                <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                    Loading...
                </div>
                <div className="footer">Make By PEPSEALSEA ©2025</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container page-fade">
                <Header />
                <div className="card" style={{ textAlign: 'center', margin: '40px auto', maxWidth: 400 }}>
                    <h3>Access Denied</h3>
                    <p className="helper">Please login to view your diary.</p>
                    <Link href="/" className="button">Go Home</Link>
                </div>
                <div className="footer">Make By PEPSEALSEA ©2025</div>
            </div>
        );
    }

    // Dashboard component already includes Header/Footer? 
    // Wait, I updated Dashboard to include Header.
    // But Dashboard component is styled as a full page container in previous step?
    // Ideally Dashboard component should just be the content.
    // Let's check previous Dashboard step.
    // "Refactored Dashboard to use Shared Header" -> yes it includes Header and Container.
    // So we can just render <Dashboard />.

    return <Dashboard />;
}
