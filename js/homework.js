// 发布作业（不记成绩）/ Publish homework (no scores recorded)
// 题库直接编码在链接里：index.html#hw=<数据>。不需要服务器、不储存分数。
// The question set is encoded in the link itself: index.html#hw=<data>. No server, no score storage.
// 依赖 / needs: js/vendor/qrcode.js (Kazuhiko Arase, MIT), js/vendor/tiny-inflate.js (Devon Govett, MIT)
const Homework = (() => {
  const ZH = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
  const T = ZH ? {
    heading: '📤 发布作业',
    intro: '把当前题库发布成作业：生成链接和二维码发给学生。学生打开后直接用这套题玩游戏，不能更换题库。不记名、不记成绩。',
    title: '作业标题',
    titlePh: '例如：第三课 古诗复习',
    bank: (n, src) => `题库：${src}（${n} 题）`,
    bankTip: '想换题？先关闭这个窗口，导入新的题库 CSV，再来发布。',
    generate: '生成作业链接',
    working: '正在生成…',
    linkLabel: '把这个链接发给学生',
    copy: '复制链接', copied: '已复制 ✓', copyFail: '复制失败，请手动复制',
    open: '打开看看',
    qrDownload: '下载二维码', qrPrint: '打印二维码',
    qrHint: '学生用平板或手机扫码即可打开作业。',
    qrTooLong: '题目太多，二维码放不下（链接仍然可以用）。中文题大约 30 道以内才能生成二维码，请减少题目后重新导入。',
    qrTooLongShort: '链接太长，无法生成二维码',
    popup: '浏览器挡住了弹出窗口，请允许弹出窗口后再试，或改用「下载二维码」。',
    close: '关闭',
    noQuestions: '当前题库没有题目，请先导入题库。',
    defaultTitle: '作业',
    fileSuffix: '-二维码.png',
    qrAlt: '二维码',
    badLink: '作业链接不完整或已损坏，已改用默认题库。请向老师重新要链接。',
  } : {
    heading: '📤 Publish homework',
    intro: 'Publish the current question set as homework: you get a link and a QR code for students. Students play with exactly these questions and cannot change them. No names or scores are recorded.',
    title: 'Homework title',
    titlePh: 'e.g. Unit 3 vocabulary review',
    bank: (n, src) => `Question set: ${src} (${n} questions)`,
    bankTip: 'Want different questions? Close this window, import a new question CSV, then publish.',
    generate: 'Create homework link',
    working: 'Creating…',
    linkLabel: 'Send this link to students',
    copy: 'Copy link', copied: 'Copied ✓', copyFail: 'Copy failed, please copy it manually',
    open: 'Open it',
    qrDownload: 'Download QR code', qrPrint: 'Print QR code',
    qrHint: 'Students scan it with a tablet or phone to open the homework.',
    qrTooLong: 'Too many questions to fit in a QR code (the link still works). A QR code holds about 50 short English questions; import fewer and publish again.',
    qrTooLongShort: 'Link too long for a QR code',
    popup: 'The browser blocked the pop-up window. Allow pop-ups and try again, or use "Download QR code".',
    close: 'Close',
    noQuestions: 'The current question set is empty. Please import questions first.',
    defaultTitle: 'Homework',
    fileSuffix: '-QR.png',
    qrAlt: 'QR code',
    badLink: 'This homework link is incomplete or damaged, so the default questions are used. Please ask your teacher for the link again.',
  };

  /* ---------- 编码 / encoding ---------- */
  function b64urlFromBytes(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function bytesFromB64url(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function deflateRaw(bytes) {
    const cs = new CompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(cs);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  // 格式：z + 压缩后的 base64url；浏览器不支持压缩时用 j + 未压缩的 base64url
  // Format: "z" + deflate-raw base64url, or "j" + plain base64url when compression is unavailable
  async function encode(data) {
    const raw = new TextEncoder().encode(JSON.stringify(data));
    let best = 'j' + b64urlFromBytes(raw);
    if (typeof CompressionStream === 'function') {
      try {
        const z = 'z' + b64urlFromBytes(await deflateRaw(raw));
        if (z.length < best.length) best = z;
      } catch (e) { /* keep uncompressed */ }
    }
    return best;
  }

  function decode(s) {
    let bytes = bytesFromB64url(s.slice(1));
    if (s[0] === 'z') bytes = tinyInflate(bytes, new Uint8Array(Math.max(1 << 16, bytes.length * 20)));
    else if (s[0] !== 'j') throw new Error('unknown format');
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function baseUrl() {
    return location.href.split('#')[0].split('?')[0];
  }

  // questions: [[题干, 答案, 干扰项1, 干扰项2, 干扰项3], ...]；null = 使用游戏自带的默认题库（链接很短）
  // questions: [[question, answer, d1, d2, d3], ...]; null = use the game's default question set (short link)
  async function buildLink(title, questions) {
    return baseUrl() + '#hw=' + await encode(questions ? { v: 1, t: title, q: questions } : { v: 1, t: title, d: 1 });
  }

  // 返回 null（不是作业链接）、{ error: true }（链接损坏）或 { title, questions }；questions 为 null 表示用默认题库
  // Returns null (not a homework link), { error: true } (damaged link) or { title, questions };
  // questions === null means "use the default question set"
  function fromLocation() {
    const m = location.hash.match(/[#&]hw=([\w-]+)/);
    if (!m) return null;
    try {
      const o = decode(m[1]);
      const title = String(o.t || '').trim() || T.defaultTitle;
      if (o.d) return { title, questions: null };
      const qs = (Array.isArray(o.q) ? o.q : [])
        .filter(r => Array.isArray(r) && r.length >= 5)
        .map(r => r.slice(0, 5).map(x => String(x ?? '').trim()))
        .filter(r => r.every(x => x !== ''));
      if (!qs.length) return { error: true, message: T.badLink };
      return { title, questions: qs };
    } catch (e) {
      return { error: true, message: T.badLink };
    }
  }

  // 学生打开另一份作业链接（只改了 # 后面）时重新载入
  // Reload when a student opens a different homework link in the same tab (only the hash changed)
  window.addEventListener('hashchange', () => {
    if (/[#&]hw=/.test(location.hash)) location.reload();
  });

  /* ---------- 二维码 / QR code ---------- */
  // 在 canvas 上画：二维码 + 下方作业标题。成功返回 true。
  function drawQrCard(canvas, url, title) {
    let qr = null;
    for (const level of ['M', 'L']) {
      try { qr = qrcode(0, level); qr.addData(url); qr.make(); break; }
      catch (e) { qr = null; }
    }
    const ctx = canvas.getContext('2d');
    if (!qr) {
      canvas.width = 600; canvas.height = 120;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#c00'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(T.qrTooLongShort, 300, 70);
      return false;
    }
    const n = qr.getModuleCount();
    const quiet = 4;
    const cell = Math.max(4, Math.floor(720 / (n + quiet * 2)));
    const size = cell * (n + quiet * 2);
    const textH = title ? Math.round(size * 0.16) : 0;
    canvas.width = size; canvas.height = size + textH;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
    if (title) {
      let fs = Math.round(textH * 0.5);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const font = s => `600 ${s}px system-ui, "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`;
      ctx.font = font(fs);
      while (fs > 12 && ctx.measureText(title).width > size * 0.92) { fs--; ctx.font = font(fs); }
      ctx.fillText(title, size / 2, size + textH * 0.35);
    }
    return true;
  }

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function printQr(canvas, title) {
    const w = window.open('', '_blank');
    if (!w) { alert(T.popup); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;text-align:center;margin:40px;color:#000;background:#fff}
img{width:12cm;max-width:90vw;image-rendering:pixelated}</style></head>
<body><img src="${canvas.toDataURL('image/png')}" alt="${esc(T.qrAlt)}">
<script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script></body></html>`);
    w.document.close();
  }

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove();
      return ok;
    }
  }

  /* ---------- 发布窗口 / publish dialog ---------- */
  // box：游戏提供的弹窗容器；opts: { questions, source, isDefault, onClose }
  // isDefault：当前是游戏自带的默认题库，链接里不放题目，只放「用默认题库」
  // box: the game's dialog container; opts: { questions, source, isDefault, onClose }
  // isDefault: the current set is the game's default one, so the link only says "use the default set"
  function renderPublish(box, opts) {
    const qs = opts.questions || [];
    box.innerHTML = `
      <h2>${T.heading}</h2>
      <p class="hw-text">${esc(T.intro)}</p>
      <label class="hw-field"><span>${esc(T.title)}</span>
        <input class="hw-input" id="hw-title" maxlength="60" placeholder="${esc(T.titlePh)}"></label>
      <p class="hw-text hw-muted">${esc(T.bank(qs.length, opts.source))}<br>${esc(T.bankTip)}</p>
      <p class="hw-text hw-err" id="hw-msg"></p>
      <div id="hw-result" class="hw-result" hidden>
        <label class="hw-field"><span>${esc(T.linkLabel)}</span>
          <input class="hw-input hw-link" id="hw-link" readonly></label>
        <div class="hw-row">
          <button type="button" class="btn" id="hw-copy">${esc(T.copy)}</button>
          <a class="btn hw-btnlink" id="hw-open" target="_blank" rel="noopener">${esc(T.open)}</a>
        </div>
        <canvas id="hw-qr" class="hw-qr"></canvas>
        <p class="hw-text hw-muted" id="hw-qrhint"></p>
        <div class="hw-row" id="hw-qrbtns">
          <button type="button" class="btn" id="hw-qrdl">${esc(T.qrDownload)}</button>
          <button type="button" class="btn" id="hw-qrprint">${esc(T.qrPrint)}</button>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn primary" id="hw-generate">${esc(T.generate)}</button>
        <button type="button" class="btn btn-ghost" id="hw-close">${esc(T.close)}</button>
      </div>`;
    const $ = sel => box.querySelector(sel);
    let title = '';

    $('#hw-close').addEventListener('click', () => opts.onClose && opts.onClose());
    if (!qs.length) { $('#hw-msg').textContent = T.noQuestions; $('#hw-generate').disabled = true; }

    $('#hw-generate').addEventListener('click', async () => {
      const btn = $('#hw-generate');
      btn.disabled = true;
      btn.textContent = T.working;
      try {
        title = $('#hw-title').value.trim();
        const url = await buildLink(title, opts.isDefault ? null : qs);
        $('#hw-link').value = url;
        $('#hw-open').href = url;
        $('#hw-result').hidden = false;
        const ok = drawQrCard($('#hw-qr'), url, title || T.defaultTitle);
        $('#hw-qrbtns').hidden = !ok;
        $('#hw-qrhint').textContent = ok ? T.qrHint : T.qrTooLong;
        $('#hw-link').select();
        $('#hw-result').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch (e) {
        $('#hw-msg').textContent = String(e && e.message || e);
      } finally {
        btn.disabled = false;
        btn.textContent = T.generate;
      }
    });

    $('#hw-copy').addEventListener('click', async () => {
      const b = $('#hw-copy');
      b.textContent = (await copyText($('#hw-link').value)) ? T.copied : T.copyFail;
      setTimeout(() => { b.textContent = T.copy; }, 1500);
    });

    $('#hw-qrdl').addEventListener('click', () => {
      $('#hw-qr').toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (title || T.defaultTitle).replace(/[\\/:*?"<>|]/g, ' ') + T.fileSuffix;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }, 'image/png');
    });

    $('#hw-qrprint').addEventListener('click', () => printQr($('#hw-qr'), title || T.defaultTitle));
    setTimeout(() => $('#hw-title').focus(), 50);
  }

  return { fromLocation, buildLink, renderPublish, encode, decode, drawQrCard };
})();
