// Game settings (tweak here)
const CONFIG = {
  COLS: 9,            // ores per row
  ROWS: 30,           // total rows
  VISIBLE_ROWS: 5,    // rows visible on screen

  START_HEARTS: 6,
  START_SHOVELS: 10,

  YELLOW_RATE: 0.10,  // yellow ratio (can be connected)
  PURPLE_RATE: 0.03,  // purple gem ratio (never adjacent)
  BOMB_RATE: 0.05,    // bomb ratio

  VALUE: { blue: 1, yellow: 3, purple: 10 },
  YELLOW_HP: 2,       // yellow needs two hits

  QUIZ_REWARD: 5,     // shovels per correct answer

  SHOP: [
    { hearts: 1, price: 10 },
    { hearts: 5, price: 45 },
    { hearts: 10, price: 85 },
  ],

  REVEAL_BOMBS: true,  // true = show bombs as 💣; false = disguise as blue ore
  PLAYER: '👷',
};
