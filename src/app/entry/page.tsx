'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { api, DiaryEntry, toDisplayDate, toIsoDate, normalizePrivacy } from '@/lib/api';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import LoadingOverlay from '@/components/LoadingOverlay';
import ImageViewer from '@/components/ImageViewer';

function EntryContent() {
    const params = useSearchParams();
    const username = params.get('u') || '';
    const dateParam = params.get('d') || '';

    const { user } = useAuth();
    const [entry, setEntry] = useState<DiaryEntry | null>(null);
    const [pictures, setPictures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');

    const [viewer, setViewer] = useState<{ isOpen: boolean, images: string[], index: number }>({ isOpen: false, images: [], index: 0 });

    const openViewer = (images: string[], index: number) => {
        setViewer({ isOpen: true, images, index });
    };

    const closeViewer = () => setViewer(prev => ({ ...prev, isOpen: false }));

    useEffect(() => {
        if (username && dateParam) loadEntry();
    }, [username, dateParam, user]);

    const loadEntry = async () => {
        setLoading(true);
        setError('');
        const isoDate = toIsoDate(dateParam);

        try {
            const payload: any = {
                action: 'getDiaryEntry',
                username,
                date: isoDate
            };
            if (user) {
                payload.viewerUserId = user.id;
                payload.viewerEmail = user.email;
            }

            const res = await api.get(payload);
            if (res.success && res.entry) {
                setEntry(res.entry);
                if (res.entry.entryId) {
                    const picsRes = await api.getEntryPictures(res.entry.entryId);
                    if (picsRes.success) setPictures(picsRes.pictures || []);
                }
            } else {

                setError(res.error || 'Entry not found or private');
            }
        } catch (e: any) {
            setError(e.message || 'Error loading entry');
        } finally {
            setLoading(false);
        }
    };

    if (!username || !dateParam) return <div className="container"><Header />Invalid link</div>;

    return (
        <div className="container">
            <ImageViewer
                isOpen={viewer.isOpen}
                images={viewer.images}
                initialIndex={viewer.index}
                onClose={closeViewer}
            />
            <Header />

            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {loading ? <div className="card" style={{ minHeight: 200, position: 'relative' }}><LoadingOverlay message="Loading entry..." /></div> : error ? (
                    <div className="notice error">{error}</div>
                ) : entry ? (
                    <div className="card" style={{ position: 'relative' }}>
                        <div style={{ marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                            <h1 style={{ margin: '0 0 8px 0', fontSize: 28 }}>{entry.title || 'Untitled'}</h1>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Link href={`/profile?u=${encodeURIComponent(username)}`} className="badge" style={{ textDecoration: 'none' }}>{username}</Link>
                                    <span className="helper">{toDisplayDate(entry.date)}</span>
                                </div>
                                <div className="badge">{normalizePrivacy(entry.privacy, entry.isPrivate)}</div>
                            </div>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 16 }}>
                            {entry.content}
                        </div>

                        {pictures.length > 0 && (
                            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                                {pictures.map((p, idx) => (
                                    <div
                                        key={p.pictureId}
                                        onClick={() => openViewer(pictures.map(x => x.url), idx)}
                                        className="card"
                                        style={{ padding: 4, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                                    >
                                        <img src={p.url} alt="Diary entry" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                ) : null}

                <div style={{ marginTop: 24, textAlign: 'center' }}>
                    <Link href={`/profile?u=${encodeURIComponent(username)}`} className="link">View more from {username}</Link>
                </div>
            </div>
            <div className="footer">Make By PEPSEALSEA ©2025</div>
        </div>
    );
}

export default function EntryPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EntryContent />
        </Suspense>
    );
}
