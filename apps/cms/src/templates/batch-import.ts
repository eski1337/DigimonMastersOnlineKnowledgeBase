/**
 * Batch import page HTML template.
 * Self-contained SPA for batch-importing Digimon from DMO Wiki.
 */
export function renderBatchImportPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Batch Import Digimon - DMO KB</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    h1 { font-size: 2rem; }
    .back-link { color: #0066ff; text-decoration: none; padding: 0.5rem 1rem; border: 1px solid #0066ff; border-radius: 4px; }
    .back-link:hover { background: #0066ff; color: #fff; }
    .info-box { background: #1a1a1a; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #333; }
    .info-box h2 { color: #0066ff; margin-bottom: 1rem; }
    .info-box ul { list-style: none; color: #ccc; line-height: 1.8; }
    .info-box li { margin-bottom: 0.5rem; }
    .batch-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .batch-btn { padding: 2rem 1.5rem; background: linear-gradient(135deg, #0066ff 0%, #0099ff 100%); color: #fff; border: none; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: bold; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0, 102, 255, 0.3); }
    .batch-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 102, 255, 0.4); }
    .batch-btn:disabled { opacity: 0.4; cursor: not-allowed; background: #2a2a2a; box-shadow: none; }
    .batch-btn.importing { background: linear-gradient(135deg, #ff6600 0%, #ff9933 100%); box-shadow: 0 8px 20px rgba(255, 102, 0, 0.4); transform: scale(1.02); }
    .batch-label { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .batch-sublabel { font-size: 0.85rem; opacity: 0.9; }
    .error-box { background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #ff6666; }
    .results-box { background: #1a1a1a; padding: 2rem; border-radius: 12px; border: 1px solid #00cc44; margin-bottom: 2rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #2a2a2a; padding: 1.5rem; border-radius: 8px; text-align: center; }
    .stat-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .stat-label { color: #999; font-size: 0.9rem; margin-bottom: 0.3rem; }
    .stat-value { font-size: 2rem; font-weight: bold; }
    .list-box { background: #2a2a2a; padding: 1.5rem; border-radius: 8px; margin-top: 1.5rem; }
    .list-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; list-style: none; padding: 0; max-height: 300px; overflow: auto; }
    .list-item { background: #1a1a1a; padding: 0.5rem; border-radius: 4px; font-size: 0.9rem; }
    .tips-box { background: #1a1a1a; padding: 1rem; border-radius: 8px; border: 1px solid #333; color: #999; font-size: 0.9rem; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Batch Import Digimon</h1>
      <a href="/admin" class="back-link">Back to Admin</a>
    </div>
    <div class="info-box">
      <h2>How This Works</h2>
      <ul>
        <li><strong>Server-side import:</strong> Runs on CMS server (bypasses Cloudflare)</li>
        <li><strong>Letter batches:</strong> Import Digimon by first letter groups</li>
        <li><strong>One at a time:</strong> Click a batch, wait for completion (~5-10 min), then next</li>
        <li><strong>Progress shown:</strong> See detailed results after each batch completes</li>
        <li><strong>Can pause:</strong> Do some batches now, rest later - progress is saved!</li>
      </ul>
    </div>
    <div class="batch-grid" id="batchGrid"></div>
    <div id="progress" style="display: none; background: #1a1a1a; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #0066ff;">
      <h3 style="color: #0066ff; margin-top: 0;">Import Progress</h3>
      <div id="progressBar" style="background: #333; height: 20px; border-radius: 10px; overflow: hidden; margin-bottom: 1rem;">
        <div id="progressFill" style="background: linear-gradient(90deg, #0066ff, #0099ff); height: 100%; width: 0%; transition: width 0.3s;"></div>
      </div>
      <div id="progressText" style="color: #ccc; font-size: 0.9rem; margin-bottom: 0.5rem;"></div>
      <div id="currentDigimon" style="color: #fff; font-weight: bold; font-size: 1.1rem;"></div>
      <div id="progressStats" style="color: #999; font-size: 0.9rem; margin-top: 1rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
        <div>Imported: <span id="importedCount" style="color: #00cc44; font-weight: bold;">0</span></div>
        <div>Skipped: <span id="skippedCount" style="color: #0099ff; font-weight: bold;">0</span></div>
        <div>Failed: <span id="failedCount" style="color: #ff4444; font-weight: bold;">0</span></div>
      </div>
    </div>
    <div id="error" style="display: none;"></div>
    <div id="results" style="display: none;"></div>
    <div class="tips-box">
      <div style="margin-bottom: 0.5rem;"><strong style="color: #0066ff;">Tips:</strong></div>
      <ul style="padding-left: 1.5rem;">
        <li>Start with <strong>A-C</strong>, wait for completion, then continue with next batches</li>
        <li>Each batch takes ~5-10 minutes depending on number of Digimon</li>
        <li>Total time for all 8 batches: ~40-80 minutes</li>
        <li>You can close this page and come back - progress is saved in database</li>
        <li>If a batch fails, you can retry it anytime</li>
      </ul>
    </div>
  </div>
  <script>
    var letterRanges = [
      { label: 'A-C', letters: ['A', 'B', 'C'] },
      { label: 'D-F', letters: ['D', 'E', 'F'] },
      { label: 'G-I', letters: ['G', 'H', 'I'] },
      { label: 'J-L', letters: ['J', 'K', 'L'] },
      { label: 'M-O', letters: ['M', 'N', 'O'] },
      { label: 'P-R', letters: ['P', 'Q', 'R'] },
      { label: 'S-U', letters: ['S', 'T', 'U'] },
      { label: 'V-Z', letters: ['V', 'W', 'X', 'Y', 'Z'] },
    ];
    var importing = null;
    function renderBatches() {
      var grid = document.getElementById('batchGrid');
      grid.innerHTML = '';
      letterRanges.forEach(function(range) {
        var btn = document.createElement('button');
        btn.className = 'batch-btn' + (importing === range.label ? ' importing' : '');
        btn.disabled = importing !== null;
        var label = document.createElement('div');
        label.className = 'batch-label';
        label.textContent = importing === range.label ? '...' : range.label;
        var sublabel = document.createElement('div');
        sublabel.className = 'batch-sublabel';
        sublabel.textContent = importing === range.label ? 'Importing...' : 'Click to Import';
        btn.appendChild(label);
        btn.appendChild(sublabel);
        btn.onclick = function() { handleBatchImport(range.label, range.letters); };
        grid.appendChild(btn);
      });
    }
    var progressPoll = null;
    function startProgressPolling() {
      document.getElementById('progress').style.display = 'block';
      progressPoll = setInterval(async function() {
        try {
          var res = await fetch('/api/batch-import-progress');
          if (!res.ok) return;
          var ct = res.headers.get('content-type');
          if (!ct || !ct.includes('application/json')) return;
          var progress = await res.json();
          if (progress.status === 'idle') return;
          if (progress.total) {
            var pct = (progress.current / progress.total) * 100;
            document.getElementById('progressFill').style.width = pct + '%';
            document.getElementById('progressText').textContent = progress.message || '';
          } else {
            document.getElementById('progressText').textContent = progress.message || 'Processing...';
          }
          document.getElementById('currentDigimon').textContent = progress.currentDigimon ? progress.currentDigimon : '';
          document.getElementById('importedCount').textContent = progress.imported || 0;
          document.getElementById('skippedCount').textContent = progress.skipped || 0;
          document.getElementById('failedCount').textContent = progress.failed || 0;
        } catch (e) {}
      }, 2000);
    }
    function stopProgressPolling() {
      if (progressPoll) { clearInterval(progressPoll); progressPoll = null; }
      document.getElementById('progress').style.display = 'none';
    }
    async function handleBatchImport(label, letters) {
      importing = label;
      renderBatches();
      document.getElementById('error').style.display = 'none';
      document.getElementById('results').style.display = 'none';
      startProgressPolling();
      try {
        var response = await fetch('/api/batch-import-digimon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ letters: letters }),
        });
        var data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Batch import failed');
        showResults(data);
      } catch (err) {
        showError(err.message || 'Failed to import batch');
      } finally {
        stopProgressPolling();
        importing = null;
        renderBatches();
      }
    }
    function showError(message) {
      var el = document.getElementById('error');
      el.className = 'error-box';
      el.innerHTML = '<div style="font-size:1.5rem;margin-bottom:0.5rem">Error</div><div>' + message + '</div>';
      el.style.display = 'block';
    }
    var lastFailedList = [];
    function showResults(data) {
      lastFailedList = data.failedList || [];
      var el = document.getElementById('results');
      el.className = 'results-box';
      var h = '<h2 style="color:#00cc44;margin-bottom:1.5rem">Batch Complete!</h2>';
      h += '<div class="stats-grid">';
      h += '<div class="stat-card"><div class="stat-icon">Total</div><div class="stat-value">' + data.totalFound + '</div></div>';
      h += '<div class="stat-card"><div class="stat-icon">Imported</div><div class="stat-value" style="color:#00cc44">' + data.imported + '</div></div>';
      h += '<div class="stat-card"><div class="stat-icon">Existed</div><div class="stat-value" style="color:#0099ff">' + data.skipped + '</div></div>';
      h += '<div class="stat-card"><div class="stat-icon">Failed</div><div class="stat-value" style="color:#ff4444">' + data.failed + '</div></div>';
      h += '</div>';
      if (data.importedList && data.importedList.length > 0) {
        h += '<div class="list-box"><strong style="color:#00cc44;font-size:1.2rem">Imported (' + data.importedList.length + ')</strong>';
        h += '<ul class="list-grid" style="margin-top:1rem">';
        data.importedList.forEach(function(n) { h += '<li class="list-item">' + n + '</li>'; });
        h += '</ul></div>';
      }
      if (data.failedList && data.failedList.length > 0) {
        h += '<div class="list-box" style="border:1px solid #ff4444;background:#2a1a1a">';
        h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">';
        h += '<strong style="color:#ff4444;font-size:1.2rem">Failed (' + data.failedList.length + ')</strong>';
        h += '<button onclick="retryFailed()" style="padding:0.5rem 1rem;background:#ff6600;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold">Retry Failed</button>';
        h += '</div><div style="max-height:400px;overflow-y:auto;padding:0.5rem">';
        data.failedList.forEach(function(item) {
          var name = typeof item === 'string' ? item : item.name;
          var error = typeof item === 'object' && item.error ? item.error : 'Unknown error';
          h += '<div style="background:#1a1a1a;padding:0.75rem;margin-bottom:0.5rem;border-radius:4px;border-left:3px solid #ff4444">';
          h += '<div style="font-weight:bold;color:#ff6666;margin-bottom:0.25rem">' + name + '</div>';
          h += '<div style="color:#999;font-size:0.85rem">' + error + '</div></div>';
        });
        h += '</div></div>';
      }
      el.innerHTML = h;
      el.style.display = 'block';
    }
    async function retryFailed() {
      if (lastFailedList.length === 0) { alert('No failed imports to retry'); return; }
      var names = lastFailedList.map(function(i) { return typeof i === 'string' ? i : i.name; });
      if (!confirm('Retry importing ' + names.length + ' failed Digimon?')) return;
      importing = 'retry';
      renderBatches();
      document.getElementById('error').style.display = 'none';
      document.getElementById('results').style.display = 'none';
      startProgressPolling();
      try {
        var response = await fetch('/api/batch-import-digimon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: names }),
        });
        var data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Retry failed');
        showResults(data);
      } catch (err) {
        showError(err.message || 'Failed to retry batch');
      } finally {
        stopProgressPolling();
        importing = null;
        renderBatches();
      }
    }
    renderBatches();
  </script>
</body>
</html>`;
}
