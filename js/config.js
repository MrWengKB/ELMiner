// 游戏参数（可在此调整）
const CONFIG = {
  COLS: 9,            // 每排矿石数
  ROWS: 30,           // 总排数
  VISIBLE_ROWS: 5,    // 一屏可见排数

  START_HEARTS: 6,
  START_SHOVELS: 10,

  YELLOW_RATE: 0.10,  // 黄矿比例（可相连）
  PURPLE_RATE: 0.03,  // 紫色宝石比例（互不相连）
  BOMB_RATE: 0.05,    // 炸弹比例

  VALUE: { blue: 1, yellow: 3, purple: 10 },
  YELLOW_HP: 2,       // 黄矿需挖两次

  QUIZ_REWARD: 5,     // 答对奖励矿铲

  SHOP: [
    { hearts: 1, price: 10 },
    { hearts: 5, price: 45 },
    { hearts: 10, price: 85 },
  ],

  REVEAL_BOMBS: true,  // true = 炸弹显示为 💣；false = 炸弹伪装成蓝色矿石
  PLAYER: '👷',
};
