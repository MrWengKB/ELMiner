// Mine map generation
const MapGen = (() => {
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generate(rows, cols, startCol) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      grid.push([]);
      for (let c = 0; c < cols; c++) grid[r].push({ type: 'blue', hp: 1 });
    }
    const inside = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
    const isStart = (r, c) => r === 0 && c === startCol;
    const total = rows * cols;

    // 1) Yellow: grow small clusters from seeds (4-way connected)
    const yellowTarget = Math.round(total * CONFIG.YELLOW_RATE);
    let yellow = 0;
    let guard = 0;
    while (yellow < yellowTarget && guard++ < 5000) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (isStart(r, c) || grid[r][c].type !== 'blue') continue;
      const cluster = [[r, c]];
      grid[r][c] = { type: 'yellow', hp: CONFIG.YELLOW_HP };
      yellow++;
      const size = 1 + Math.floor(Math.random() * 4); // 1-4 per cluster
      while (cluster.length < size && yellow < yellowTarget) {
        const [br, bc] = cluster[Math.floor(Math.random() * cluster.length)];
        const options = DIRS.map(([dr, dc]) => [br + dr, bc + dc])
          .filter(([nr, nc]) => inside(nr, nc) && !isStart(nr, nc) && grid[nr][nc].type === 'blue');
        if (!options.length) break;
        const [nr, nc] = options[Math.floor(Math.random() * options.length)];
        grid[nr][nc] = { type: 'yellow', hp: CONFIG.YELLOW_HP };
        cluster.push([nr, nc]);
        yellow++;
      }
    }

    // remaining blue cells, shuffled
    const blueCells = () => {
      const list = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if (grid[r][c].type === 'blue' && !isStart(r, c)) list.push([r, c]);
      return shuffle(list);
    };

    // 2) Purple gems: never adjacent
    const purpleTarget = Math.round(total * CONFIG.PURPLE_RATE);
    let purple = 0;
    for (const [r, c] of blueCells()) {
      if (purple >= purpleTarget) break;
      const touching = DIRS.some(([dr, dc]) => inside(r + dr, c + dc) && grid[r + dr][c + dc].type === 'purple');
      if (touching) continue;
      grid[r][c] = { type: 'purple', hp: 1 };
      purple++;
    }

    // 3) Bombs: none next to the start for a safe opening
    const bombTarget = Math.round(total * CONFIG.BOMB_RATE);
    let bombs = 0;
    for (const [r, c] of blueCells()) {
      if (bombs >= bombTarget) break;
      if (r <= 1 && Math.abs(c - startCol) <= 1) continue;
      grid[r][c] = { type: 'bomb', hp: 1 };
      bombs++;
    }

    // start cell is empty
    grid[0][startCol] = { type: 'empty', hp: 0 };
    return grid;
  }

  return { generate, shuffle };
})();
