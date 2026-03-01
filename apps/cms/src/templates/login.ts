/**
 * Login page HTML template.
 * Replaces Payload's built-in login form with username support.
 */
export function renderLoginPage(serverURL: string): string {
  const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - DMO KB CMS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c0c0c; color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-card { width: 100%; max-width: 420px; padding: 48px 40px; background: #1a1a1a; border-radius: 12px; border: 1px solid #333; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo h1 { font-size: 24px; font-weight: 700; color: #fff; }
    .logo p { font-size: 13px; color: #888; margin-top: 4px; }
    .field { margin-bottom: 20px; }
    .field label { display: block; font-size: 13px; font-weight: 600; color: #ccc; margin-bottom: 6px; }
    .field input { width: 100%; padding: 10px 14px; background: #111; border: 1px solid #444; border-radius: 6px; color: #fff; font-size: 15px; outline: none; transition: border-color 0.2s; }
    .field input:focus { border-color: #f97316; }
    .field input::placeholder { color: #666; }
    .btn { width: 100%; padding: 12px; background: #f97316; color: #fff; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn:hover { background: #ea580c; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .error { background: #dc2626; color: #fff; padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; display: none; }
    .forgot { text-align: center; margin-top: 16px; }
    .forgot a { color: #888; font-size: 13px; text-decoration: none; }
    .forgot a:hover { color: #f97316; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo">
      <h1>DMO Knowledge Base</h1>
      <p>CMS Admin Panel</p>
    </div>
    <div class="error" id="error"></div>
    <form id="loginForm" novalidate>
      <div class="field">
        <label for="identifier">Email or Username</label>
        <input type="text" id="identifier" name="email" placeholder="Username or email@example.com" autocomplete="username" required>
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="••••••••" autocomplete="current-password" required>
      </div>
      <button type="submit" class="btn" id="submitBtn">Login</button>
    </form>
    <div class="forgot">
      <a href="/admin/forgot">Forgot password?</a>
    </div>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      var errEl = document.getElementById('error');
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      errEl.style.display = 'none';
      try {
        var res = await fetch('${serverURL}/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: document.getElementById('identifier').value.trim(),
            password: document.getElementById('password').value
          })
        });
        var data = await res.json();
        if (res.ok && data.token) {
          document.cookie = 'payload-token=' + data.token + '; path=/; max-age=7200; SameSite=Lax${secureCookie}';
          window.location.href = '/admin';
        } else {
          errEl.textContent = data.errors?.[0]?.message || 'Invalid credentials. Please try again.';
          errEl.style.display = 'block';
        }
      } catch (err) {
        errEl.textContent = 'Connection error. Please try again.';
        errEl.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Login';
    });
  </script>
</body>
</html>`;
}
