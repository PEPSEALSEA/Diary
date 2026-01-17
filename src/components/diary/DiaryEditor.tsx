'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api, DiaryEntry, normalizePrivacy, toDisplayDate } from '@/lib/api';
import { User } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import LoadingOverlay from '../LoadingOverlay';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import ImageViewer from '../ImageViewer';

interface DiaryEditorProps {
    user: User;
    onEntryChange: () => void;
    initialDate?: string;
    refreshTrigger?: number;
}

interface UploadQueueItem {
    id: string;
    file: File;
    progress: number;
    status: 'waiting' | 'uploading' | 'processing' | 'saving' | 'done' | 'error';
}

function UploadItem({ item }: { item: UploadQueueItem }) {
    return (
        <div className="upload-item card" style={{ padding: 8 }}>
            <div className="spinner" style={{ width: 16, height: 16, marginBottom: 8 }}></div>
            <div className="truncate" style={{ width: '100%', marginBottom: 4 }}>{item.file.name}</div>
            <div style={{ color: 'var(--accent-2)', fontWeight: 'bold' }}>{item.progress}%</div>
            <div className="progress-container">
                <div className="progress-bar" style={{ width: `${item.progress}%` }}></div>
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase' }}>
                {item.status}
            </div>
        </div>
    );
}

function SortablePicture({ picture, onDelete, onView }: { picture: any, onDelete: (id: string) => void, onView: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: picture.pictureId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        padding: 4,
        position: 'relative' as const,
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        touchAction: 'none' // Prevent scrolling while dragging
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="card"
            onClick={onView}
        >
            <img src={picture.url} alt="Diary" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
            <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(picture.pictureId);
                }}
                className="danger"
                style={{ position: 'absolute', top: 2, right: 2, padding: '2px 6px', fontSize: 10, minWidth: 'auto', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
                ×
            </button>
        </div>
    );
}

export default function DiaryEditor({ user, onEntryChange, initialDate, refreshTrigger = 0 }: DiaryEditorProps) {
    const { toast } = useToast();
    const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [privacy, setPrivacy] = useState<'public' | 'friend' | 'private'>('public');
    const [entryId, setEntryId] = useState<string | null>(null);
    const [pictures, setPictures] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

    const [viewer, setViewer] = useState<{ isOpen: boolean, images: string[], index: number }>({ isOpen: false, images: [], index: 0 });

    const openViewer = (images: string[], index: number) => {
        setViewer({ isOpen: true, images, index });
    };

    const closeViewer = () => setViewer(prev => ({ ...prev, isOpen: false }));

    const [loading, setLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [editMode, setEditMode] = useState(true); // Default to edit mode for simplicity or mimic old app

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setPictures((items) => {
                const oldIndex = items.findIndex(i => i.pictureId === active.id);
                const newIndex = items.findIndex(i => i.pictureId === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Save order
                const ids = newItems.map(i => i.pictureId);
                api.updatePictureOrder(user.id, ids);

                return newItems;
            });
        }
    };

    // Autosavedata
    const lastSavedDiff = useRef({ title, content, privacy, date });

    // Fetch all entries for instant switching
    const { data: entriesData, loading: loadingEntries } = useCachedQuery('user_entries_all', {
        action: 'getUserDiaryEntries',
        userId: user.id
    }, { refreshTrigger }); // Use passed refreshTrigger

    const allEntries: DiaryEntry[] = entriesData?.entries || [];

    // Filter entries for current selected date
    const entriesForDate = allEntries.filter(e => e.date === date);

    // Effect to select an entry when date changes or data loads
    useEffect(() => {
        // If we have an explicit entryId we want to stick to (e.g. after save), try to find it
        if (entryId) {
            const stillExists = entriesForDate.find(e => e.entryId === entryId);
            if (stillExists) {
                loadIntoForm(stillExists);
                return;
            }
        }

        // Otherwise default logic
        if (entriesForDate.length > 0) {
            // Load the most recent one created/modified? Or just the first one?
            // Legacy usually picked the first.
            loadIntoForm(entriesForDate[0]);
        } else {
            clearForm();
        }
        // We only want to run this when date changes or entries list updates widely (initial load)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, entriesData]); // entriesData change means we fetched new list

    const loadIntoForm = (entry: DiaryEntry) => {
        setTitle(String(entry.title || ''));
        setContent(String(entry.content || ''));
        setPrivacy(normalizePrivacy(entry.privacy, entry.isPrivate));
        setEntryId(entry.entryId || null);
        lastSavedDiff.current = {
            title: String(entry.title || ''),
            content: String(entry.content || ''),
            privacy: normalizePrivacy(entry.privacy, entry.isPrivate),
            date: entry.date
        };
        setIsDirty(false);

        // Batch Improvement: Use the pictures already attached to the entry!
        // This avoids extra network calls when switching entries for the same date.
        if (entry.pictures && Array.isArray(entry.pictures)) {
            setPictures(entry.pictures);
        } else if (entry.entryId) {
            loadPictures(entry.entryId);
        } else {
            setPictures([]);
        }
    };

    const loadPictures = async (id: string) => {
        try {
            const res = await api.getEntryPictures(id);
            if (res.success) setPictures(res.pictures || []);
        } catch (e) {
            console.error('Failed to load pictures', e);
        }
    };


    const clearForm = () => {
        setTitle('');
        setContent('');
        setPrivacy('public');
        setEntryId(null);
        setPictures([]);
        lastSavedDiff.current = { title: '', content: '', privacy: 'public', date };
        setIsDirty(false);
    };


    const handleEntrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (id) {
            const entry = entriesForDate.find(en => en.entryId === id);
            if (entry) loadIntoForm(entry);
        } else {
            clearForm();
        }
    };

    const handleSave = async () => {
        if (!content.trim() && !title.trim()) {
            toast('Nothing to save', 'error');
            return;
        }
        setLoading(true);
        try {
            let res;
            if (entryId) {
                const updatePayload = {
                    action: 'updateDiaryEntryById',
                    entryId,
                    title,
                    content,
                    privacy
                };
                res = await api.post(updatePayload);
            } else {
                const savePayload = {
                    action: 'saveDiaryEntry',
                    userId: user.id,
                    title,
                    content,
                    privacy,
                    date
                };
                res = await api.post(savePayload);
            }

            if (res && res.success) {
                toast(entryId ? 'Updated' : 'Saved! +10 XP Gained! ✨');
                // Manually update the local cache/state if possible, or just let onEntryChange trigger a refresh elsewhere?
                // For now, simple re-fetch or optimistically update would be ideal but user asked for "fetch all" capability.
                // We should probably force a refresh of the 'user_entries_all' query.
                // But useCachedQuery doesn't expose that yet easily. 
                // We can rely on window reload or just let the user know.
                // Actually, onEntryChange triggers parent which might trigger refreshTrigger.

                if (res.entryId) setEntryId(res.entryId);
                lastSavedDiff.current = { title, content, privacy, date };
                setIsDirty(false);
                onEntryChange(); // This should trigger refresh in parent
            } else {
                toast(res?.error || 'Save failed', 'error');
            }
        } catch (e: any) {
            toast(e.message || 'Save failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this entry?')) return;
        setLoading(true);
        try {
            const payload = entryId
                ? { action: 'deleteDiaryEntryById', entryId }
                : { action: 'deleteDiaryEntry', userId: user.id, date };

            const res = await api.post(payload);
            if (res.success) {
                // If there were pictures, archive them in Drive
                if (res.driveIds && Array.isArray(res.driveIds) && res.driveIds.length > 0) {
                    try {
                        await api.archiveFiles(res.driveIds);
                    } catch (driveErr) {
                        console.error('Failed to archive files in Drive', driveErr);
                        toast('Deleted entry, but Drive files move failed', 'error');
                    }
                }

                toast('Deleted');
                clearForm();
                onEntryChange();
            } else {
                toast(res.error || 'Delete failed', 'error');
            }
        } catch (e: any) {
            toast(e.message || 'Delete failed', 'error');
        } finally {
            setLoading(false);
        }
    };



    const [autoSaving, setAutoSaving] = useState(false);

    // Auto-save logic
    useEffect(() => {
        if (!isDirty || loading) return;

        const timer = setTimeout(() => {
            handleAutoSave();
        }, 2000); // 2s debounce

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, content, privacy, isDirty]);

    const handleAutoSave = async () => {
        if (!content.trim() && !title.trim()) return;
        setAutoSaving(true);
        try {
            let res;
            if (entryId) {
                res = await api.post({
                    action: 'updateDiaryEntryById',
                    entryId,
                    title,
                    content,
                    privacy
                });
            } else {
                res = await api.post({
                    action: 'saveDiaryEntry',
                    userId: user.id,
                    title,
                    content,
                    privacy,
                    date
                });
            }

            if (res && res.success) {
                if (res.entryId) setEntryId(res.entryId);
                lastSavedDiff.current = { title, content, privacy, date };
                setIsDirty(false);
                onEntryChange();
            }
        } catch (e) {
            console.error('Auto-save failed', e);
        } finally {
            setAutoSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // We need an entryId to link pictures. If it doesn't exist, we must save first.
        let currentEntryId = entryId;
        if (!currentEntryId) {
            setLoading(true);
            try {
                const res = await api.post({
                    action: 'saveDiaryEntry',
                    userId: user.id,
                    title: title || '(Untitled with Pictures)',
                    content: content || '...',
                    privacy,
                    date
                });
                if (res.success && res.entryId) {
                    currentEntryId = res.entryId;
                    setEntryId(currentEntryId);
                    onEntryChange();
                } else {
                    toast('Failed to create entry for pictures', 'error');
                    setLoading(false);
                    return;
                }
            } catch (err) {
                toast('Error creating entry', 'error');
                setLoading(false);
                return;
            } finally {
                setLoading(false);
            }
        }

        setUploading(true);
        const fileArray = Array.from(files);

        // Initialize queue
        const initialQueue: UploadQueueItem[] = fileArray.map((f, i) => ({
            id: `upload-${i}-${Date.now()}`,
            file: f,
            progress: 0,
            status: 'waiting'
        }));
        setUploadQueue(initialQueue);

        let successCount = 0;

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            const currentQueueId = initialQueue[i].id;

            // Update status to uploading
            setUploadQueue(prev => prev.map(item => item.id === currentQueueId ? { ...item, status: 'uploading' } : item));

            try {
                const uploadRes = await api.uploadPicture(file, (percent) => {
                    setUploadQueue(prev => prev.map(item =>
                        item.id === currentQueueId ? { ...item, progress: percent } : item
                    ));
                });

                if (uploadRes.success && uploadRes.driveId) {
                    setUploadQueue(prev => prev.map(item => item.id === currentQueueId ? { ...item, status: 'saving', progress: 100 } : item));

                    const metadataRes = await api.addPictureMetadata(user.id, currentEntryId!, uploadRes.driveId, uploadRes.url);
                    if (metadataRes.success) {
                        successCount++;
                        setUploadQueue(prev => prev.map(item => item.id === currentQueueId ? { ...item, status: 'done' } : item));
                    } else {
                        console.error('Failed to add metadata for', file.name, metadataRes.error);
                        setUploadQueue(prev => prev.map(item => item.id === currentQueueId ? { ...item, status: 'error' } : item));
                    }
                } else {
                    console.error('Upload failed for', file.name, uploadRes.error || uploadRes.message || 'Unknown error');
                    setUploadQueue(prev => prev.map(item => item.id === currentQueueId ? { ...item, status: 'error' } : item));
                }
            } catch (err: any) {
                console.error('Upload failed for', file.name, err);
                setUploadQueue(prev => prev.map(item => item.id === currentQueueId ? { ...item, status: 'error' } : item));
            }
        }

        if (successCount > 0) {
            toast(`Uploaded ${successCount} picture${successCount > 1 ? 's' : ''}`);
            loadPictures(currentEntryId!);
        } else {
            toast(`Failed to upload pictures${fileArray.length > 1 ? ` (tried ${fileArray.length} files)` : ''}.`, 'error');
        }

        // Small delay to let the user see the "done" status before clearing
        setTimeout(() => {
            setUploadQueue([]);
            setUploading(false);
        }, 1000);

        // Reset input
        e.target.value = '';
    };

    const handleDeletePicture = async (pictureId: string) => {
        if (!confirm('Delete this picture?')) return;
        try {
            const res = await api.deletePicture(pictureId, user.id);
            if (res.success) {
                // If there's a driveId, archive it
                if (res.driveId) {
                    try {
                        await api.archiveFiles([res.driveId]);
                    } catch (driveErr) {
                        console.error('Failed to archive file in Drive', driveErr);
                        // We don't necessarily want to block the UI if Drive move fails, 
                        // as the metadata is already gone.
                    }
                }
                toast('Picture deleted');
                setPictures(prev => prev.filter(p => p.pictureId !== pictureId));
            }
        } catch (e) {
            toast('Failed to delete picture', 'error');
        }
    };


    return (
        <div className="card diary-editor-card" style={{ position: 'relative', padding: 0, overflow: 'hidden' }}>
            {(loading || (loadingEntries && allEntries.length === 0)) && <LoadingOverlay message={loading ? "Working..." : "Loading diary..."} />}
            <ImageViewer
                isOpen={viewer.isOpen}
                images={viewer.images}
                initialIndex={viewer.index}
                onClose={closeViewer}
            />

            {/* Header / Toolbar */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
                flexWrap: 'wrap',
                gap: 12
            }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: '1 1 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="helper" style={{ whiteSpace: 'nowrap' }}>Date:</span>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
                        />
                    </div>
                    <div style={{ width: 1, height: 20, background: 'var(--border)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', maxWidth: 300 }}>
                        <span className="helper" style={{ whiteSpace: 'nowrap' }}>Entry:</span>
                        <select
                            value={entryId || ''}
                            onChange={handleEntrySelect}
                            style={{ padding: '6px 10px', fontSize: 13 }}
                        >
                            <option value="">(New Entry)</option>
                            {entriesForDate.map(e => (
                                <option key={e.entryId} value={e.entryId}>
                                    {e.title || '(Untitled)'} {normalizePrivacy(e.privacy, e.isPrivate) === 'private' ? '🔒' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="entry-status code" style={{
                    color: isDirty ? 'var(--accent-2)' : 'var(--ok)',
                    fontSize: 10,
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                }}>
                    <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'currentColor',
                        boxShadow: `0 0 8px currentColor`,
                        animation: autoSaving ? 'pulse 1s infinite' : 'none'
                    }}></div>
                    {autoSaving ? 'Syncing...' : (isDirty ? 'Unsaved' : 'Saved')}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ padding: 24 }}>
                <input
                    value={title}
                    onChange={e => { setTitle(e.target.value); setIsDirty(true); }}
                    placeholder="Entry Title..."
                    style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '2px solid transparent',
                        borderRadius: 0,
                        fontSize: 28,
                        fontWeight: 700,
                        padding: '0 0 8px 0',
                        marginBottom: 16,
                        transition: 'border-color 0.3s'
                    }}
                    className="title-input focus-border-bottom"
                />

                <textarea
                    value={content}
                    onChange={e => { setContent(e.target.value); setIsDirty(true); }}
                    placeholder="Tell your story..."
                    style={{
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 0,
                        fontSize: 16,
                        lineHeight: 1.6,
                        minHeight: 350,
                        padding: 0,
                        resize: 'none'
                    }}
                />

                <div className="spacer" style={{ height: 32 }}></div>

                {/* Pictures Section */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ margin: 0, fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Pictures</h4>
                        <span className="helper">{pictures.length} uploaded</span>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={pictures.map(p => p.pictureId)}
                                strategy={rectSortingStrategy}
                            >
                                {pictures.map((p, idx) => (
                                    <SortablePicture
                                        key={p.pictureId}
                                        picture={p}
                                        onDelete={handleDeletePicture}
                                        onView={() => openViewer(pictures.map(x => x.url), idx)}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

                        {uploadQueue.map(item => (
                            <UploadItem key={item.id} item={item} />
                        ))}

                        {!uploading && (
                            <label className="card add-picture-btn" style={{
                                cursor: 'pointer',
                                width: 100,
                                height: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px dashed var(--border)',
                                margin: 0,
                                transition: 'all 0.2s',
                                background: 'rgba(255,255,255,0.02)'
                            }}>
                                <span style={{ fontSize: 24, color: 'var(--muted)' }}>+</span>
                                <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Add Photo</span>
                                <input type="file" multiple accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
                            </label>
                        )}
                    </div>
                </div>

                <div className="spacer" style={{ height: 32 }}></div>

                {/* Footer Actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border)',
                    paddingTop: 24,
                    flexWrap: 'wrap',
                    gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={{ margin: 0 }}>Privacy Level</label>
                            <select
                                value={privacy}
                                onChange={e => { setPrivacy(e.target.value as any); setIsDirty(true); }}
                                style={{ width: 'auto', padding: '8px 12px', fontSize: 14 }}
                            >
                                <option value="public">🌍 Public</option>
                                <option value="friend">👥 Friends</option>
                                <option value="private">🔒 Private</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        {entryId && (
                            <button className="danger ghost" onClick={handleDelete} disabled={loading} style={{ padding: '10px 20px' }}>
                                {loading ? <div className="spinner" style={{ width: 14, height: 14, margin: 0 }}></div> : 'Delete Entry'}
                            </button>
                        )}
                        <button onClick={handleSave} disabled={loading} style={{ padding: '10px 32px', minWidth: 120, background: isDirty ? 'var(--accent)' : 'var(--border)', color: isDirty ? 'white' : 'var(--muted)' }}>
                            {loading ? <div className="spinner" style={{ width: 14, height: 14, margin: 0 }}></div> : (entryId ? 'Update' : 'Save')}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .title-input:focus {
                    border-bottom-color: var(--accent) !important;
                    box-shadow: none !important;
                }
                .diary-editor-card .card:hover {
                    border-color: var(--accent-2);
                    background: rgba(255,255,255,0.05);
                }
                .add-picture-btn:hover {
                    border-color: var(--accent) !important;
                    background: rgba(59, 130, 246, 0.05) !important;
                }
                @media (max-width: 600px) {
                    .diary-editor-card textarea {
                        min-height: 250px;
                    }
                }
            `}</style>
        </div>
    );
}
