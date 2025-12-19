'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api, DiaryEntry, normalizePrivacy, toDisplayDate } from '@/lib/api';
import { User } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import LoadingOverlay from '../LoadingOverlay';

interface DiaryEditorProps {
    user: User;
    onEntryChange: () => void;
    initialDate?: string;
}

export default function DiaryEditor({ user, onEntryChange, initialDate }: DiaryEditorProps) {
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

    useEffect(() => {
        loadEntry(date);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    const loadEntry = async (d: string) => {
        setLoading(true);
        try {
            const res = await api.get({ action: 'getUserDiaryEntry', userId: user.id, date: d });
            if (res.success && res.entry) {
                setTitle(res.entry.title || '');
                setContent(res.entry.content || '');
                setPrivacy(normalizePrivacy(res.entry.privacy, res.entry.isPrivate));
                setEntryId(res.entry.entryId || null);
                lastSavedDiff.current = {
                    title: res.entry.title || '',
                    content: res.entry.content || '',
                    privacy: normalizePrivacy(res.entry.privacy, res.entry.isPrivate),
                    date: d
                };
            } else {
                // No entry
                setTitle('');
                setContent('');
                setPrivacy('public');
                setEntryId(null);
                lastSavedDiff.current = { title: '', content: '', privacy: 'public', date: d };
            }
            setIsDirty(false);
        } catch (e) {
            console.error(e);
            toast('Failed to load entry', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!content.trim() && !title.trim()) {
            toast('Nothing to save', 'error');
            return;
        }
        setLoading(true);
        try {
            const payload: any = {
                title,
                content,
                privacy,
                date
            };

            let res;
            if (entryId) {
                payload.action = 'updateDiaryEntryById';
                payload.entryId = entryId;
                res = await api.post(payload);
            } else {
                payload.action = 'saveDiaryEntry';
                payload.userId = user.id;
                res = await api.post(payload);
            }

            if (res.success) {
                toast('Saved');
                if (res.entryId) setEntryId(res.entryId);
                lastSavedDiff.current = { title, content, privacy, date };
                setIsDirty(false);
                onEntryChange();
            } else {
                toast(res.error || 'Save failed', 'error');
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
            // Fallback to delete by date if no ID (legacy support), but prefer ID
            const payload = entryId
                ? { action: 'deleteDiaryEntryById', entryId }
                : { action: 'deleteDiaryEntry', userId: user.id, date };

            const res = await api.post(payload);
            if (res.success) {
                toast('Deleted');
                setTitle('');
                setContent('');
                setPrivacy('public');
                setEntryId(null);
                setIsDirty(false);
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

    // Simple dirty check for autosave suggestion or visual cue
    useEffect(() => {
        const d = lastSavedDiff.current;
        const dirty = title !== d.title || content !== d.content || privacy !== d.privacy;
        setIsDirty(dirty);
    }, [title, content, privacy]);

    return (
        <div className="card" style={{ position: 'relative' }}>
            {loading && <LoadingOverlay message="Working..." />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <div className="helper">Editor</div>
                <div className="entry-status code">
                    {isDirty ? 'Unsaved changes' : 'Saved'}
                </div>
            </div>

            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
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
