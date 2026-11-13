// 游戏核心逻辑
const Game = (() => {
  const { COLS, ROWS, VISIBLE_ROWS } = CONFIG;
  const $ = id => document.getElementById(id);
  let els = {};
  let cells = [];   // DOM 格子
  let state = null;
  let modalType = null;
  let toastTimer = null;

  /* ---------------- 初始化 ---------------- */
  function init() {
    els = {
      grid: $('grid'), player: $('player'), viewport: $('viewport'),
      hearts: $('hearts'), shovels: $('shovels'), coins: $('coins'), depth: $('depth'),
      modal: $('modal'), box: $('modal-box'), toast: $('toast'),
    };
    els.player.querySelector('span').textContent = CONFIG.PLAYER;
    document.documentElement.style.setProperty('--cols', COLS);
    document.documentElement.style.setProperty('--visible', VISIBLE_ROWS);

    const frag = document.createDocumentFragment();
    for (let r = 0; r < ROWS; r++) {
      cells.push([]);
      for (let c = 0; c < COLS; c++) {
        const d = document.createElement('div');
        frag.appendChild(d);
        cells[r].push(d);
      }
    }
    els.grid.appendChild(frag);
    newGame();
  }

  function newGame() {
    const startCol = Math.floor(COLS / 2);
    state = {
      grid: MapGen.generate(ROWS, COLS, startCol),
      r: 0, c: startCol,
      hearts: CONFIG.START_HEARTS,
      shovels: CONFIG.START_SHOVELS,
      coins: 0,
      stats: { blue: 0, yellow: 0, purple: 0, bomb: 0, quizRight: 0 },
      over: false,
    };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) paintCell(r, c);
    els.player.classList.remove('face-left');
    updatePlayer();
    updateHUD();
    closeModal();
  }

  /* ---------------- 渲染 ---------------- */
  function paintCell(r, c) {
    const cell = state.grid[r][c];
    let cls = cell.type;
    if (cell.type === 'yellow' && cell.hp < CONFIG.YELLOW_HP) cls = 'orange';
    if (cell.type === 'bomb' && !CONFIG.REVEAL_BOMBS) cls = 'blue';
    cells[r][c].className = 'cell ' + cls;
  }

  function updatePlayer() {
    els.player.style.setProperty('--pr', state.r);
    els.player.style.setProperty('--pc', state.c);
    const cam = Math.max(0, Math.min(state.r - 1, ROWS - VISIBLE_ROWS));
    els.grid.style.setProperty('--cam', cam);
  }

  function updateHUD() {
    bumpIfChanged(els.hearts, state.hearts);
    bumpIfChanged(els.shovels, state.shovels);
    bumpIfChanged(els.coins, state.coins);
    els.depth.textContent = state.r + 1;
  }

  function bumpIfChanged(el, value) {
    if (el.textContent !== String(value)) {
      el.textContent = value;
      const box = el.parentElement;
      box.classList.remove('pulse');
      void box.offsetWidth;
      box.classList.add('pulse');
    }
  }

  function floatText(r, c, text, color, big) {
    const f = document.createElement('div');
    f.className = 'float' + (big ? ' big' : '');
    f.textContent = text;
    f.style.color = color || '#fff';
    f.style.setProperty('--fr', r);
    f.style.setProperty('--fc', c);
    els.grid.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1600);
  }

  /* ---------------- 操作 ---------------- */
  function canAct() { return state && !state.over && !modalType; }

  function act(dir) {
    if (!canAct()) return;
    const { r, c } = state;

    if (dir === 'left' || dir === 'right') {
      const nc = c + (dir === 'left' ? -1 : 1);
      els.player.classList.toggle('face-left', dir === 'left');
      if (nc < 0 || nc >= COLS) { toast('前面是坚硬的岩壁'); return; }
      if (state.grid[r][nc].type === 'empty') {
        state.c = nc;
        fall();
      } else {
        dig(r, nc);
      }
    } else if (dir === 'down') {
      if (r + 1 >= ROWS) { toast('已经到达矿山最底层！'); return; }
      if (state.grid[r + 1][c].type === 'empty') fall();
      else if (dig(r + 1, c) === 'cleared') fall();
    } else if (dir === 'up') {
      if (r - 1 < 0) { toast('上面就是地面了'); return; }
      if (state.grid[r - 1][c].type === 'empty') { toast('无法跳跃哦'); return; }
      dig(r - 1, c);
    }

    updatePlayer();
    updateHUD();
    afterAction();
  }

  // 掉落：脚下为空就一直往下落
  function fall() {
    while (state.r + 1 < ROWS && state.grid[state.r + 1][state.c].type === 'empty') state.r++;
  }

  // 挖矿：返回 'cleared' / 'partial' / null
  function dig(r, c) {
    if (state.shovels <= 0) { showQuiz(); return null; }
    const cell = state.grid[r][c];
    state.shovels--;

    const el = cells[r][c];
    el.classList.remove('hit');
    void el.offsetWidth;
    el.classList.add('hit');

    if (cell.type === 'yellow') {
      cell.hp--;
      if (cell.hp > 0) { paintCell(r, c); return 'partial'; }
    }

    if (cell.type === 'bomb') {
      state.hearts--;
      state.stats.bomb++;
      floatText(r, c, '💥', null, true);
      els.player.classList.remove('hurt');
      void els.player.offsetWidth;
      els.player.classList.add('hurt');
      toast('💣 挖到炸弹！生命 -1');
    } else {
      const value = CONFIG.VALUE[cell.type] || 0;
      state.coins += value;
      state.stats[cell.type]++;
      const color = { blue: '#bfe0ff', yellow: '#ffe066', purple: '#e8b8ff' }[cell.type];
      floatText(r, c, '+' + value, color);
      if (cell.type === 'purple') toast('💎 发现紫色宝石！+10 金币');
    }
    state.grid[r][c] = { type: 'empty', hp: 0 };
    paintCell(r, c);
    return 'cleared';
  }

  function afterAction() {
    if (state.over) return;
    if (state.hearts <= 0) showDeath();
    else if (state.shovels <= 0) showQuiz();
  }

  /* ---------------- 弹窗 ---------------- */
  function openModal(type, html) {
    modalType = type;
    els.box.innerHTML = html;
    els.modal.classList.remove('hidden');
    return els.box;
  }

  function closeModal() {
    modalType = null;
    els.modal.classList.add('hidden');
    els.box.innerHTML = '';
  }

  function packsHTML() {
    return '<div class="packs">' + CONFIG.SHOP.map((p, i) => `
      <div class="pack">
        <span>❤️ × ${p.hearts}</span>
        <button class="btn" data-pack="${i}" ${state.coins < p.price ? 'disabled' : ''}>🪙 ${p.price}</button>
      </div>`).join('') + '</div>';
  }

  function bindPacks(box, onBought) {
    box.querySelectorAll('[data-pack]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = CONFIG.SHOP[+btn.dataset.pack];
        if (state.coins < p.price) return;
        state.coins -= p.price;
        state.hearts += p.hearts;
        updateHUD();
        toast(`购买成功：生命 +${p.hearts}`);
        onBought();
      });
    });
  }

  // 小商店
  function showShop() {
    if (!state || state.over || modalType) return;
    if (state.hearts <= 0) { showDeath(); return; }
    renderShop();
  }

  function renderShop() {
    const box = openModal('shop', `
      <h2>🛒 小商店</h2>
      <p>当前金币：🪙 <b>${state.coins}</b> · 生命：❤️ <b>${state.hearts}</b></p>
      ${packsHTML()}
      <div class="modal-actions"><button class="btn btn-ghost" id="m-close">关闭</button></div>
    `);
    bindPacks(box, renderShop);
    box.querySelector('#m-close').addEventListener('click', closeModal);
  }

  // 生命归零
  function showDeath() {
    const box = openModal('death', `
      <h2>💔 生命值归零</h2>
      <p>你有 🪙 <b>${state.coins}</b> 金币。<br>购买生命值继续挖矿，还是结束游戏？</p>
      ${packsHTML()}
      <div class="modal-actions"><button class="btn btn-danger" id="m-end">结束游戏</button></div>
    `);
    bindPacks(box, () => { closeModal(); afterAction(); });
    box.querySelector('#m-end').addEventListener('click', () => gameOver('生命值耗尽'));
  }

  // 答题
  function showQuiz() {
    const q = QuestionBank.next();
    const box = openModal('quiz', `
      <h2>📝 答题换矿铲</h2>
      <p>${state.shovels <= 0 ? '矿铲用完了！' : ''}答对可获得 <b>${CONFIG.QUIZ_REWARD}</b> 把矿铲（当前 ⛏️ ${state.shovels}）</p>
      <p class="question"></p>
      <div class="options">${q.options.map((_, i) => `<button class="option" data-i="${i}"></button>`).join('')}</div>
      <p class="feedback"></p>
      <div class="modal-actions" id="m-actions"></div>
    `);
    box.querySelector('.question').textContent = q.stem;
    const optBtns = box.querySelectorAll('.option');
    optBtns.forEach((btn, i) => {
      btn.textContent = `${'ABCD'[i]}. ${q.options[i].text}`;
      btn.addEventListener('click', () => answer(i));
    });

    function answer(i) {
      optBtns.forEach((b, j) => {
        b.disabled = true;
        if (q.options[j].correct) b.classList.add('correct');
      });
      const fb = box.querySelector('.feedback');
      const actions = box.querySelector('#m-actions');
      if (q.options[i].correct) {
        state.shovels += CONFIG.QUIZ_REWARD;
        state.stats.quizRight++;
        updateHUD();
        fb.className = 'feedback ok';
        fb.textContent = `回答正确！获得 ${CONFIG.QUIZ_REWARD} 把矿铲，现在共 ${state.shovels} 把。`;
        actions.innerHTML = `
          <button class="btn" id="m-dig">⛏️ 继续挖矿</button>
          <button class="btn btn-ghost" id="m-more">📝 继续答题</button>`;
        actions.querySelector('#m-dig').addEventListener('click', closeModal);
        actions.querySelector('#m-more').addEventListener('click', showQuiz);
      } else {
        optBtns[i].classList.add('wrong');
        fb.className = 'feedback bad';
        fb.textContent = '答错了，再试一道题吧！';
        actions.innerHTML = `<button class="btn" id="m-next">下一题 ➜</button>`;
        actions.querySelector('#m-next').addEventListener('click', showQuiz);
      }
    }
  }

  // 退出
  function showExit() {
    if (!state || state.over || modalType) return;
    const box = openModal('exit', `
      <h2>🚪 退出游戏</h2>
      <p>确定要结束本局吗？</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="m-cancel">继续游戏</button>
        <button class="btn btn-danger" id="m-quit">退出</button>
      </div>
    `);
    box.querySelector('#m-cancel').addEventListener('click', closeModal);
    box.querySelector('#m-quit').addEventListener('click', () => gameOver('你退出了游戏'));
  }

  function gameOver(reason) {
    state.over = true;
    const s = state.stats;
    const box = openModal('over', `
      <h2>🏁 游戏结束</h2>
      <p>${reason}</p>
      <div class="summary">
        <div>🪙 金币<br><b>${state.coins}</b></div>
        <div>⬇️ 深度<br><b>${state.r + 1} / ${ROWS}</b></div>
        <div>🟦 蓝矿<br><b>${s.blue}</b></div>
        <div>🟨 黄矿<br><b>${s.yellow}</b></div>
        <div>💎 宝石<br><b>${s.purple}</b></div>
        <div>💣 炸弹<br><b>${s.bomb}</b></div>
      </div>
      <div class="modal-actions"><button class="btn" id="m-restart">🔄 再来一局</button></div>
    `);
    box.querySelector('#m-restart').addEventListener('click', newGame);
  }

  // Esc 可关闭商店 / 退出确认
  function escape() {
    if (modalType === 'shop' || modalType === 'exit') closeModal();
  }

  return { init, act, showShop, showExit, toast, escape, newGame };
})();
