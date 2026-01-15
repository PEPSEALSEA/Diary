'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import LoadingOverlay from '@/components/LoadingOverlay';
import ImageViewer from '@/components/ImageViewer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, FriendRequest, ApiResponse, toDisplayDate, DiaryEntry } from '@/lib/api';
import { Users, BookOpen, Clock, Calendar, ChevronDown, Check, X, UserPlus, MessageSquare } from 'lucide-react';

const ProfileContent = () => {
    const params = useSearchParams();
    const username = params.get('u') || '';
    const { user: viewer } = useAuth();
    const { toast } = useToast();
    const [actionLoading, setActionLoading] = useState(false);

    // Data States
    const [profile, setProfile] = useState<any>(null);
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

    // Loading States
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingEntries, setLoadingEntries] = useState(false);

    // Pagination
    const [hasMore, setHasMore] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Modals
    const [showStats, setShowStats] = useState(false);
    const [showFriendsModal, setShowFriendsModal] = useState(false);

    // Image Viewer
    const [viewerState, setViewerState] = useState<{ isOpen: boolean, images: string[], index: number }>({ isOpen: false, images: [], index: 0 });

    const isSelf = viewer?.username === username;

    useEffect(() => {
        if (username) {
            loadProfile();
            setEntries([]); // Reset entries on user change
            setHasMore(true);
        }
    }, [username, viewer, refreshTrigger]);

    // Initial load of first batch of entries
    useEffect(() => {
        if (username && profile) {
            loadEntries(0);
        }
    }, [username, profile]);

    const loadProfile = async () => {
        setLoadingProfile(true);
        try {
            const res = await api.get({
                action: 'getProfile',
                username,
                viewerUserId: viewer?.id || ''
            });
            if (res.success && res.profile) {
                setProfile(res.profile);
                setFriends(res.profile.friends || []);
            }

            if (viewer?.username === username) {
                const reqRes = await api.get({ action: 'listFriendRequests', userId: viewer.id });
                if (reqRes.success) setFriendRequests(reqRes.requests || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingProfile(false);
        }
    };

    const loadEntries = async (offset = 0) => {
        if (loadingEntries && offset !== 0) return;
        setLoadingEntries(true);
        try {
            const res = await api.get({
                action: 'getPublicDiaryEntries',
                username,
                limit: 10,
                offset,
                viewerUserId: viewer?.id,
                viewerEmail: viewer?.email
            });

            if (res.success) {
                if (offset === 0) {
                    setEntries(res.entries || []);
                } else {
                    setEntries(prev => [...prev, ...(res.entries || [])]);
                }
                setHasMore(res.hasMore || false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingEntries(false);
        }
    };

    const handleAddFriend = async () => {
        if (!viewer) return toast('Login required', 'error');
        setActionLoading(true);
        const res = await api.addFriend(viewer.id, username);
        if (res.success) {
            toast('Friend request sent!');
            setRefreshTrigger(p => p + 1);
        } else {
            toast(res.error || 'Failed', 'error');
        }
        setActionLoading(false);
    };

    const handleAccept = async (requesterId: string) => {
        setActionLoading(true);
        const res = await api.acceptFriend(viewer?.id || '', requesterId);
        if (res.success) {
            toast('Accepted!');
            setRefreshTrigger(p => p + 1);
        }
        setActionLoading(false);
    };

    const handleDecline = async (requesterId: string) => {
        setActionLoading(true);
        const res = await api.declineFriend(viewer?.id || '', requesterId);
        if (res.success) {
            toast('Declined');
            setRefreshTrigger(p => p + 1);
        }
        setActionLoading(false);
    };

    const openViewer = (images: string[], index: number = 0) => {
        setViewerState({ isOpen: true, images, index });
    };

    if (!username) return <div className="container"><Header />No user specified</div>;
    if (loadingProfile && !profile) return <div className="container"><Header /><LoadingOverlay message="Loading profile..." /></div>;
    if (!profile) return <div className="container"><Header /><div className="card" style={{ padding: 40, textAlign: 'center' }}>User not found</div></div>;

    const isOnline = profile.lastSeen && (new Date().getTime() - new Date(profile.lastSeen).getTime() < 5 * 60 * 1000);
    const isFriend = profile.isFriend || friends.some(f => f.friendUserId === viewer?.id);

    return (
        <div className="container page-fade">
            <Header />
            <ImageViewer
                isOpen={viewerState.isOpen}
                images={viewerState.images}
                initialIndex={viewerState.index}
                onClose={() => setViewerState(p => ({ ...p, isOpen: false }))}
            />

            {/* Top Profile Card */}
            <div className="card" style={{
                position: 'relative',
                overflow: 'hidden',
                padding: 0,
                border: 'none',
                background: 'linear-gradient(to bottom, #1e242e, #171a21)'
            }}>
                {/* Banner Effect */}
                <div style={{ height: 120, background: 'linear-gradient(45deg, var(--accent-2), var(--accent))', opacity: 0.1 }}></div>

                <div style={{ padding: '0 24px 24px', marginTop: -60, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end' }}>

                    {/* Avatar */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: 128, height: 128,
                            borderRadius: 4,
                            background: '#171a21',
                            padding: 4,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}>
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: 'var(--accent)', borderRadius: 2, display: 'grid', placeItems: 'center', fontSize: 48, fontWeight: 'bold' }}>
                                    {username[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        {isOnline && <div style={{
                            position: 'absolute', bottom: 8, right: 8,
                            width: 16, height: 16, borderRadius: '50%',
                            background: '#57cbde', border: '3px solid #171a21',
                            boxShadow: '0 0 8px #57cbde'
                        }} title="Online" />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, marginBottom: 10 }}>
                        <h1 style={{ fontSize: 32, margin: '0 0 4px', color: '#fff' }}>{profile.username}</h1>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#888' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={14} /> Joined {new Date(profile.created).toLocaleDateString()}
                            </span>
                            {profile.lastSeen && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isOnline ? '#57cbde' : '#888' }}>
                                    <Clock size={14} /> {isOnline ? 'Online Now' : `Last seen ${new Date(profile.lastSeen).toLocaleDateString()}`}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
                        {!isSelf && !isFriend && (
                            <button className="button" onClick={handleAddFriend} disabled={actionLoading}>
                                <UserPlus size={16} style={{ marginRight: 6 }} /> Add Friend
                            </button>
                        )}
                        {isFriend && !isSelf && (
                            <button className="button ghost" disabled>
                                <Check size={16} style={{ marginRight: 6 }} /> Friends
                            </button>
                        )}
                        <button className="button ghost" onClick={() => setShowStats(true)}>
                            Level {profile.level}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, marginTop: 24, alignItems: 'start' }}>

                {/* Left Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Stats Widget */}
                    <div className="card">
                        <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: '#888', margin: '0 0 16px' }}>Statistics</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 4 }}>
                                <div style={{ fontSize: 20, fontWeight: 700 }}>{profile.totalEntries}</div>
                                <div style={{ fontSize: 12, opacity: 0.5 }}>Diary Entries</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 4 }}>
                                <div style={{ fontSize: 20, fontWeight: 700 }}>{friends.length}</div>
                                <div style={{ fontSize: 12, opacity: 0.5 }}>Friends</div>
                            </div>
                        </div>
                    </div>

                    {/* Friends Widget */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: '#888', margin: 0 }}>Friends</h3>
                            <button className="link" style={{ fontSize: 12 }} onClick={() => setShowFriendsModal(true)}>See All</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {friends.slice(0, 9).map((f: any, i: number) => (
                                <Link key={i} href={`/profile?u=${encodeURIComponent(f.friendUsername)}`}>
                                    <div style={{ aspectRatio: '1/1', background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }} title={f.friendUsername}>
                                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--accent)', fontSize: 18, fontWeight: 'bold' }}>
                                            {f.friendUsername[0].toUpperCase()}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {friends.length === 0 && <div className="helper">No friends yet.</div>}
                    </div>

                    {/* Requests (Self only) */}
                    {isSelf && friendRequests.length > 0 && (
                        <div className="card" style={{ borderColor: 'var(--accent)' }}>
                            <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 16px' }}>Requests</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {friendRequests.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600 }}>{r.requesterUsername}</span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="button" style={{ padding: 6 }} onClick={() => handleAccept(r.requesterId)}><Check size={14} /></button>
                                            <button className="button ghost" style={{ padding: 6 }} onClick={() => handleDecline(r.requesterId)}><X size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Main Feed */}
                <div>
                    <h3 style={{ fontSize: 18, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BookOpen size={20} /> Diary Timeline
                    </h3>

                    {entries.length === 0 && !loadingEntries && (
                        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#888' }}>
                            No public entries found.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {entries.map((entry) => (
                            <div key={entry.entryId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Date Header */}
                                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)', fontSize: 13, color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{toDisplayDate(entry.date)}</span>
                                    <span>{entry.privacy}</span>
                                </div>

                                <div style={{ padding: 24 }}>
                                    <Link href={`/entry?u=${encodeURIComponent(username)}&d=${toDisplayDate(entry.date)}`} className="link" style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 12 }}>
                                        {entry.title || 'Untitled'}
                                    </Link>
                                    <div style={{ lineHeight: 1.6, fontSize: 15, color: '#ccc', marginBottom: 16 }}>
                                        {entry.content.length > 300 ? entry.content.slice(0, 300) + '...' : entry.content}
                                    </div>

                                    {/* Picture Preview */}
                                    {entry.pictures && entry.pictures.length > 0 && (
                                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                                            {entry.pictures.slice(0, 4).map((pic, idx) => (
                                                <div
                                                    key={idx}
                                                    className="card"
                                                    style={{
                                                        minWidth: 120, height: 120, padding: 0, border: 'none',
                                                        backgroundImage: `url(${pic})`, backgroundSize: 'cover', backgroundPosition: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => openViewer(entry.pictures || [], idx)}
                                                />
                                            ))}
                                            {entry.pictures.length > 4 && (
                                                <div style={{ minWidth: 120, height: 120, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                                                    +{entry.pictures.length - 4} more
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ marginTop: 16 }}>
                                        <Link href={`/entry?u=${encodeURIComponent(username)}&d=${toDisplayDate(entry.date)}`} className="button ghost" style={{ fontSize: 13, padding: '6px 16px' }}>
                                            Read Full Entry
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <button className="button ghost" onClick={() => loadEntries(entries.length)} disabled={loadingEntries} style={{ width: '100%' }}>
                                {loadingEntries ? 'Loading...' : 'Load More Entries'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Friend List Modal */}
            {showFriendsModal && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowFriendsModal(false)}>
                    <div className="modal-content" style={{ maxWidth: 500, height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ margin: 0 }}>Friends ({friends.length})</h2>
                            <button className="button ghost" onClick={() => setShowFriendsModal(false)}><X size={20} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {friends.map((f, i) => (
                                <Link key={i} href={`/profile?u=${encodeURIComponent(f.friendUsername)}`} style={{ textDecoration: 'none' }} onClick={() => setShowFriendsModal(false)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: 4, display: 'grid', placeItems: 'center', fontWeight: 'bold', color: '#fff' }}>
                                            {f.friendUsername[0].toUpperCase()}
                                        </div>
                                        <div style={{ color: '#fff', fontWeight: 600 }}>{f.friendUsername}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Modal */}
            {showStats && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowStats(false)}>
                    <div className="modal-content" style={{ textAlign: 'center' }}>
                        <h2 style={{ marginTop: 0 }}>Stats</h2>
                        <div style={{ fontSize: 64, fontWeight: 900, color: 'var(--accent)' }}>{profile.level}</div>
                        <div style={{ opacity: 0.7 }}>Current Level</div>
                        <div style={{ margin: '24px 0', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${profile.exp % 100}%`, height: '100%', background: 'var(--accent)' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.7, fontSize: 13 }}>
                            <span>{profile.exp} XP</span>
                            <span>Next Level: {Math.floor(profile.exp / 100) * 100 + 100} XP</span>
                        </div>
                        <button className="button ghost" onClick={() => setShowStats(false)} style={{ width: '100%', marginTop: 24 }}>Close</button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default function ProfilePage() {
    return <Suspense fallback={<div>Loading...</div>}><ProfileContent /></Suspense>;
}
