'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { User, api } from '@/lib/api';

interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    setUser: () => { },
    loading: true,
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUserState] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = storage.get<User>('diary_user');
        if (u) setUserState(u);
        setLoading(false);
    }, []);

    const setUser = (u: User | null) => {
        setUserState(u);
        if (u) storage.set('diary_user', u);
        else storage.del('diary_user');
    };

    useEffect(() => {
        if (!user) return;
        // Initial ping
        api.post({ action: 'ping', userId: user.id });

        const interval = setInterval(() => {
            api.post({ action: 'ping', userId: user.id });
        }, 4 * 60 * 1000); // every 4 minutes

        return () => clearInterval(interval);
    }, [user]);

    const logout = () => {
        setUser(null);
        window.location.reload(); // clear state clean
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
