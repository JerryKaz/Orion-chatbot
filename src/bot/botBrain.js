import { Chatbot } from 'supersimpledev';

export const BOT_NAME = 'Orion';

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "I told my computer I needed a break, and it said: 'No problem, I'll go to sleep.'",
  "Why did the developer go broke? Because he used up all his cache.",
  "There are 10 kinds of people in the world: those who understand binary and those who don't.",
  "Why was the JavaScript developer sad? Because he didn't know how to 'null' his feelings.",
  "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
];

const QUOTES = [
  'The secret of getting ahead is getting started.',
  "It always seems impossible until it's done.",
  'Small daily improvements are the key to staggering long-term results.',
  "Don't watch the clock; do what it does. Keep going.",
  'Simplicity is the soul of efficiency.',
  'First, solve the problem. Then, write the code.',
];

export const QUICK_REPLIES = [
  'What can you do?',
  "What's today's date?",
  'What time is it?',
  'Tell me a joke',
  'Flip a coin',
  'Roll a dice',
  'Calculate 12 * (3 + 4)',
  'Give me a quote',
];

const HELP_TEXT = `Here's what I can do:
• Tell you today's date or the current time
• Flip a coin or roll a dice
• Do quick maths, e.g. "calculate 15% of 80" or "(4 + 6) * 3"
• Pick a random number, e.g. "random number between 1 and 50"
• Tell a joke or share a motivational quote`;

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/* ---------- Safe arithmetic (no eval) ---------- */
// Grammar: expr = term (('+'|'-') term)* ; term = power (('*'|'/'|'%') power)* ;
// power = unary ('^' power)? ; unary = '-' unary | primary ; primary = number | '(' expr ')'
function evaluate(input) {
  const tokens = input.match(/\d+(?:\.\d+)?|[-+*/%^()]/g);
  if (!tokens || tokens.join('') !== input.replace(/\s+/g, '')) return null;
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];

  function primary() {
    const t = next();
    if (t === '(') {
      const v = expr();
      if (next() !== ')') throw new Error('paren');
      return v;
    }
    const n = Number(t);
    if (Number.isNaN(n)) throw new Error('nan');
    return n;
  }
  function unary() {
    if (peek() === '-') { next(); return -unary(); }
    if (peek() === '+') { next(); return unary(); }
    return primary();
  }
  function power() {
    const base = unary();
    if (peek() === '^') { next(); return base ** power(); }
    return base;
  }
  function term() {
    let v = power();
    while (['*', '/', '%'].includes(peek())) {
      const op = next();
      const r = power();
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  }
  function expr() {
    let v = term();
    while (['+', '-'].includes(peek())) {
      v = next() === '+' ? v + term() : v - term();
    }
    return v;
  }

  try {
    const result = expr();
    if (i !== tokens.length || !Number.isFinite(result)) return null;
    return Math.round(result * 1e10) / 1e10;
  } catch {
    return null;
  }
}

function tryMaths(text) {
  // "15% of 80"
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/);
  if (pct) {
    const value = Math.round((Number(pct[1]) / 100) * Number(pct[2]) * 1e10) / 1e10;
    return `${pct[1]}% of ${pct[2]} is ${value.toLocaleString()}`;
  }

  const expression = text
    .replace(/^(what('?s| is)|calculate|calc|compute|solve)\s*/, '')
    .replace(/\btimes\b|x/g, '*')
    .replace(/\bplus\b/g, '+')
    .replace(/\bminus\b/g, '-')
    .replace(/\bdivided by\b/g, '/')
    .replace(/[?=]/g, '')
    .trim();

  // Must contain at least one operator between numbers to count as maths.
  if (!/^[\d\s.+\-*/%^()]+$/.test(expression) || !/\d\s*[-+*/%^]\s*[\d(-]/.test(expression)) {
    return null;
  }
  const result = evaluate(expression);
  if (result === null) return "Hmm, I couldn't work that one out. Check the expression and try again.";
  return `${expression.replace(/\s+/g, ' ')} = ${result.toLocaleString()}`;
}

/* ---------- Intents (checked in order, before the fuzzy fallback) ---------- */
const INTENTS = [
  {
    id: 'help',
    test: /\b(help|what can you do|commands|features|options)\b/,
    reply: () => HELP_TEXT,
  },
  {
    id: 'name',
    test: /\b(your name|who are you|what are you)\b/,
    reply: () => `I'm ${BOT_NAME}, your friendly assistant. Ask me "what can you do?" to see my skills.`,
  },
  {
    id: 'time',
    test: /\b(time|clock)\b/,
    reply: () => `It's ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} right now.`,
  },
  {
    id: 'date',
    test: /\b(date|today|day is it)\b/,
    reply: () =>
      `Today is ${new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`,
  },
  {
    id: 'joke',
    test: /\b(joke|funny|laugh)\b/,
    reply: () => pick(JOKES),
  },
  {
    id: 'quote',
    test: /\b(quote|motivat\w*|inspir\w*)\b/,
    reply: () => `"${pick(QUOTES)}"`,
  },
  {
    id: 'random',
    test: /random number/,
    reply: (text) => {
      const m = text.match(/between\s*(-?\d+)\s*and\s*(-?\d+)/);
      let [min, max] = m ? [Number(m[1]), Number(m[2])] : [1, 100];
      if (min > max) [min, max] = [max, min];
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      return `Your random number between ${min} and ${max} is ${n}.`;
    },
  },
];

const intentReply = (id, text) => INTENTS.find((i) => i.id === id).reply(text);

/* Prompts shown on the welcome screen when the AI is online. */
export const AI_SUGGESTIONS = [
  'Explain React hooks like I am new to coding',
  'Give me a 4-week plan to learn JavaScript',
  'Write a short, friendly out-of-office email',
  'What are 5 good habits for staying productive?',
  'Calculate 15% of 2,450',
  'Tell me a fun fact about space',
];

/*
 * Strict patterns for skills that must be exact (randomness, maths, the clock).
 * Used in AI mode so these stay instant and correct, while everything else goes to the model.
 */
const QUICK_SKILLS = [
  { test: /^(please\s+)?(flip|toss) (a |the )?coin\W*$/, reply: () => (Math.random() < 0.5 ? 'Heads! 🪙' : 'Tails! 🪙') },
  { test: /^(please\s+)?roll (a |the )?(dice|die)\W*$/, reply: () => `You rolled a ${Math.floor(Math.random() * 6) + 1} 🎲` },
  { test: /^(give me |pick )?(a )?random number/, reply: (t) => intentReply('random', t) },
  { test: /^what('?s| is)? (the )?time( is it)?( now)?\W*$|^what time is it\W*$/, reply: (t) => intentReply('time', t) },
  { test: /^what('?s| is)? (today'?s date|the date( today)?)\W*$|^what day is it( today)?\W*$/, reply: (t) => intentReply('date', t) },
];

/** Returns an instant local answer for exact skills, or null to let the AI answer. */
export function getQuickSkillReply(rawText) {
  const text = rawText.trim().toLowerCase();
  if (!text) return null;
  const maths = tryMaths(text.replace(/(\d),(\d{3})/g, '$1$2'));
  if (maths) return maths;
  const skill = QUICK_SKILLS.find(({ test }) => test.test(text));
  return skill ? skill.reply(text) : null;
}

Chatbot.unsuccessfulResponse =
  `Sorry, I didn't quite get that. Try "what can you do?" to see everything I can help with.`;

export function getBotReply(rawText) {
  const text = rawText.trim().toLowerCase();
  if (!text) return Chatbot.emptyMessageResponse;

  const maths = tryMaths(text);
  if (maths) return maths;

  const intent = INTENTS.find(({ test }) => test.test(text));
  if (intent) return intent.reply(text);

  return Chatbot.getResponse(text);
}

/** Simulates "thinking" time so the typing indicator feels natural. */
export function getBotReplyAsync(text) {
  const reply = getBotReply(text);
  const delay = Math.min(1600, 450 + reply.length * 8);
  return new Promise((resolve) => setTimeout(() => resolve(reply), delay));
}
