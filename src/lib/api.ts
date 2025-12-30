export interface User {
    id: string;
    email: string;
    username: string;
    avatarUrl?: string;
    level?: number;
    exp?: number;
    lastSeen?: string;
}

export interface Friend {
    friendUserId: string;
    friendEmail: string;
    friendUsername: string;
    lastSeen: string;
    created: string;
}

export interface ProfileData {
    id: string;
    username: string;
    avatarUrl: string;
    level: number;
    exp: number;
    lastSeen: string;
    created: string;
    totalEntries: number;
    lastEntry: {
        title: string;
        date: string;
        created: string;
    } | null;
    friends: Friend[];
}

export interface DiaryEntry {
    entryId?: string;
    date: string;
    title: string;
    content: string;
    privacy: 'public' | 'friend' | 'private';
    isPrivate?: string | boolean;
    created?: string;
    lastModified?: string;
    username?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    error?: string;
    // Dynamic fields based on response
    user?: User;
    entries?: DiaryEntry[];
    entry?: DiaryEntry;
    profile?: ProfileData;
    friends?: Friend[];
    total?: number;
    [key: string]: any;
}

const API_URL = 'https://script.google.com/macros/s/AKfycbxR7BQFNg_LHPspcMYXLpdwMQ6Ql6fzr1DVDryXCYdW4aPJlvb4oXFPx-Tng4ofmQLvmw/exec';
const OTP_API_URL = 'https://script.google.com/macros/s/AKfycbzEBBDzJvZvCWYJsoa0HwPwrPWu0AQAbnj8d0uUUNY2xYcFXiIagSsD1GEmHvKgLT5Q2w/exec';

async function apiRequest<T = any>(
    url: string,
    method: 'GET' | 'POST',
    params: Record<string, string | number | undefined>
): Promise<ApiResponse<T>> {
    if (method === 'GET') {
        const qs = new URLSearchParams(params as Record<string, string>).toString();
        const res = await fetch(`${url}?${qs}`, { method: 'GET' });
        return res.json();
    } else {
        // API expects x-www-form-urlencoded
        const form = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined) form.append(k, String(v));
        });
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
        });
        return res.json();
    }
}

export interface FriendRequest {
    requesterId: string;
    requesterUsername: string;
    requesterAvatar: string;
    created: string;
}

export const api = {
    get: (params: any) => apiRequest(API_URL, 'GET', params),
    post: (params: any) => apiRequest(API_URL, 'POST', params),
    otpGet: (params: any) => apiRequest(OTP_API_URL, 'GET', params),
    otpPost: (params: any) => apiRequest(OTP_API_URL, 'POST', params),

    // Friend helpers
    addFriend: (fromId: string, toIdentifier: string) => api.post({ action: 'addFriend', fromId, toIdentifier }),
    acceptFriend: (userId: string, requesterId: string) => api.post({ action: 'acceptFriendRequest', userId, requesterId }),
    declineFriend: (userId: string, requesterId: string) => api.post({ action: 'declineFriendRequest', userId, requesterId }),
    listRequests: (userId: string) => api.get({ action: 'listFriendRequests', userId }),
    removeFriend: (userId: string, friendId: string) => api.post({ action: 'removeFriend', userId, friendId }),
    searchUsers: (query: string) => api.get({ action: 'searchUsers', query }),
    getFriendships: (userId: string) => api.get({ action: 'getFriendships', userId }),
};

export const normalizePrivacy = (privacy?: string, isPrivate?: string | boolean): 'public' | 'friend' | 'private' => {
    const v = privacy ? String(privacy).toLowerCase() : null;
    if (v === 'public' || v === 'friend' || v === 'private') return v;
    if (v === 'true') return 'private';
    if (v === 'false') return 'public';

    if (typeof isPrivate === 'boolean') return isPrivate ? 'private' : 'public';
    if (isPrivate === 'true') return 'private';
    if (isPrivate === 'false') return 'public';
    return 'public';
};

export function toDisplayDate(iso: string) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
}

export function toIsoDate(maybe: string) {
    if (!maybe) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(maybe)) return maybe;
    const m = maybe.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) return m[3] + '-' + m[2] + '-' + m[1];
    return maybe;
}
