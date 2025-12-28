'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import LoadingOverlay from './LoadingOverlay';

declare global {
    interface Window {
        google: any;
    }
}

interface AuthModalProps {
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

export default function AuthModal({ onClose, initialMode = 'login' }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'register' | 'google-setup'>(initialMode);
    // Separate states for clarity, though identifier handles both for login
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');

    // Register fields
    const [regEmail, setRegEmail] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');

    // Google Setup fields
    const [googleEmail, setGoogleEmail] = useState('');
    const [googleCredential, setGoogleCredential] = useState('');
    const [googleUsername, setGoogleUsername] = useState('');

    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');

    const { setUser } = useAuth();
    const { toast } = useToast();

    const handleGoogleResponse = async (response: any) => {
        setLoading(true);
        setLoadingMsg('Verifying with Google...');
        try {
            const res = await api.post({ action: 'googleLogin', credential: response.credential });
            if (res.success && res.user) {
                setUser(res.user);
                toast('Logged in with Google!');
                onClose();
            } else if (res.requireSetup) {
                // New user flow
                setGoogleEmail(res.email);
                setGoogleCredential(res.credential);
                setMode('google-setup');
                setLoadingMsg('');
            } else {
                toast(res.error || 'Google login failed', 'error');
            }
        } catch (e: any) {
            toast(e.message || 'Google login failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        if (!googleUsername) {
            toast('Please enter a display name', 'error');
            return;
        }
        if (googleUsername.length < 5 || googleUsername.length > 20) {
            toast('Username must be 5-20 characters', 'error');
            return;
        }

        setLoading(true);
        setLoadingMsg('Finalizing setup...');
        try {
            const res = await api.post({
                action: 'googleRegister',
                credential: googleCredential,
                username: googleUsername
            });

            if (res.success && res.user) {
                setUser(res.user);
                toast('Welcome! Account created.');
                onClose();
            } else {
                toast(res.error || 'Registration failed', 'error');
            }
        } catch (e: any) {
            toast(e.message || 'Error', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only load GSI if not in google-setup mode (or maybe just keep it, doesn't hurt)
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: '787988651964-gf258mnif89bu6g0jao2mpdsm72j96da.apps.googleusercontent.com',
                    callback: handleGoogleResponse
                });
                // Only render button if element exists
                const btn = document.getElementById('googleSignInBtn');
                if (btn) {
                    window.google.accounts.id.renderButton(
                        btn,
                        { theme: 'outline', size: 'large', width: '380' }
                    );
                }
            }
        };
        document.body.appendChild(script);

        return () => {
            try {
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
            } catch (e) { }
        };
    }, [mode]); // Re-run if mode changes so button re-renders if going back

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
                    <div style={{ fontWeight: 600, fontSize: 18 }}>
                        {mode === 'login' ? 'Login' : mode === 'register' ? 'Register' : 'Finish Setup'}
                    </div>
                    <button className="auth-close" onClick={onClose} disabled={loading}>Close</button>
                </div>

                {mode === 'login' ? (
                    <div>
                        <div id="googleSignInBtn" style={{ minHeight: 40, marginBottom: 16, width: '100%' }}></div>
                        <div className="spacer" style={{ marginBottom: 16, borderBottom: '1px solid #ccc' }}></div>

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
                ) : mode === 'register' ? (
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
                ) : (
                    // GOOGLE SETUP MODE
                    <div>
                        <div style={{ marginBottom: 16, fontSize: '0.9em', color: '#666' }}>
                            You're almost there! Choose a display name to complete your profile for <b>{googleEmail}</b>.
                        </div>
                        <label>Display Name (Username)</label>
                        <input
                            value={googleUsername}
                            onChange={e => setGoogleUsername(e.target.value)}
                            placeholder="e.g. DiaryUser123"
                            onKeyDown={e => e.key === 'Enter' && handleGoogleRegister()}
                            disabled={loading}
                        />
                        <div className="spacer"></div>
                        <button style={{ width: '100%' }} onClick={handleGoogleRegister} disabled={loading}>
                            Complete Signup
                        </button>
                        <div className="spacer"></div>
                        <div className="auth-switch helper">
                            <a onClick={() => {
                                setMode('login');
                                setGoogleCredential('');
                            }}>Back to Login</a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
