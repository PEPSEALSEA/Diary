'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, ApiResponse } from '@/lib/api';
import Link from 'next/link';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function FriendsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [friendships, setFriendships] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (user) {
            fetchFriendships();
        }
    }, [user]);

    const fetchFriendships = async () => {
        if (!user) return;
        setLoading(true);
        const res = await api.getFriendships(user.id);
        if (res.success) {
            setFriendships(res.friendships);
        }
        setLoading(false);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.length < 2) return;
        setSearching(true);
        const res = await api.searchUsers(searchQuery);
        if (res.success) {
            setSearchResults(res.users);
        }
        setSearching(false);
    };

    const handleSendRequest = async (toUsername: string) => {
        if (!user) return;
        const res = await api.addFriend(user.id, toUsername);
        if (res.success) {
            toast('Friend request sent!');
            fetchFriendships();
        } else {
            toast(res.error || 'Failed to send request', 'error');
        }
    };

    const handleAccept = async (requesterId: string) => {
        if (!user) return;
        const res = await api.acceptFriend(user.id, requesterId);
        if (res.success) {
            toast('Accepted!');
            fetchFriendships();
        }
    };

    if (!user) {
        return (
            <div className="container">
                <Header />
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    Please login to manage friends
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <Header />

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: 24, marginTop: 24 }}>
                {/* Left Side: Search & Management */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card">
                        <h2 style={{ marginTop: 0 }}>Find Friends</h2>
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
                            <input
                                type="text"
                                placeholder="Search by username..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button type="submit" disabled={searching}>{searching ? 'Searching...' : 'Search'}</button>
                        </form>

                        {searchResults.length > 0 && (
                            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {searchResults.map((u, i) => (
                                    <div key={i} className="card" style={{ background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>
                                                {u.avatarUrl ? <img src={u.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : u.username[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <Link href={`/profile?u=${u.username}`} style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>{u.username}</Link>
                                                <div style={{ fontSize: 12, opacity: 0.6 }}>Level {u.level}</div>
                                            </div>
                                        </div>
                                        {u.id !== user.id && (
                                            <button className="button" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => handleSendRequest(u.username)}>Add Friend</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchQuery && searchResults.length === 0 && !searching && (
                            <div className="helper" style={{ marginTop: 10 }}>No users found.</div>
                        )}
                    </div>

                    <div className="card">
                        <h2 style={{ marginTop: 0 }}>Your Friends</h2>
                        {loading && <div className="helper">Loading friends...</div>}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                            {friendships?.friends.map((f: any, i: number) => (
                                <Link key={i} href={`/profile?u=${f.username}`} style={{ textDecoration: 'none' }}>
                                    <div className="card" style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'center', padding: 16, transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', margin: '0 auto 12px', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 'bold', overflow: 'hidden' }}>
                                            {f.avatarUrl ? <img src={f.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : f.username[0].toUpperCase()}
                                        </div>
                                        <div style={{ fontWeight: 600, color: '#fff' }}>{f.username}</div>
                                        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                                            {f.lastSeen ? `Last seen: ${new Date(f.lastSeen).toLocaleDateString()}` : 'Never active'}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {friendships?.friends.length === 0 && !loading && <div className="helper">You haven&apos;t added any friends yet.</div>}
                    </div>
                </div>

                {/* Right Side: Requests */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card" style={{ background: 'rgba(57, 203, 222, 0.05)', border: '1px solid rgba(57, 203, 222, 0.2)' }}>
                        <h3 style={{ marginTop: 0, color: '#57cbde' }}>Received Requests</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {friendships?.received.map((r: any, i: number) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600 }}>{r.username}</span>
                                    <button className="button" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleAccept(r.userId)}>Accept</button>
                                </div>
                            ))}
                            {friendships?.received.length === 0 && <div className="helper">No pending requests.</div>}
                        </div>
                    </div>

                    <div className="card" style={{ opacity: 0.8 }}>
                        <h3 style={{ marginTop: 0 }}>Sent Requests</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {friendships?.sent.map((s: any, i: number) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                    <span>{s.username}</span>
                                    <span className="helper">Pending</span>
                                </div>
                            ))}
                            {friendships?.sent.length === 0 && <div className="helper">No sent requests.</div>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="footer">Make By PEPSEALSEA ©2025</div>
        </div>
    );
}
