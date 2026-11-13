// Core game logic
const Game = (() => {
  const { COLS, ROWS, VISIBLE_ROWS } = CONFIG;
  const $ = id => document.getElementById(id);
  let els = {};
  let cells = [];   // DOM cells
  let state = null;
  let modalType = null;
  let toastTimer = null;

  /* ---------------- Init ---------------- */
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

  /* ---------------- Render ---------------- */
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

  /* ---------------- Actions ---------------- */
  function canAct() { return state && !state.over && !modalType; }

  function act(dir) {
    if (!canAct()) return;
    const { r, c } = state;

    if (dir === 'left' || dir === 'right') {
      const nc = c + (dir === 'left' ? -1 : 1);
      els.player.classList.toggle('face-left', dir === 'left');
      if (nc < 0 || nc >= COLS) { toast('Solid rock wall ahead'); return; }
      if (state.grid[r][nc].type === 'empty') {
        state.c = nc;
        fall();
      } else if (dig(r, nc) === 'cleared') {
        // step into the cleared cell, then fall if nothing below
        state.c = nc;
        fall();
      }
    } else if (dir === 'down') {
      if (r + 1 >= ROWS) { toast('You reached the bottom of the mine!'); return; }
      if (state.grid[r + 1][c].type === 'empty') fall();
      else if (dig(r + 1, c) === 'cleared') fall();
    } else if (dir === 'up') {
      if (r - 1 < 0) { toast('That\'s the surface above'); return; }
      if (state.grid[r - 1][c].type === 'empty') { toast('You can\'t jump!'); return; }
      dig(r - 1, c);
    }

    updatePlayer();
    updateHUD();
    afterAction();
  }

  // Fall while the cell below is empty
  function fall() {
    while (state.r + 1 < ROWS && state.grid[state.r + 1][state.c].type === 'empty') state.r++;
  }

  // Dig: returns 'cleared' / 'partial' / null
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
      toast('💣 Bomb! -1 heart');
    } else {
      const value = CONFIG.VALUE[cell.type] || 0;
      state.coins += value;
      state.stats[cell.type]++;
      const color = { blue: '#bfe0ff', yellow: '#ffe066', purple: '#e8b8ff' }[cell.type];
      floatText(r, c, '+' + value, color);
      if (cell.type === 'purple') toast('💎 Purple gem found! +10 coins');
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

  /* ---------------- Modals ---------------- */
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
        toast(`Purchased: +${p.hearts} heart${p.hearts > 1 ? 's' : ''}`);
        onBought();
      });
    });
  }

  // Shop
  function showShop() {
    if (!state || state.over || modalType) return;
    if (state.hearts <= 0) { showDeath(); return; }
    renderShop();
  }

  function renderShop() {
    const box = openModal('shop', `
      <h2>🛒 Shop</h2>
      <p>Coins: 🪙 <b>${state.coins}</b> · Hearts: ❤️ <b>${state.hearts}</b></p>
      ${packsHTML()}
      <div class="modal-actions"><button class="btn btn-ghost" id="m-close">Close</button></div>
    `);
    bindPacks(box, renderShop);
    box.querySelector('#m-close').addEventListener('click', closeModal);
  }

  // Out of hearts
  function showDeath() {
    const box = openModal('death', `
      <h2>💔 Out of Hearts</h2>
      <p>You have 🪙 <b>${state.coins}</b> coins.<br>Buy hearts to keep mining, or end the game?</p>
      ${packsHTML()}
      <div class="modal-actions"><button class="btn btn-danger" id="m-end">End Game</button></div>
    `);
    bindPacks(box, () => { closeModal(); afterAction(); });
    box.querySelector('#m-end').addEventListener('click', () => gameOver('You ran out of hearts'));
  }

  // Quiz
  function showQuiz() {
    const q = QuestionBank.next();
    const box = openModal('quiz', `
      <h2>📝 Quiz for Shovels</h2>
      <p>${state.shovels <= 0 ? 'Out of shovels! ' : ''}Answer correctly to earn <b>${CONFIG.QUIZ_REWARD}</b> shovels (now ⛏️ ${state.shovels})</p>
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
        fb.textContent = `Correct! +${CONFIG.QUIZ_REWARD} shovels, you now have ${state.shovels}.`;
        actions.innerHTML = `
          <button class="btn" id="m-dig">⛏️ Keep Mining</button>
          <button class="btn btn-ghost" id="m-more">📝 Another Question</button>`;
        actions.querySelector('#m-dig').addEventListener('click', closeModal);
        actions.querySelector('#m-more').addEventListener('click', showQuiz);
      } else {
        optBtns[i].classList.add('wrong');
        fb.className = 'feedback bad';
        fb.textContent = 'Wrong answer. Try another question!';
        actions.innerHTML = `<button class="btn" id="m-next">Next ➜</button>`;
        actions.querySelector('#m-next').addEventListener('click', showQuiz);
      }
    }
  }

  // Quit
  function showExit() {
    if (!state || state.over || modalType) return;
    const box = openModal('exit', `
      <h2>🚪 Quit Game</h2>
      <p>Are you sure you want to end this game?</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="m-cancel">Keep Playing</button>
        <button class="btn btn-danger" id="m-quit">Quit</button>
      </div>
    `);
    box.querySelector('#m-cancel').addEventListener('click', closeModal);
    box.querySelector('#m-quit').addEventListener('click', () => gameOver('You quit the game'));
  }

  function gameOver(reason) {
    state.over = true;
    const s = state.stats;
    const box = openModal('over', `
      <h2>🏁 Game Over</h2>
      <p>${reason}</p>
      <div class="summary">
        <div>🪙 Coins<br><b>${state.coins}</b></div>
        <div>⬇️ Depth<br><b>${state.r + 1} / ${ROWS}</b></div>
        <div>🟦 Blue<br><b>${s.blue}</b></div>
        <div>🟨 Yellow<br><b>${s.yellow}</b></div>
        <div>💎 Gems<br><b>${s.purple}</b></div>
        <div>💣 Bombs<br><b>${s.bomb}</b></div>
      </div>
      <div class="modal-actions"><button class="btn" id="m-restart">🔄 Play Again</button></div>
    `);
    box.querySelector('#m-restart').addEventListener('click', newGame);
  }

  // Esc closes the shop / quit dialog
  function escape() {
    if (modalType === 'shop' || modalType === 'exit') closeModal();
  }

  return { init, act, showShop, showExit, toast, escape, newGame };
})();
