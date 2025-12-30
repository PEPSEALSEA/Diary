'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, FriendRequest, ApiResponse, toDisplayDate } from '@/lib/api';

const ProfileContent = () => {
    const params = useSearchParams();
    const username = params.get('u') || '';
    const { user: viewer } = useAuth();
    const { toast } = useToast();
    const [refresh, setRefresh] = useState(0);

    const { data: profileResp, loading: profileLoading } = useCachedQuery<ApiResponse>(
        'profile-v4',
        { action: 'getProfile', username, viewerUserId: viewer?.id || '' },
        { enabled: !!username, refreshTrigger: refresh }
    );

    const { data: entriesResp, loading: entriesLoading } = useCachedQuery<ApiResponse>(
        'profile-entries',
        { action: 'getPublicDiaryEntries', username, limit: 10 },
        { enabled: !!username }
    );

    const { data: requestsResp } = useCachedQuery<ApiResponse>(
        'friend-requests',
        { action: 'listFriendRequests', userId: viewer?.id || '' },
        { enabled: !!viewer && viewer.username === username, refreshTrigger: refresh }
    );

    const profile = profileResp?.profile;
    const entries = entriesResp?.entries || [];
    const requests: FriendRequest[] = requestsResp?.requests || [];

    const handleAddFriend = async () => {
        if (!viewer) {
            toast('Please login to add friends', 'error');
            return;
        }
        const res = await api.addFriend(viewer.id, username);
        if (res.success) {
            toast(res.message || 'Request sent!');
            setRefresh(prev => prev + 1);
        } else {
            toast(res.error || 'Failed to send request', 'error');
        }
    };

    const handleAccept = async (requesterId: string) => {
        if (!viewer) return;
        const res = await api.acceptFriend(viewer.id, requesterId);
        if (res.success) {
            toast('Friend request accepted!');
            setRefresh(prev => prev + 1);
        } else {
            toast(res.error || 'Failed to accept request', 'error');
        }
    };

    const handleDecline = async (requesterId: string) => {
        if (!viewer) return;
        const res = await api.declineFriend(viewer.id, requesterId);
        if (res.success) {
            toast('Request declined');
            setRefresh(prev => prev + 1);
        } else {
            toast(res.error || 'Failed to decline request', 'error');
        }
    };

    if (!username) return (
        <div className="container">
            <Header />
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                No username specified
            </div>
        </div>
    );

    if (profileLoading && !profile) {
        return (
            <div className="container">
                <Header />
                <LoadingOverlay message="Loading profile..." />
            </div>
        );
    }

    if (!profile && !profileLoading) {
        return (
            <div className="container">
                <Header />
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    User not found
                </div>
            </div>
        );
    }

    // Since we returned above if !profile, we can safely access profile fields now
    // but Typescript might still complain if not explicitly narrowed.
    const lastSeenDate = profile?.lastSeen ? new Date(profile.lastSeen) : null;
    const isOnline = lastSeenDate && (new Date().getTime() - lastSeenDate.getTime() < 5 * 60 * 1000);
    const isSelf = viewer?.id === profile?.id;
    const isFriend = profile?.friends?.some(f => f.friendUserId === viewer?.id);

    return (
        <div className="container">
            <Header />

            {/* Profile Header (Steam Style) */}
            <div className="card" style={{
                background: 'linear-gradient(to bottom, rgba(35, 42, 53, 0.8), rgba(23, 26, 33, 0.9))',
                padding: '24px',
                borderRadius: '8px 8px 0 0',
                borderBottom: 'none',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 24,
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'relative' }}>
                    {profile?.avatarUrl ? (
                        <img
                            src={profile.avatarUrl}
                            alt={username}
                            style={{
                                width: 164,
                                height: 164,
                                border: '2px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                                objectFit: 'cover'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: 164,
                            height: 164,
                            background: 'var(--accent)',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 64,
                            fontWeight: 'bold',
                            border: '2px solid rgba(255,255,255,0.1)'
                        }}>
                            {username[0]?.toUpperCase()}
                        </div>
                    )}
                    {isOnline && (
                        <div style={{
                            position: 'absolute',
                            bottom: -5,
                            right: -5,
                            width: 20,
                            height: 20,
                            background: '#57cbde',
                            borderRadius: '50%',
                            border: '3px solid #171a21',
                            boxShadow: '0 0 10px #57cbde'
                        }} title="Online" />
                    )}
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#fff', textShadow: '0 0 5px rgba(0,0,0,0.5)' }}>{profile?.username}</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                                <span style={{
                                    color: isOnline ? '#57cbde' : '#898989',
                                    fontSize: 14,
                                    fontWeight: 600
                                }}>
                                    {isOnline ? 'Online' : profile?.lastSeen ? `Last Online: ${new Date(profile.lastSeen).toLocaleString()}` : 'Never active'}
                                </span>
                            </div>
                        </div>

                        {!isSelf && !isFriend && (
                            <button className="button" onClick={handleAddFriend} style={{ padding: '8px 24px' }}>Add Friend</button>
                        )}
                        {isFriend && !isSelf && (
                            <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 13, color: '#898989' }}>✓ Friends</div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '12px 16px',
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.1)',
                        textAlign: 'right',
                        minWidth: 100
                    }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>Level <span style={{ color: 'var(--accent)' }}>{profile?.level}</span></div>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>XP: {profile?.exp}</div>
                    </div>
                </div>
            </div>

            {/* Profile Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginTop: 2 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Friend Requests (Only for self) */}
                    {isSelf && requests.length > 0 && (
                        <div className="card" style={{ borderTop: 'none', background: 'rgba(57, 203, 222, 0.1)', border: '1px solid rgba(57, 203, 222, 0.3)' }}>
                            <h3 style={{ textTransform: 'uppercase', fontSize: 14, color: '#57cbde', marginTop: 0, borderBottom: '1px solid rgba(57, 203, 222, 0.2)', paddingBottom: 10 }}>
                                Pending Friend Requests
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {requests.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>{r.requesterUsername[0].toUpperCase()}</div>
                                            <span style={{ fontWeight: 600 }}>{r.requesterUsername}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="button" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleAccept(r.requesterId)}>Accept</button>
                                            <button className="button danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleDecline(r.requesterId)}>Decline</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Last Diary Entry */}
                    <div className="card" style={{ borderTop: isSelf && requests.length > 0 ? '' : 'none', background: 'rgba(23, 26, 33, 0.4)' }}>
                        <h3 style={{ textTransform: 'uppercase', fontSize: 14, color: '#898989', marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10 }}>
                            Pinned / Last Entry
                        </h3>
                        {profile?.lastEntry ? (
                            <Link href={`/entry?u=${encodeURIComponent(username)}&d=${toDisplayDate(profile.lastEntry.date)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: 20,
                                    borderRadius: 4,
                                    transition: 'background 0.2s',
                                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}>
                                    <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent-2)', marginBottom: 5 }}>{profile.lastEntry.title || 'Untitled'}</div>
                                    <div className="helper" style={{ fontSize: 13 }}>Posted on {toDisplayDate(profile?.lastEntry.date)}</div>
                                </div>
                            </Link>
                        ) : (
                            <div className="helper">No public entries to show.</div>
                        )}
                    </div>

                    {/* Entry History */}
                    <div className="card" style={{ background: 'rgba(23, 26, 33, 0.4)' }}>
                        <h3 style={{ textTransform: 'uppercase', fontSize: 14, color: '#898989', marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10 }}>
                            Public Diary History
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {entriesLoading && <div className="helper">Loading entries...</div>}
                            {entries.map((e, i) => (
                                <Link key={i} href={`/entry?u=${encodeURIComponent(username)}&d=${toDisplayDate(e.date)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 15px',
                                        background: 'rgba(0,0,0,0.1)',
                                        borderRadius: 4,
                                        fontSize: 14
                                    }}>
                                        <span style={{ fontWeight: 500 }}>{e.title || 'Untitled'}</span>
                                        <span className="helper" style={{ fontSize: 12 }}>{toDisplayDate(e.date)}</span>
                                    </div>
                                </Link>
                            ))}
                            {entries.length === 0 && !entriesLoading && <div className="helper">No public entries found.</div>}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Stats */}
                    <div className="card" style={{ background: 'rgba(23, 26, 33, 0.4)' }}>
                        <h3 style={{ textTransform: 'uppercase', fontSize: 14, color: '#898989', marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10 }}>
                            Stats
                        </h3>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{profile?.totalEntries}</div>
                        <div className="helper" style={{ fontSize: 12, textTransform: 'uppercase' }}>Total Diary Entries</div>

                        <div style={{ marginTop: 20, fontSize: 13 }}>
                            Joined: {profile?.created ? new Date(profile.created).toLocaleDateString() : 'Unknown'}
                        </div>
                    </div>

                    {/* Friends */}
                    <div className="card" style={{ background: 'rgba(23, 26, 33, 0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10, marginBottom: 15 }}>
                            <h3 style={{ textTransform: 'uppercase', fontSize: 14, color: '#898989', margin: 0 }}>
                                Friends
                            </h3>
                            <span style={{ fontSize: 12, color: '#fff' }}>{profile?.friends?.length || 0}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                            {profile?.friends?.map((f, i) => (
                                <Link key={i} href={`/profile?u=${encodeURIComponent(f.friendUsername)}`} title={f.friendUsername}>
                                    <div style={{
                                        aspectRatio: '1/1',
                                        background: 'var(--accent)',
                                        borderRadius: 4,
                                        overflow: 'hidden',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>
                                            {f.friendUsername[0]?.toUpperCase()}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {profile?.friends?.length === 0 && <div className="helper">No friends added.</div>}
                    </div>
                </div>
            </div>

            <div className="footer">Make By PEPSEALSEA ©2025</div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfileContent />
        </Suspense>
    );
}
