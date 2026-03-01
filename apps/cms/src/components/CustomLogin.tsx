/**
 * Custom Login Component — replaces Payload's default login view.
 *
 * This is the SINGLE login mechanism. It:
 * - Renders inside Payload's SPA (no competing routes or DOM hacks)
 * - Accepts both email and username in a type="text" input
 * - Sends to /api/users/login (pre-init middleware resolves username→email)
 * - Sets the payload-token cookie on success
 * - Redirects to /admin on success
 *
 * Eliminates: custom HTML route, BeforeLogin DOM hacks, server.ts HTML injection
 */
import React, { useState, useCallback, useEffect } from 'react';

const HIDE_DEFAULT_FORM_CSS = `
  /* Hide Payload's default login form — our CustomLogin replaces it */
  .login__form,
  form[method="post"].login__form,
  .login > form {
    display: none !important;
  }
  /* Also hide the default "Forgot password" link */
  .login .forgot-password {
    display: none !important;
  }
`;

const CustomLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Inject CSS to hide Payload's default login form
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'custom-login-hide-default';
    style.textContent = HIDE_DEFAULT_FORM_CSS;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        // Payload sets the cookie via Set-Cookie header,
        // but also set it client-side as fallback
        const isSecure = window.location.protocol === 'https:';
        document.cookie = `payload-token=${data.token}; path=/; max-age=7200; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        window.location.href = '/admin';
      } else {
        setError(
          data.errors?.[0]?.message ||
          data.message ||
          'The email or password provided is incorrect.'
        );
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [identifier, password]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>DMO Knowledge Base</h1>
          <p style={styles.subtitle}>CMS Admin Panel</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.field}>
            <label htmlFor="login-identifier" style={styles.label}>
              Email or Username
            </label>
            <input
              id="login-identifier"
              type="text"
              name="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Username or email@example.com"
              autoComplete="username"
              autoFocus
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="login-password" style={styles.label}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.forgot}>
          <a href="/admin/forgot" style={styles.forgotLink}>
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0c0c0c',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '48px 40px',
    background: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #333',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 700,
    color: '#fff',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#888',
  },
  error: {
    background: '#dc2626',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#ccc',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#111',
    border: '1px solid #444',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  forgot: {
    textAlign: 'center' as const,
    marginTop: '16px',
  },
  forgotLink: {
    color: '#888',
    fontSize: '13px',
    textDecoration: 'none',
  },
};

export default CustomLogin;
