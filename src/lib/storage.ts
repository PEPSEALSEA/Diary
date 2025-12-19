export const storage = {
    set(k: string, v: any, days: number = 30) {
        if (typeof document === 'undefined') return;
        const value = typeof v === 'string' ? v : JSON.stringify(v);
        const expires = days ? "; max-age=" + (days * 24 * 60 * 60) : '';
        document.cookie = encodeURIComponent(k) + "=" + encodeURIComponent(value) + expires + "; path=/";
    },
    get<T = any>(k: string): T | null {
        if (typeof document === 'undefined') return null;
        const name = encodeURIComponent(k) + "=";
        const parts = document.cookie.split('; ');
        for (const p of parts) {
            if (p.startsWith(name)) {
                const val = decodeURIComponent(p.substring(name.length));
                try { return JSON.parse(val); } catch { return val as unknown as T; }
            }
        }
        return null;
    },
    del(k: string) {
        if (typeof document === 'undefined') return;
        document.cookie = encodeURIComponent(k) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    }
};
