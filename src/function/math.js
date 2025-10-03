// ─── Info ─────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/math.js ────────────────

import { randomChoice } from './index.js';

export const modes = {
  noob:     [-5, 5, -5, 5, '+-', 30000, 5n],
  easy:     [-10, 10, -10, 10, '+-', 25000, 50n],
  medium:   [-50, 50, -50, 50, '*/+-', 20000, 100n],
  hard:     [-100, 100, -100, 100, '*/+-', 15000, 1000n],
  extreme:  [-999999, 999999, -999999, 999999, '*/', 10000, 100000n]
};
const operators = {
  '+': '+',
  '-': '-',
  '*': '×',
  '/': '÷'
};
export function genMath(mode) {
  const [a1, a2, b1, b2, ops, time, bonus] = modes[mode];
  let a = randomInt(a1, a2);
  const b = randomInt(b1, b2);
  const op = randomChoice([...ops]);
  let result = (new Function(`return ${a} ${op.replace('/', '*')} ${b < 0 ? `(${b})` : b}`))();
  if (op === '/') [a, result] = [result, a];
  return {
    str: `${a} ${operators[op]} ${b}`,
    mode,
    time,
    bonus,
    result
  };
};
function randomInt(from, to) {
  if (from > to) [from, to] = [to, from];
  from = Math.floor(from);
  to = Math.floor(to);
  return Math.floor(Math.random() * (to - from + 1) + from);
};