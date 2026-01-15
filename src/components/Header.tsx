'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuthModal from './AuthModal';

const menuItemStyle: React.CSSProperties = {
    display: 'block',
    padding: '10px 20px',
    color: '#c6d4df',
    fontSize: 14,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s'
};

export default function Header() {
    const { user, logout } = useAuth();
    const [showAuth, setShowAuth] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    return (
        <>
            <div className="header">
                <div className="brand">
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                        <img src="/logo.png" alt="Logo" style={{ height: 32, width: 'auto' }} />
                        <span style={{ fontWeight: 700, fontSize: 18 }}>Daily Diary</span>
                    </Link>
                </div>
                <div className="nav" style={{ display: 'flex', alignItems: 'center' }}>
                    <Link href="/">Home</Link>
                    {user && <Link href="/dashboard">My Diary</Link>}

                    {user ? (
                        <div style={{ position: 'relative', marginLeft: 16 }}>
                            <div
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                {user.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.username}
                                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)', transition: 'transform 0.2s' }}
                                    />
                                ) : (
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: 16 }}>
                                        {user.username[0].toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {showUserMenu && (
                                <>
                                    <div
                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                                        onClick={() => setShowUserMenu(false)}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: 10,
                                        width: 220,
                                        background: '#1b2838',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 4,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                        zIndex: 999,
                                        overflow: 'hidden',
                                        animation: 'fadeIn 0.2s ease-out'
                                    }}>
                                        <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{user.username}</div>
                                            <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>Level {user.level || 1}</div>
                                        </div>

                                        <div className="menu-items" style={{ padding: '8px 0' }}>
                                            <Link href={`/profile?u=${encodeURIComponent(user.username)}`} onClick={() => setShowUserMenu(false)} style={menuItemStyle}>
                                                View Profile
                                            </Link>
                                            <Link href="/friends" onClick={() => setShowUserMenu(false)} style={menuItemStyle}>
                                                Friends
                                            </Link>
                                            <Link href="/dashboard" onClick={() => setShowUserMenu(false)} style={menuItemStyle}>
                                                My Dashboard
                                            </Link>
                                            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                                            <a onClick={logout} style={{ ...menuItemStyle, color: '#ff4b4b' }}>
                                                Logout
                                            </a>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <a style={{ cursor: 'pointer', marginLeft: 16 }} onClick={() => setShowAuth(true)}>Login</a>
                    )}
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .menu-items a:hover {
                    background: rgba(255,255,255,0.1);
                    color: #fff !important;
                }
            `}</style>
            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </>
    );
}
