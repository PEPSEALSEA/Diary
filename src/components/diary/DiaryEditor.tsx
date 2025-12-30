'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api, DiaryEntry, normalizePrivacy, toDisplayDate } from '@/lib/api';
import { User } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import LoadingOverlay from '../LoadingOverlay';
import { useCachedQuery } from '@/hooks/useCachedQuery';

interface DiaryEditorProps {
    user: User;
    onEntryChange: () => void;
    initialDate?: string;
    refreshTrigger?: number;
}

export default function DiaryEditor({ user, onEntryChange, initialDate, refreshTrigger = 0 }: DiaryEditorProps) {
    const { toast } = useToast();
    const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [privacy, setPrivacy] = useState<'public' | 'friend' | 'private'>('public');
    const [entryId, setEntryId] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [editMode, setEditMode] = useState(true); // Default to edit mode for simplicity or mimic old app

    // Autosave
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
        setTitle(entry.title || '');
        setContent(entry.content || '');
        setPrivacy(normalizePrivacy(entry.privacy, entry.isPrivate));
        setEntryId(entry.entryId || null);
        lastSavedDiff.current = {
            title: entry.title || '',
            content: entry.content || '',
            privacy: normalizePrivacy(entry.privacy, entry.isPrivate),
            date: entry.date
        };
        setIsDirty(false);
    };

    const clearForm = () => {
        setTitle('');
        setContent('');
        setPrivacy('public');
        setEntryId(null);
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

    return (
        <div className="card" style={{ position: 'relative' }}>
            {(loading || (loadingEntries && allEntries.length === 0)) && <LoadingOverlay message={loading ? "Working..." : "Loading diary..."} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <div className="helper">Editor</div>
                <div className="entry-status code" style={{ color: isDirty ? 'var(--accent-2)' : 'var(--muted)' }}>
                    {autoSaving ? 'Auto-saving...' : (isDirty ? 'Unsaved changes' : 'Saved')}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                    <label>Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                    <label>Select Entry</label>
                    <select value={entryId || ''} onChange={handleEntrySelect}>
                        <option value="">(New Entry)</option>
                        {entriesForDate.map(e => (
                            <option key={e.entryId} value={e.entryId}>
                                {e.title || '(Untitled)'} {normalizePrivacy(e.privacy, e.isPrivate) === 'private' ? '🔒' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="spacer"></div>

            <label>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
            <div className="spacer"></div>

            <label>Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your day..." />
            <div className="spacer"></div>

            <label>Privacy</label>
            <select value={privacy} onChange={e => setPrivacy(e.target.value as any)}>
                <option value="public">Public (anyone)</option>
                <option value="friend">Friend (approved users)</option>
                <option value="private">Private (only you)</option>
            </select>
            <div className="spacer"></div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={handleSave} disabled={loading}>{entryId ? 'Update' : 'Save'}</button>
                {entryId && <button className="danger" onClick={handleDelete} disabled={loading}>Delete</button>}
            </div>
        </div>
    );
}
