'use client';

import React, { Suspense } from 'react';
import { DiaryEntry, toDisplayDate, ApiResponse } from '@/lib/api';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useAuth } from '@/context/AuthContext';

function ProfileContent() {
    const params = useSearchParams();
    const username = params.get('u') || '';
    const { user: viewer } = useAuth();

    const { data: profileResp, loading: profileLoading } = useCachedQuery<ApiResponse>(
        'profile-v2',
        { action: 'getProfile', username, viewerUserId: viewer?.id || '' },
        { enabled: !!username }
    );

    const { data: entriesResp, loading: entriesLoading } = useCachedQuery<ApiResponse>(
        'profile-entries',
        { action: 'getPublicDiaryEntries', username, limit: 10 },
        { enabled: !!username }
    );

    const profile = profileResp?.profile;
    const entries = entriesResp?.entries || [];

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
                <LoadingOverlay message="Loading steam profile..." />
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

    const lastSeenDate = profile?.lastSeen ? new Date(profile.lastSeen) : null;
    const isOnline = lastSeenDate && (new Date().getTime() - lastSeenDate.getTime() < 5 * 60 * 1000);

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
                    {/* Last Diary Entry */}
                    <div className="card" style={{ borderTop: 'none', background: 'rgba(23, 26, 33, 0.4)' }}>
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
