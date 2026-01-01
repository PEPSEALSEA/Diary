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
    isFriend?: boolean;
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
// google-apps-script.js
const API_URL = 'https://script.google.com/macros/s/AKfycbxR7BQFNg_LHPspcMYXLpdwMQ6Ql6fzr1DVDryXCYdW4aPJlvb4oXFPx-Tng4ofmQLvmw/exec';
// google-apps-script-download.js
const DOWNLOAD_API_URL = 'https://script.google.com/macros/s/AKfycbzFMJfzkx4d_14TdMhb-UcPbke7zGLHfTQI-P5u8uCrDDaiNncrgaWfdnRjX9SRSNLLQg/exec';
// google-apps-script-verify-opt.js
const OTP_API_URL = 'https://script.google.com/macros/s/AKfycbzEBBDzJvZvCWYJsoa0HwPwrPWu0AQAbnj8d0uUUNY2xYcFXiIagSsD1GEmHvKgLT5Q2w/exec';

async function apiRequest<T = any>(
    url: string,
    method: 'GET' | 'POST',
    params: Record<string, string | number | undefined> | FormData,
    isJsonBody: boolean = false
): Promise<ApiResponse<T>> {
    if (method === 'GET') {
        const qs = new URLSearchParams(params as Record<string, string>).toString();
        const res = await fetch(`${url}?${qs}`, { method: 'GET' });
        return res.json();
    } else {
        const fetchOptions: RequestInit = {
            method: 'POST',
            redirect: 'follow'
        };

        const urlWithParams = new URL(url);

        if (params instanceof FormData) {
            const action = params.get('action');
            const filename = params.get('filename');
            const contentType = params.get('contentType');
            
            if (action) urlWithParams.searchParams.append('action', String(action));
            if (filename) urlWithParams.searchParams.append('filename', String(filename));
            if (contentType) urlWithParams.searchParams.append('contentType', String(contentType));
            
            fetchOptions.body = params;
        } else {
            const action = params.action;
            if (action) urlWithParams.searchParams.append('action', String(action));
            if (params.filename) urlWithParams.searchParams.append('filename', String(params.filename));
            if (params.contentType) urlWithParams.searchParams.append('contentType', String(params.contentType));

            if (isJsonBody) {
                fetchOptions.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
                fetchOptions.body = JSON.stringify(params);
            } else {
                const form = new URLSearchParams();
                Object.entries(params).forEach(([k, v]) => {
                    if (v !== undefined) form.append(k, String(v));
                });
                fetchOptions.body = form.toString();
                fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            }
        }

        const res = await fetch(urlWithParams.toString(), fetchOptions);
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
    post: (params: any) => apiRequest(API_URL, 'POST', params, true),
    otpGet: (params: any) => apiRequest(OTP_API_URL, 'GET', params),
    otpPost: (params: any) => apiRequest(OTP_API_URL, 'POST', params, true),

    // Friend helpers
    addFriend: (fromId: string, toIdentifier: string) => api.post({ action: 'addFriend', fromId, toIdentifier }),
    acceptFriend: (userId: string, requesterId: string) => api.post({ action: 'acceptFriendRequest', userId, requesterId }),
    declineFriend: (userId: string, requesterId: string) => api.post({ action: 'declineFriendRequest', userId, requesterId }),
    listRequests: (userId: string) => api.get({ action: 'listFriendRequests', userId }),
    removeFriend: (userId: string, friendId: string) => api.post({ action: 'removeFriend', userId, friendId }),
    searchUsers: (query: string) => api.get({ action: 'searchUsers', query }),
    getFriendships: (userId: string) => api.get({ action: 'getFriendships', userId }),

    // Picture helpers
    postToUrl: (url: string, params: any) => apiRequest(url, 'POST', params),
    uploadPicture: async (file: File) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64String = (reader.result as string).split(',')[1];
                    if (!base64String) {
                        reject(new Error('Failed to convert file to base64'));
                        return;
                    }
                    
                    const params = {
                        action: 'upload',
                        filename: file.name,
                        contentType: file.type || 'image/jpeg',
                        content: base64String
                    };
                    
                    try {
                        const res = await apiRequest(DOWNLOAD_API_URL, 'POST', params, true);
                        if (res && res.success) {
                            resolve(res);
                        } else {
                            const errorMsg = res?.message || res?.error || 'Upload failed';
                            console.error('Upload failed:', errorMsg, res);
                            reject(new Error(errorMsg));
                        }
                    } catch (fetchError: any) {
                        console.error('Upload fetch error:', fetchError);
                        const errorMsg = fetchError?.message || fetchError?.toString() || 'Failed to upload file';
                        reject(new Error(errorMsg));
                    }
                } catch (e) {
                    console.error('Upload Error:', e);
                    reject(e);
                }
            };
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            reader.readAsDataURL(file);
        });
    },
    addPictureMetadata: (userId: string, entryId: string, driveId: string, url: string) =>
        api.post({ action: 'addPictureMetadata', userId, entryId, driveId, url }),
    getEntryPictures: (entryId: string) => api.get({ action: 'getEntryPictures', entryId }),
    deletePicture: (pictureId: string, userId: string) => api.post({ action: 'deletePicture', pictureId, userId })
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
