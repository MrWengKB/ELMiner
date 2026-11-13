// Question bank. CSV format: Question,Answer,Distractor1,Distractor2,Distractor3
const QuestionBank = (() => {
  const BUILTIN = [
    ['What is the capital of France?', 'Paris', 'London', 'Rome', 'Berlin'],
    ['How many months are in a year?', '12', '10', '11', '13'],
    ['What is the chemical formula for water?', 'H₂O', 'CO₂', 'O₂', 'NaCl'],
    ['3 × 7 = ?', '21', '24', '18', '27'],
    ['What is the largest planet in the solar system?', 'Jupiter', 'Saturn', 'Earth', 'Mars'],
    ['What do the angles of a triangle add up to?', '180°', '90°', '270°', '360°'],
    ['How many colors are in a rainbow?', '7', '5', '6', '8'],
    ['Who wrote "Romeo and Juliet"?', 'William Shakespeare', 'Charles Dickens', 'Mark Twain', 'Jane Austen'],
    ['100 ÷ 4 = ?', '25', '20', '40', '24'],
    ['What do giant pandas mostly eat?', 'Bamboo', 'Carrots', 'Apples', 'Fish'],
    ['How many hours are in a day?', '24', '12', '48', '36'],
    ['How long does Earth take to orbit the Sun?', 'One year', 'One month', 'One day', 'One week'],
    ['Which of these animals is a mammal?', 'Whale', 'Shark', 'Penguin', 'Crocodile'],
    ['15 + 27 = ?', '42', '41', '43', '32'],
    ['Diamonds are made mostly of which element?', 'Carbon', 'Iron', 'Silicon', 'Gold'],
  ];

  let questions = BUILTIN.slice();
  let source = 'built-in';
  let queue = [];
  let last = null;

  // Handles quotes, escaped commas, CRLF, BOM; full-width comma as fallback
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
      if (/^(题干|question)$/i.test(r[0])) continue; // skip header row
      result.push(r.slice(0, 5));
    }
    return result;
  }

  function load(text, name) {
    const parsed = parseCSV(text);
    if (!parsed.length) return 0;
    questions = parsed;
    source = name || 'custom';
    queue = [];
    last = null;
    return parsed.length;
  }

  // Auto-detect UTF-8 / GBK (Excel may save CSV in a legacy encoding)
  function decode(buffer) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch (e) {
      try { return new TextDecoder('gbk').decode(buffer); }
      catch (e2) { return new TextDecoder('utf-8').decode(buffer); }
    }
  }

  // Random order, no repeats within a round
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
