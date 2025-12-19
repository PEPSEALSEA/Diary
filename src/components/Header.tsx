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
                <div className="nav">
                    <Link href="/">Home</Link>
                    {user && <Link href="/dashboard">My Diary</Link>}

                    {user ? (
                        <>
                            <span className="helper" style={{ marginLeft: 16 }}>{user.username}</span>
                            <a style={{ cursor: 'pointer', marginLeft: 16 }} onClick={logout}>Logout</a>
                        </>
                    ) : (
                        <a style={{ cursor: 'pointer', marginLeft: 16 }} onClick={() => setShowAuth(true)}>Login</a>
                    )}
                </div>
            </div>
            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </>
    );
}
