// Input & startup
(() => {
  Game.init();

  // Keyboard: WASD + arrows
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  };
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea')) return; // typing in a text box, not playing
    if (e.key === 'Escape') { Game.escape(); return; }
    if (e.key === 'm' || e.key === 'M') { toggleSound(); return; }
    const dir = KEYMAP[e.key];
    if (!dir) return;
    e.preventDefault();
    if (e.repeat) return; // ignore key repeat to avoid wasting shovels
    Game.act(dir);
    const btn = document.querySelector(`.dir[data-dir="${dir}"]`);
    if (btn) { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 120); }
  });

  // Touch buttons
  document.querySelectorAll('.dir').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      Game.act(btn.dataset.dir);
    });
  });

  // Sound toggle (or press M)
  const soundBtn = document.getElementById('btn-sound');
  const renderSound = () => { soundBtn.textContent = Sound.muted ? '🔇' : '🔊'; };
  function toggleSound() { Sound.toggle(); renderSound(); }
  soundBtn.addEventListener('click', toggleSound);
  renderSound();

  document.getElementById('btn-format').addEventListener('click', Game.showFormat);
  document.getElementById('btn-shop').addEventListener('click', Game.showShop);
  document.getElementById('btn-publish').addEventListener('click', Game.showPublish);
  document.getElementById('btn-exit').addEventListener('click', Game.showExit);

  // Load question bank
  const fileInput = document.getElementById('file-input');
  document.getElementById('btn-load').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const text = QuestionBank.decode(await file.arrayBuffer());
    const n = QuestionBank.load(text, file.name);
    Game.toast(n ? `✅ Loaded "${file.name}": ${n} questions` : '❌ No questions found. Please check the CSV format.');
  });

  // Homework link: use the questions in the link (or the default set) and hide the
  // load / format / publish buttons, so students can't change the questions
  const hw = Homework.fromLocation();
  const banner = document.getElementById('hw-banner');
  const showBanner = () => { banner.textContent = `📘 Homework: ${hw.title} (${QuestionBank.count} questions)`; };
  if (hw && !hw.error) {
    document.body.classList.add('hw-mode');
    document.title = `${hw.title} · ${document.title}`;
    banner.hidden = false;
    if (hw.questions) QuestionBank.setRows(hw.questions, hw.title);
    showBanner();
  } else if (hw && hw.error) {
    Game.toast(hw.message);
  }

  // When served over http, auto-load questions.csv; otherwise use the built-in bank
  if (!(hw && hw.questions) && location.protocol.startsWith('http')) {
    fetch('questions.csv')
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then(buf => QuestionBank.load(QuestionBank.decode(buf), 'questions.csv'))
      .then(() => { if (hw && !hw.error) showBanner(); })
      .catch(() => {});
  }
})();
