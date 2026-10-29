(function () {
  'use strict';
  var REPO = 'Jack-Millerapps/pesto-os-flasher';
  var API = 'https://api.github.com/repos/' + REPO + '/releases/latest';
  var box = document.getElementById('release');

  function el(tag, props, kids) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') n.textContent = props[k]; else n.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function fmtSize(b) {
    if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' GB';
    return Math.max(1, Math.round(b / 1048576)) + ' MB';
  }
  function fmtDate(s) {
    var d = new Date(s);
    return isNaN(d) ? s : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function notice(msg, withLink) {
    box.textContent = '';
    var n = el('div', { 'class': 'notice' }, [el('p', { text: msg })]);
    if (withLink) {
      n.appendChild(el('p', {}, [el('a', { href: 'https://github.com/' + REPO + '/releases', text: 'Check the releases page on GitHub' })]));
    }
    box.appendChild(n);
  }
  function copyText(text, btn) {
    var done = function (ok) {
      var old = btn.dataset.label || btn.textContent;
      btn.dataset.label = old;
      btn.textContent = ok ? 'Copied' : 'Press Ctrl+C to copy';
      setTimeout(function () { btn.textContent = old; }, 2000);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = el('textarea', { 'aria-hidden': 'true' });
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); done(ok);
    }
  }

  function render(rel) {
    var zip = (rel.assets || []).filter(function (a) { return /\.img\.zip$/i.test(a.name); })[0];
    var shaAsset = (rel.assets || []).filter(function (a) { return /\.sha256$/i.test(a.name); })[0];
    if (!zip) { notice('A release exists (' + (rel.tag_name || 'unnamed') + ') but it has no image file attached yet. The image is not published yet.', true); return; }
    box.textContent = '';
    var meta = el('ul', { 'class': 'meta' }, [
      el('li', {}, [el('span', { text: 'Version: ' }), el('strong', { text: rel.tag_name || rel.name || '?' })]),
      el('li', {}, [el('span', { text: 'Size: ' }), el('strong', { text: fmtSize(zip.size) })]),
      el('li', {}, [el('span', { text: 'Released: ' }), el('strong', { text: fmtDate(rel.published_at || zip.updated_at) })])
    ]);
    box.appendChild(meta);
    box.appendChild(el('a', { 'class': 'btn big', href: zip.browser_download_url, rel: 'noopener', text: 'Download ' + zip.name }));
    box.appendChild(el('p', { 'class': 'muted small', text: 'Keep it zipped. Chromebook Recovery Utility reads the .zip directly.' }));

    if (shaAsset) {
      var holder = el('div', { 'class': 'sha' }, [el('span', { text: 'Loading checksum...', 'class': 'muted small' })]);
      box.appendChild(el('p', { 'class': 'small' , text: 'SHA256 checksum (to check the download is intact):' }));
      box.appendChild(holder);
      fetch(shaAsset.browser_download_url).then(function (r) {
        if (!r.ok) throw new Error(r.status); return r.text();
      }).then(function (t) {
        var m = t.match(/\b[a-fA-F0-9]{64}\b/);
        if (!m) throw new Error('no hash');
        var hash = m[0].toLowerCase();
        holder.textContent = '';
        var btn = el('button', { type: 'button', 'class': 'btn secondary small', text: 'Copy' });
        btn.addEventListener('click', function () { copyText(hash, btn); });
        holder.appendChild(el('code', { text: hash, 'aria-label': 'SHA256 checksum' }));
        holder.appendChild(btn);
      }).catch(function () {
        holder.textContent = '';
        holder.appendChild(el('a', { href: shaAsset.browser_download_url, text: 'Open the checksum file' }));
      });
    } else {
      box.appendChild(el('p', { 'class': 'muted small', text: 'No checksum file was published with this release.' }));
    }
  }

  fetch(API, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) {
    if (r.status === 404) { notice('The image is not published yet. Check back soon.', true); return null; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (rel) { if (rel) render(rel); })
    .catch(function () { notice('Could not reach GitHub to look up the latest release (you may be offline or rate limited).', true); });

  // Wi-Fi helper
  var form = document.getElementById('wifi-form');
  var ssid = document.getElementById('ssid'), psk = document.getElementById('psk');
  var ssidErr = document.getElementById('ssid-err'), pskErr = document.getElementById('psk-err');
  var status = document.getElementById('wifi-status'), tog = document.getElementById('toggle-pw');

  tog.addEventListener('click', function () {
    var show = psk.type === 'password';
    psk.type = show ? 'text' : 'password';
    tog.textContent = show ? 'Hide' : 'Show';
    tog.setAttribute('aria-pressed', String(show));
  });

  function bad(v) { return /[\r\n]/.test(v); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    ssidErr.textContent = ''; pskErr.textContent = ''; status.textContent = '';
    var s = ssid.value, p = psk.value, ok = true;
    if (!s.trim()) { ssidErr.textContent = 'Enter your Wi-Fi name.'; ok = false; }
    else if (bad(s)) { ssidErr.textContent = 'The name cannot contain line breaks.'; ok = false; }
    if (bad(p)) { pskErr.textContent = 'The password cannot contain line breaks.'; ok = false; }
    else if (p && (p.length < 8 || p.length > 63)) { pskErr.textContent = 'WPA passwords are 8 to 63 characters.'; ok = false; }
    if (!ok) { (ssidErr.textContent ? ssid : psk).focus(); return; }
    var text = 'ssid=' + s + '\n' + 'psk=' + p + '\n';
    var url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    var a = el('a', { href: url, download: 'pesto-wifi.txt' });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    status.textContent = 'Created pesto-wifi.txt. Copy it onto the SD card\'s boot drive after flashing.';
  });
})();
