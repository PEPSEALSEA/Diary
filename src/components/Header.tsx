'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuthModal from './AuthModal';

export default function Header() {
    const { user, logout } = useAuth();
    const [showAuth, setShowAuth] = useState(false);

    return (
        <>
            <div className="header">
                <div className="brand">
                    <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>Daily Diary</Link>
                </div>
                <div className="nav" style={{ display: 'flex', alignItems: 'center' }}>
                    <Link href="/">Home</Link>
                    {user && <Link href="/dashboard">My Diary</Link>}

                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 16, gap: 12 }}>
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={user.username}
                                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }}
                                />
                            ) : (
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: 14 }}>
                                    {user.username[0].toUpperCase()}
                                </div>
                            )}
                            <Link href={`/profile?u=${encodeURIComponent(user.username)}`} style={{ fontWeight: 600, color: 'var(--accent-2)' }}>
                                {user.username}
                            </Link>
                            <a style={{ cursor: 'pointer', fontSize: '0.9em', opacity: 0.7 }} onClick={logout}>Logout</a>
                        </div>
                    ) : (
                        <a style={{ cursor: 'pointer', marginLeft: 16 }} onClick={() => setShowAuth(true)}>Login</a>
                    )}
                </div>
            </div>
            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </>
    );
}
