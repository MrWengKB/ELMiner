// 题库：CSV 格式  题干,选择1,选择2,选择3,选择4  （选择1 为正确答案）
const QuestionBank = (() => {
  const BUILTIN = [
    ['中国的首都是哪座城市？', '北京', '上海', '广州', '南京'],
    ['一年有多少个月？', '12', '10', '11', '13'],
    ['水的化学式是？', 'H₂O', 'CO₂', 'O₂', 'NaCl'],
    ['3 × 7 = ?', '21', '24', '18', '27'],
    ['太阳系中最大的行星是？', '木星', '土星', '地球', '火星'],
    ['一个三角形的内角和是多少度？', '180°', '90°', '270°', '360°'],
    ['彩虹通常有几种颜色？', '7', '5', '6', '8'],
    ['“床前明月光”的作者是？', '李白', '杜甫', '白居易', '王维'],
    ['100 ÷ 4 = ?', '25', '20', '40', '24'],
    ['熊猫最爱吃的食物是？', '竹子', '胡萝卜', '苹果', '鱼'],
    ['一天有多少小时？', '24', '12', '48', '36'],
    ['地球绕太阳一圈大约需要多久？', '一年', '一个月', '一天', '一周'],
    ['下列哪种动物是哺乳动物？', '鲸鱼', '鲨鱼', '企鹅', '鳄鱼'],
    ['15 + 27 = ?', '42', '41', '43', '32'],
    ['钻石主要由哪种元素组成？', '碳', '铁', '硅', '金'],
  ];

  let questions = BUILTIN.slice();
  let source = '内置';
  let queue = [];
  let last = null;

  // 支持引号、逗号转义、CRLF、BOM；中文逗号作为后备分隔符
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }

    const result = [];
    for (let r of rows) {
      if (r.length < 5 && r.length === 1 && r[0].includes('，')) r = r[0].split('，');
      r = r.map(s => s.trim());
      if (r.length < 5 || r.slice(0, 5).some(s => s === '')) continue;
      if (r[0] === '题干') continue; // 跳过表头
      result.push(r.slice(0, 5));
    }
    return result;
  }

  function load(text, name) {
    const parsed = parseCSV(text);
    if (!parsed.length) return 0;
    questions = parsed;
    source = name || '自定义';
    queue = [];
    last = null;
    return parsed.length;
  }

  // 自动识别 UTF-8 / GBK（Excel 中文另存为 CSV 常见 GBK）
  function decode(buffer) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch (e) {
      try { return new TextDecoder('gbk').decode(buffer); }
      catch (e2) { return new TextDecoder('utf-8').decode(buffer); }
    }
  }

  // 随机出题，一轮内不重复
  function next() {
    if (!queue.length) {
      queue = MapGen.shuffle(questions.map((_, i) => i));
      if (queue.length > 1 && queue[queue.length - 1] === last) queue.unshift(queue.pop());
    }
    const idx = queue.pop();
    last = idx;
    const [stem, ...opts] = questions[idx];
    const options = MapGen.shuffle(opts.map((text, i) => ({ text, correct: i === 0 })));
    return { stem, options, answer: opts[0] };
  }

  return {
    load, decode, next, parseCSV,
    get count() { return questions.length; },
    get source() { return source; },
  };
})();
