'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { api, DiaryEntry, toDisplayDate, toIsoDate, normalizePrivacy } from '@/lib/api';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import LoadingOverlay from '@/components/LoadingOverlay';
import ImageViewer from '@/components/ImageViewer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

                        <div className="markdown-content" style={{ lineHeight: 1.6, fontSize: 16 }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {entry.content}
                            </ReactMarkdown>
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

            <style jsx global>{`
                .markdown-content {
                    color: var(--text);
                }
                .markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4 {
                    margin-top: 24px;
                    margin-bottom: 16px;
                    font-weight: 600;
                    line-height: 1.25;
                }
                .markdown-content h1 { font-size: 2em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
                .markdown-content h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
                .markdown-content h3 { font-size: 1.25em; }
                .markdown-content h4 { font-size: 1em; }
                .markdown-content p { margin-top: 0; margin-bottom: 16px; }
                .markdown-content blockquote {
                    padding: 0 1em;
                    color: var(--muted);
                    border-left: 0.25em solid var(--accent);
                    margin: 0 0 16px 0;
                }
                .markdown-content code {
                    padding: 0.2em 0.4em;
                    margin: 0;
                    font-size: 85%;
                    background-color: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
                }
                .markdown-content pre {
                    padding: 16px;
                    overflow: auto;
                    font-size: 85%;
                    line-height: 1.45;
                    background-color: rgba(255, 255, 255, 0.03);
                    border-radius: 6px;
                    margin-bottom: 16px;
                }
                .markdown-content pre code {
                    padding: 0;
                    margin: 0;
                    background-color: transparent;
                    border: 0;
                }
                .markdown-content ul, .markdown-content ol {
                    padding-left: 2em;
                    margin-bottom: 16px;
                }
                .markdown-content table {
                    border-spacing: 0;
                    border-collapse: collapse;
                    margin-bottom: 16px;
                    width: 100%;
                }
                .markdown-content table th, .markdown-content table td {
                    padding: 6px 13px;
                    border: 1px solid var(--border);
                }
                .markdown-content table tr {
                    background-color: transparent;
                    border-top: 1px solid var(--border);
                }
                .markdown-content table tr:nth-child(2n) {
                    background-color: rgba(255, 255, 255, 0.02);
                }
                .markdown-content img {
                    max-width: 100%;
                    box-sizing: content-box;
                }
                .markdown-content hr {
                    height: 0.25em;
                    padding: 0;
                    margin: 24px 0;
                    background-color: var(--border);
                    border: 0;
                }
                .markdown-content .task-list-item {
                    list-style-type: none;
                }
                .markdown-content .task-list-item input {
                    width: auto;
                    margin-right: 8px;
                }
            `}</style>

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
