"""
Cloudflare Bypass Proxy for dmowiki.com

Keeps a real browser open (via Selenium) to handle all requests through the
browser's Cloudflare session. The browser solves the CAPTCHA challenge once,
then all subsequent requests are made through the same browser context.

Usage:
  python scripts/cf-proxy.py

Endpoints:
  GET  http://localhost:8191/                    - Status check
  GET  http://localhost:8191/fetch?url=<url>     - Fetch HTML page
  GET  http://localhost:8191/image?url=<url>     - Download image (returns binary via JS fetch)
"""

import http.server
import json
import threading
import time
import sys
import os
import base64
from urllib.parse import urlparse, parse_qs, unquote

PORT = 8191
driver = None
cf_ready = False
browser_lock = threading.Lock()


def init_browser():
    """Open browser and solve Cloudflare challenge."""
    global driver, cf_ready

    try:
        import undetected_chromedriver as uc
        print("[cf-proxy] Launching undetected Chrome...")
        driver = uc.Chrome()
    except Exception as e:
        print(f"[cf-proxy] undetected-chromedriver failed: {e}")
        try:
            from selenium import webdriver
            print("[cf-proxy] Falling back to regular Chrome...")
            driver = webdriver.Chrome()
        except Exception as e2:
            print(f"[cf-proxy] Chrome also failed: {e2}")
            return

    print("[cf-proxy] Navigating to dmowiki.com...")
    driver.get("https://dmowiki.com/Main_Page")

    # Wait for CF challenge to resolve
    for i in range(60):
        title = driver.title
        if ("Just a moment" not in title
            and "请稍候" not in title
            and "Attention" not in title):
            break
        if i % 5 == 0:
            print(f"[cf-proxy] Waiting for CF challenge... ({i*2}s)")
        time.sleep(2)

    title = driver.title
    source = driver.page_source[:500]
    if "Just a moment" in title or "请稍候" in title:
        print("[cf-proxy] CF challenge not resolved. Solve it manually in the browser window!")
        # Keep waiting indefinitely
        while True:
            time.sleep(3)
            title = driver.title
            if "Just a moment" not in title and "请稍候" not in title:
                break
            print(f"[cf-proxy] Still waiting... title={title[:40]}")

    print(f"[cf-proxy] ✅ Cloudflare passed! Title: {title}")
    cf_ready = True


def fetch_page_via_browser(url):
    """Navigate browser to URL and return page source."""
    with browser_lock:
        try:
            driver.get(url)
            # Wait for page to load
            time.sleep(1)
            # Check if CF challenge appeared again
            for _ in range(10):
                title = driver.title
                if "Just a moment" not in title and "请稍候" not in title:
                    break
                time.sleep(2)
            return driver.page_source
        except Exception as e:
            return f"<error>{str(e)}</error>"


def fetch_image_via_browser(url):
    """Download image by navigating browser to image URL and extracting via canvas."""
    with browser_lock:
        try:
            # Navigate directly to the image URL
            # Chrome displays raw images in a simple HTML wrapper with an <img> tag
            driver.get(url)
            time.sleep(1)

            # Check for CF challenge on the image request
            for _ in range(5):
                title = driver.title
                if "Just a moment" not in title and "请稍候" not in title:
                    break
                time.sleep(2)

            # Extract image via canvas (works when browser shows a raw image)
            js_code = """
            var img = document.querySelector('img');
            if (!img) return {error: 'no image element found'};
            // Wait for image to load
            if (!img.complete) return {error: 'image not loaded'};
            var canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            if (canvas.width === 0 || canvas.height === 0) return {error: 'image has zero dimensions'};
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                var dataUrl = canvas.toDataURL('image/png');
                return {data: dataUrl.split(',')[1], type: 'image/png', width: canvas.width, height: canvas.height};
            } catch(e) {
                return {error: 'canvas export failed: ' + e.message};
            }
            """
            result = driver.execute_script(js_code)
            if result and 'data' in result:
                return {
                    'data': base64.b64decode(result['data']),
                    'type': result.get('type', 'image/png'),
                    'size': len(base64.b64decode(result['data']))
                }
            elif result and 'error' in result:
                return {'error': str(result['error'])}
            else:
                return {'error': 'No data returned from canvas extraction'}
        except Exception as e:
            return {'error': str(e)}


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if parsed.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'ready' if cf_ready else 'not_ready',
                'message': 'CF proxy running - browser active' if cf_ready else 'Solving Cloudflare challenge...'
            }).encode())

        elif parsed.path == '/fetch':
            url = params.get('url', [None])[0]
            if not url:
                self._json_error(400, 'Missing url parameter')
                return
            url = unquote(url)

            if not cf_ready:
                self._json_error(503, 'CF not ready yet - wait for CAPTCHA solve')
                return

            html = fetch_page_via_browser(url)
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(html.encode('utf-8', errors='replace'))

        elif parsed.path == '/image':
            url = params.get('url', [None])[0]
            if not url:
                self._json_error(400, 'Missing url parameter')
                return
            url = unquote(url)

            if not cf_ready:
                self._json_error(503, 'CF not ready yet')
                return

            result = fetch_image_via_browser(url)
            if 'error' in result:
                self._json_error(502, f"Image fetch failed: {result['error']}")
            else:
                self.send_response(200)
                self.send_header('Content-Type', result['type'])
                self.send_header('Content-Length', str(len(result['data'])))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(result['data'])

        else:
            self._json_error(404, 'Not found')

    def _json_error(self, code, msg):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': msg}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        msg = format % args
        if '/fetch' in msg or '/image' in msg:
            print(f"[cf-proxy] {msg}")


def main():
    print("=" * 60)
    print("  DMO Wiki Cloudflare Bypass Proxy (Browser Mode)")
    print("=" * 60)
    print(f"  Port: {PORT}")
    print(f"  A Chrome window will open - solve the CAPTCHA if prompted.")
    print(f"  Keep the browser window open while importing!")
    print("=" * 60)

    # Start browser in background thread
    browser_thread = threading.Thread(target=init_browser, daemon=True)
    browser_thread.start()

    # Start HTTP server immediately
    server = http.server.HTTPServer(('127.0.0.1', PORT), ProxyHandler)
    print(f"\n[cf-proxy] Server listening on http://127.0.0.1:{PORT}")
    print("[cf-proxy] Waiting for browser to pass Cloudflare...\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[cf-proxy] Shutting down...")
        if driver:
            try:
                driver.quit()
            except:
                pass
        server.server_close()


if __name__ == '__main__':
    main()
