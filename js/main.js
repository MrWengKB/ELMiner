// 输入与启动
(() => {
  Game.init();

  // 键盘：WASD + 方向键
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { Game.escape(); return; }
    const dir = KEYMAP[e.key];
    if (!dir) return;
    e.preventDefault();
    if (e.repeat) return; // 长按不连挖，避免浪费矿铲
    Game.act(dir);
    const btn = document.querySelector(`.dir[data-dir="${dir}"]`);
    if (btn) { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 120); }
  });

  // 触屏方向键
  document.querySelectorAll('.dir').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      Game.act(btn.dataset.dir);
    });
  });

  document.getElementById('btn-shop').addEventListener('click', Game.showShop);
  document.getElementById('btn-exit').addEventListener('click', Game.showExit);

  // 加载题库
  const fileInput = document.getElementById('file-input');
  document.getElementById('btn-load').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const text = QuestionBank.decode(await file.arrayBuffer());
    const n = QuestionBank.load(text, file.name);
    Game.toast(n ? `✅ 已加载题库「${file.name}」，共 ${n} 题` : '❌ 未识别到题目，请检查 CSV 格式');
  });

  // 若通过本地服务器打开，自动尝试加载同目录 questions.csv；否则使用内置题库
  if (location.protocol.startsWith('http')) {
    fetch('questions.csv')
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then(buf => QuestionBank.load(QuestionBank.decode(buf), 'questions.csv'))
      .catch(() => {});
  }
})();
