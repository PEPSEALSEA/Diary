'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import LoadingOverlay from '@/components/LoadingOverlay';
import ImageViewer from '@/components/ImageViewer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import HighlightText from '@/components/HighlightText';
import { api, FriendRequest, ApiResponse, toDisplayDate, DiaryEntry } from '@/lib/api';
import { Users, BookOpen, Clock, Calendar, ChevronDown, Check, X, UserPlus, MessageSquare, Search, Star, Lock } from 'lucide-react';

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

    // Loading & Validating States
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [validatingProfile, setValidatingProfile] = useState(false);
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [validatingEntries, setValidatingEntries] = useState(false);

    // Pagination
    const [hasMore, setHasMore] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

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

    // Initial load or search query change
    useEffect(() => {
        if (username && profile) {
            loadEntries(0);
        }
    }, [username, profile, debouncedSearch]);

    const loadProfile = async () => {
        const cacheKey = `profile:${username}:${viewer?.id || 'guest'}`;
        const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;

        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setProfile(parsed);
                setFriends(parsed.friends || []);
                setLoadingProfile(false);
                setValidatingProfile(true);
            } catch (e) { }
        } else {
            setLoadingProfile(true);
        }

        try {
            const res = await api.get({
                action: 'getProfile',
                username,
                viewerUserId: viewer?.id || ''
            });
            if (res.success && res.profile) {
                setProfile(res.profile);
                setFriends(res.profile.friends || []);
                localStorage.setItem(cacheKey, JSON.stringify(res.profile));
            }

            if (viewer?.username === username) {
                const reqRes = await api.get({ action: 'listFriendRequests', userId: viewer.id });
                if (reqRes.success) setFriendRequests(reqRes.requests || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingProfile(false);
            setValidatingProfile(false);
        }
    };

    const loadEntries = async (offset = 0) => {
        if (loadingEntries && offset !== 0) return;

        const cacheKey = `entries:${username}:${offset}:${debouncedSearch || 'none'}`;
        const cached = offset === 0 && typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;

        if (cached && offset === 0) {
            try {
                const parsed = JSON.parse(cached);
                setEntries(parsed.entries || []);
                setHasMore(parsed.hasMore || false);
                setValidatingEntries(true);
            } catch (e) { }
        } else {
            setLoadingEntries(true);
        }

        try {
            const res = await api.get({
                action: 'getPublicDiaryEntries',
                username,
                limit: 10,
                offset,
                q: debouncedSearch,
                viewerUserId: viewer?.id,
                viewerEmail: viewer?.email
            });

            if (res.success) {
                if (offset === 0) {
                    setEntries(res.entries || []);
                    setHasMore(res.hasMore || false);
                    localStorage.setItem(cacheKey, JSON.stringify({ entries: res.entries, hasMore: res.hasMore }));
                } else {
                    setEntries(prev => [...prev, ...(res.entries || [])]);
                    setHasMore(res.hasMore || false);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingEntries(false);
            setValidatingEntries(false);
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
            <div className="card glass" style={{
                position: 'relative',
                overflow: 'hidden',
                padding: 0,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'linear-gradient(to bottom, #1e242e, #171a21)'
            }}>
                {/* Banner Effect */}
                <div style={{ height: 160, background: 'linear-gradient(45deg, var(--accent), var(--accent-2))', opacity: 0.2 }}></div>

                {validatingProfile && (
                    <div style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        fontSize: 10,
                        color: 'var(--accent)',
                        background: 'rgba(0,0,0,0.4)',
                        padding: '4px 8px',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        animation: 'pulse 1.5s infinite'
                    }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }}></div>
                        Syncing...
                    </div>
                )}

                <div className="profile-top-card" style={{ padding: '0 24px 24px', marginTop: -60, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end' }}>

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
                    <div className="profile-info" style={{ flex: 1, marginBottom: 10, display: 'flex', flexDirection: 'column' }}>
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
                    <div className="profile-actions" style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {!isSelf && !isFriend && (
                            <button className="button" onClick={handleAddFriend} disabled={actionLoading}>
                                <UserPlus size={16} style={{ marginRight: 6 }} /> Add Friend
                            </button>
                        )}
                        {isFriend && !isSelf && (
                            <div className="badge flex items-center gap-1.5" style={{
                                background: 'rgba(255,171,0,0.1)',
                                border: '1px solid rgba(255,171,0,0.3)',
                                color: '#ffab00',
                                padding: '8px 16px',
                                borderRadius: 8,
                                fontWeight: 600,
                                userSelect: 'none',
                                boxShadow: '0 0 10px rgba(255,171,0,0.1)'
                            }}>
                                <Star size={16} fill="#ffab00" stroke="#ffab00" />
                                Friends
                            </div>
                        )}
                        <button className="button ghost" onClick={() => setShowStats(true)}>
                            Level {profile.level}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="profile-layout" style={{ marginTop: 24 }}>

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
                <div style={{ position: 'relative' }}>
                    {validatingEntries && (
                        <div style={{
                            position: 'absolute',
                            top: -10,
                            right: 0,
                            fontSize: 10,
                            color: 'rgba(255,171,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            animation: 'pulse 2s infinite'
                        }}>
                            <Clock size={10} /> Checking for updates...
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BookOpen size={20} /> Diary Timeline
                        </h3>
                        <div style={{ position: 'relative', flex: 1, maxWidth: 250 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="text"
                                placeholder="Search timeline..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input"
                                style={{ paddingLeft: 32, fontSize: 13, marginBottom: 0, height: 36 }}
                            />
                        </div>
                    </div>

                    {entries.length === 0 && !loadingEntries && (
                        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#888' }}>
                            No public entries found.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {entries.map((entry) => (
                            <div key={entry.entryId} className="card timeline-entry" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Date Header */}
                                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)', fontSize: 13, color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                                    <span><HighlightText text={toDisplayDate(entry.date)} query={debouncedSearch} /></span>
                                    <span>{entry.privacy}</span>
                                </div>

                                <div style={{ padding: 24 }}>
                                    <Link href={`/entry?u=${encodeURIComponent(username)}&d=${toDisplayDate(entry.date)}`} className="link" style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        {entry.isFriend && <Star size={18} fill="#ffab00" stroke="#ffab00" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 4px rgba(255,171,0,0.4))' }} />}
                                        {(entry.privacy === 'private' || entry.privacy === 'friend') && <Lock size={16} style={{ flexShrink: 0, opacity: 0.8, color: '#ff4d4d' }} />}
                                        <HighlightText text={entry.title || 'Untitled'} query={debouncedSearch} />
                                    </Link>
                                    <div style={{ lineHeight: 1.6, fontSize: 15, color: '#ccc', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
                                        <HighlightText
                                            text={entry.content.length > 300 ? entry.content.slice(0, 300) + '...' : entry.content}
                                            query={debouncedSearch}
                                        />
                                    </div>

                                    {/* Picture Preview */}
                                    {entry.pictures && entry.pictures.length > 0 && (
                                        <div className="pic-preview-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
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
