import React, { useState, useEffect } from 'react';
import { FiUser, FiMail, FiLock } from 'react-icons/fi';
import '../styles/auth.css';

// Internal Typewriter Component for elegant branding reveal
const Typewriter = ({ text, delay = 100, onComplete }) => {
    const lines = text.split('<br />');
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [currentText, setCurrentText] = useState('');
    const [completedLines, setCompletedLines] = useState([]);

    useEffect(() => {
        if (currentLineIndex < lines.length) {
            const line = lines[currentLineIndex];
            if (currentText.length < line.length) {
                const timeout = setTimeout(() => {
                    setCurrentText(line.substring(0, currentText.length + 1));
                }, delay);
                return () => clearTimeout(timeout);
            } else {
                // Line finished
                if (currentLineIndex < lines.length - 1) {
                    setCompletedLines(prev => [...prev, currentText]);
                    setCurrentText('');
                    setCurrentLineIndex(prev => prev + 1);
                } else if (onComplete) {
                    onComplete();
                }
            }
        }
    }, [currentLineIndex, currentText, delay, lines, onComplete]);

    const isTyping = currentLineIndex < lines.length && (currentText.length < lines[currentLineIndex].length || currentLineIndex < lines.length - 1);

    return (
        <span className={isTyping ? 'typing-cursor' : ''}>
            {completedLines.map((line, i) => (
                <React.Fragment key={i}>
                    {line}
                    <br />
                </React.Fragment>
            ))}
            {currentText}
        </span>
    );
};

// Helper to safely extract string messages from complex error objects
const parseErrorMessage = (detail) => {
    if (!detail) return null;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail.map(e => (typeof e === 'object' ? e.msg : String(e))).join(', ');
    }
    if (typeof detail === 'object') {
        return detail.msg || JSON.stringify(detail);
    }
    return String(detail);
};

export function LoginPage({ onLoginSuccess, onSwitchToSignup, apiEndpoint }) {
    const [formData, setFormData] = useState({ username_or_email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        console.log('LOGIN ATTEMPT:', { apiEndpoint, formData: { ...formData, password: '***' } });

        try {
            const response = await fetch(`${apiEndpoint}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            console.log('LOGIN RESPONSE:', { status: response.status, ok: response.ok });

            const data = await response.json();
            console.log('LOGIN DATA:', data);

            if (response.ok && data.success) {
                onLoginSuccess(data.user);
            } else {
                const errorMsg = parseErrorMessage(data.detail) || 'Access denied. Please check your credentials.';
                console.error('LOGIN FAILED:', errorMsg);
                setError(errorMsg);
            }
        } catch (err) {
            console.error('LOGIN ERROR:', err);
            setError('Connection error. Is the terminal server active?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-image-side">
                <div className="auth-image-content">
                    <h1><Typewriter text="SAP TRM<br />Assistant" delay={80} /></h1>
                    <p>Experience the next generation of SAP Treasury and Risk Management with our AI-powered technical assistant.</p>
                </div>
            </div>
            <div className="auth-form-side">
                <div className="auth-form-container">
                    <div className="auth-header">
                        <h1>Sign In</h1>
                        <p>Access your workstation</p>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="auth-group">
                            <label>Identity</label>
                            <div className="auth-input-wrapper">
                                <FiUser />
                                <input
                                    type="text"
                                    placeholder="Username or Email"
                                    value={formData.username_or_email}
                                    onChange={(e) => setFormData({ ...formData, username_or_email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-group">
                            <label>Password</label>
                            <div className="auth-input-wrapper">
                                <FiLock />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="auth-switch">
                        Need an account?
                        <button className="auth-switch-btn" onClick={onSwitchToSignup}>Create profile</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SignupPage({ onSignupSuccess, onSwitchToLogin, apiEndpoint }) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${apiEndpoint}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.fullName
                })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                onSignupSuccess();
            } else {
                setError(parseErrorMessage(data.detail) || 'Signup failed. Please try again.');
            }
        } catch (err) {
            setError('Connection error. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-image-side">
                <div className="auth-image-content">
                    <h1><Typewriter text="Secure<br />Enterprise Platform" delay={80} /></h1>
                    <p>Experience the next generation of SAP Treasury and Risk Management with our AI-powered technical assistant.</p>
                </div>
            </div>
            <div className="auth-form-side">
                <div className="auth-form-container">
                    <div className="auth-header">
                        <h1>Create Profile</h1>
                        <p>Initialize access</p>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="auth-group">
                            <label>Name</label>
                            <div className="auth-input-wrapper">
                                <FiUser />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-group">
                            <label>Username</label>
                            <div className="auth-input-wrapper">
                                <FiUser />
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-group">
                            <label>Email</label>
                            <div className="auth-input-wrapper">
                                <FiMail />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-group">
                            <label>Password</label>
                            <div className="auth-input-wrapper">
                                <FiLock />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Creating...' : 'Get Started'}
                        </button>
                    </form>

                    <div className="auth-switch">
                        Already have access?
                        <button className="auth-switch-btn" onClick={onSwitchToLogin}>Sign In</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
