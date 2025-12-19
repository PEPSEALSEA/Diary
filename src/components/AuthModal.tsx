'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import LoadingOverlay from './LoadingOverlay';

interface AuthModalProps {
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

export default function AuthModal({ onClose, initialMode = 'login' }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);
    // Separate states for clarity, though identifier handles both for login
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');

    // Register fields
    const [regEmail, setRegEmail] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');

    const { setUser } = useAuth();
    const { toast } = useToast();

    const handleLogin = async () => {
        if (!identifier || !password) {
            toast('Please enter username/email and password', 'error');
            return;
        }
        setLoading(true);
        setLoadingMsg('Logging in...');
        try {
            const res = await api.post({ action: 'login', identifier, password });
            if (res.success && res.user) {
                setUser(res.user);
                toast('Welcome back!');
                onClose();
            } else {
                toast(res.error || 'Login failed', 'error');
            }
        } catch (e: any) {
            toast(e.message || 'Login failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!regEmail || !regUsername || !regPassword) {
            toast('All fields are required', 'error');
            return;
        }
        if (regUsername.length < 5 || regUsername.length > 20) {
            toast('Username must be 5-20 characters', 'error');
            return;
        }
        setLoading(true);
        setLoadingMsg('Creating account...');
        try {
            const res = await api.post({ action: 'register', email: regEmail, username: regUsername, password: regPassword });
            if (res.success) {
                setLoadingMsg('Logging you in...');
                // Auto login
                const loginRes = await api.post({ action: 'login', identifier: regEmail, password: regPassword });
                if (loginRes.success && loginRes.user) {
                    setUser(loginRes.user);
                    toast('Account created!');
                    onClose();
                } else {
                    toast('Account created, please login', 'success');
                    setMode('login');
                    // reset logic slightly to prep for login form
                    setIdentifier(regEmail);
                }
            } else {
                toast(res.error || 'Registration failed', 'error');
            }
        } catch (e: any) {
            toast(e.message || 'Error', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Close when clicking outside content
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !loading) {
            onClose();
        }
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content">
                {loading && <LoadingOverlay message={loadingMsg} />}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 18 }}>{mode === 'login' ? 'Login' : 'Register'}</div>
                    <button className="auth-close" onClick={onClose} disabled={loading}>Close</button>
                </div>

                {mode === 'login' ? (
                    <div>
                        <label>Username or Email</label>
                        <input
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            placeholder="you@example.com or username"
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            disabled={loading}
                        />
                        <div className="spacer"></div>
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            disabled={loading}
                        />
                        <div className="spacer"></div>
                        <button style={{ width: '100%' }} onClick={handleLogin} disabled={loading}>
                            Login
                        </button>
                        <div className="spacer"></div>
                        <div className="auth-switch helper">
                            No account? <a onClick={() => !loading && setMode('register')}>Register</a>
                        </div>
                    </div>
                ) : (
                    <div>
                        <label>Email</label>
                        <input
                            value={regEmail}
                            onChange={e => setRegEmail(e.target.value)}
                            placeholder="you@example.com"
                            disabled={loading}
                        />
                        <div className="spacer"></div>
                        <label>Username</label>
                        <input
                            value={regUsername}
                            onChange={e => setRegUsername(e.target.value)}
                            placeholder="yourname"
                            disabled={loading}
                        />
                        <div className="spacer"></div>
                        <label>Password</label>
                        <input
                            type="password"
                            value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRegister()}
                            disabled={loading}
                        />
                        <div className="spacer"></div>
                        <button style={{ width: '100%' }} onClick={handleRegister} disabled={loading}>
                            Create account
                        </button>
                        <div className="spacer"></div>
                        <div className="auth-switch helper">
                            Have an account? <a onClick={() => !loading && setMode('login')}>Login</a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
