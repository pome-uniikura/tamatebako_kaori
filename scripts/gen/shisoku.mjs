// 四則逆算（□ に入る数を求める）
import { Frac } from './lib.mjs';

const MUL = [0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 1.2, 1.25, 1.5, 2.5, 3, 4, 5, 6, 7, 8, 9, 12, 15, 16, 18, 24, 25];
const MUL_EASY = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15, 25];
const PCT = [5, 8, 12, 15, 20, 24, 25, 30, 35, 40, 45, 60, 75, 80, 120, 125, 150];
const B_POOL = [2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 16, 18, 20, 24, 25, 0.5, 0.4, 0.8, 1.5, 2.5];

const f = (x) => Frac.of(x);
/** 式に出す数の表示 */
const s = (x) => Frac.of(x).toString();
const sf = (x) => Frac.of(x).toString(true);

function ok(x, digits = 2, max = 100000) {
  const v = Frac.of(x);
  return v.value > 0 && v.value < max && v.isNiceDecimal(digits);
}

/** 正解に近い数を中心に、間違えやすい数をまぜて選択肢を作る */
function choicesFor(rng, x, specific, n, fraction = false) {
  const xv = x.value;
  const pool = [];
  if (fraction) {
    const cands = [new Frac(x.d, x.n), new Frac(x.n + 1, x.d), new Frac(Math.max(1, x.n - 1), x.d), new Frac(x.n, x.d + 1), new Frac(x.n * 2, x.d), new Frac(x.n, x.d * 2), new Frac(x.n + x.d, x.d)];
    for (const c of [...specific, ...rng.shuffle(cands)]) if (c.value > 0 && !c.eq(x) && !pool.some((p) => p.eq(c))) pool.push(c);
  } else {
    const unit = x.isInt() ? Math.max(1, Math.round(xv * rng.pick([0.05, 0.08, 0.1, 0.12]))) : x.isNiceDecimal(1) ? Math.max(0.1, Math.round(xv * 0.1 * 10) / 10) : 0.05;
    const near = [];
    for (let k = 1; k <= 4; k++) near.push(xv + k * unit, xv - k * unit);
    // 間違えやすい計算の結果を 1 つ（正解に近く、きれいな数のときだけ）
    const specs = specific.filter((c) => c.value > 0 && !c.eq(x) && c.isNiceDecimal(2) && c.value / xv > 0.3 && c.value / xv < 3);
    const take = [];
    for (const c of rng.shuffle(specs)) {
      if (take.length >= 1) break;
      take.push(Number(c.value.toFixed(3)));
    }
    // 正解の位置がかたよらないよう、正解より小さい数と大きい数の個数をランダムに決める
    const wantBelow = rng.int(0, n - 1);
    const below = near.filter((v) => v > 0 && v < xv).sort((a, b) => b - a);
    const above = near.filter((v) => v > xv).sort((a, b) => a - b);
    let nb = Math.min(wantBelow, below.length);
    const fixedSpec = take.map((v) => Frac.fromDecimal(v));
    const specBelow = fixedSpec.filter((c) => c.value < xv).length;
    nb = Math.max(0, nb - specBelow);
    const na = Math.max(0, n - 1 - fixedSpec.length - nb);
    const picked = [...below.slice(0, nb), ...above.slice(0, na)];
    for (const v of [...take, ...picked, ...rng.shuffle(near)]) {
      if (!(v > 0)) continue;
      const c = Frac.fromDecimal(Number(v.toFixed(3)));
      if (!c.eq(x) && !pool.some((p) => p.eq(c))) pool.push(c);
    }
  }
  const chosen = pool.slice(0, n - 1);
  const all = [...chosen, x].sort((a, b) => a.value - b.value);
  return { choices: all.map((c) => (fraction ? sf(c) : s(c))), answer: all.findIndex((c) => c.eq(x)) };
}

const randX = (rng, easy) => {
  if (easy) return f(rng.int(2, 99));
  const r = rng.next();
  if (r < 0.55) return f(rng.int(2, 99));
  if (r < 0.8) return f(rng.int(100, 999));
  return Frac.fromDecimal(Number((rng.int(11, 999) / 10).toFixed(1)));
};

/** テンプレートごとに、式・正解・間違えやすい数・解説を作る */
const templates = {
  // □ × A = B × C
  mulEq(rng, easy) {
    for (let t = 0; t < 200; t++) {
      const x = randX(rng, easy);
      const A = f(rng.pick(easy ? MUL_EASY : MUL));
      const P = x.mul(A);
      const B = f(rng.pick(easy ? [2, 3, 4, 5, 6, 8, 9, 12] : B_POOL));
      const C = P.div(B);
      if (!ok(C, easy ? 0 : 2, 5000) || C.value < 2 || B.eq(C) || A.eq(B) || A.eq(C) || A.eq(1)) continue;
      const swap = rng.chance(0.5);
      return {
        expr: swap ? `${s(A)} × □ = ${s(B)} × ${s(C)}` : `□ × ${s(A)} = ${s(B)} × ${s(C)}`,
        x,
        wrong: [P.mul(A), P, x.mul(10)],
        exp: `右辺を先に計算します。${s(B)} × ${s(C)} = ${s(P)}\n□ = ${s(P)} ÷ ${s(A)} = ${s(x)}`,
      };
    }
  },
  // A ÷ □ = B  /  □ ÷ A = B
  divEq(rng, easy) {
    for (let t = 0; t < 200; t++) {
      const x = randX(rng, easy);
      if (rng.chance(0.5)) {
        const B = f(rng.pick(easy ? [2, 3, 4, 5, 6, 7, 8, 9, 12] : [0.4, 0.5, 0.8, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 12, 15, 16, 24]));
        const A = x.mul(B);
        if (!ok(A, easy ? 0 : 2, 50000)) continue;
        return { expr: `${s(A)} ÷ □ = ${s(B)}`, x, wrong: [A.mul(B), x.mul(B)], exp: `□ = ${s(A)} ÷ ${s(B)} = ${s(x)}` };
      }
      const A = f(rng.pick(easy ? MUL_EASY : MUL));
      const B = x.div(A);
      if (!ok(B, easy ? 0 : 2, 50000)) continue;
      return { expr: `□ ÷ ${s(A)} = ${s(B)}`, x, wrong: [B.div(A), x.mul(A)], exp: `□ = ${s(B)} × ${s(A)} = ${s(x)}` };
    }
  },
  // (□ + A) × B = C  /  (□ − A) ÷ B = C
  paren(rng, easy) {
    for (let t = 0; t < 200; t++) {
      const x = f(rng.int(3, easy ? 99 : 300));
      const A = f(rng.int(2, 99));
      const B = f(rng.pick(easy ? [2, 3, 4, 5, 6, 8] : [2, 3, 4, 5, 6, 8, 0.5, 0.25, 1.5, 2.5, 1.2]));
      if (rng.chance(0.5)) {
        const C = x.add(A).mul(B);
        if (!ok(C, easy ? 0 : 2)) continue;
        return {
          expr: `(□ + ${s(A)}) × ${s(B)} = ${s(C)}`,
          x,
          wrong: [C.div(B), x.add(A.mul(2)), C.div(B).add(A)],
          exp: `□ + ${s(A)} = ${s(C)} ÷ ${s(B)} = ${s(x.add(A))}\n□ = ${s(x.add(A))} − ${s(A)} = ${s(x)}`,
        };
      }
      if (x.value <= A.value) continue;
      const C = x.sub(A).div(B);
      if (!ok(C, easy ? 0 : 2)) continue;
      return {
        expr: `(□ − ${s(A)}) ÷ ${s(B)} = ${s(C)}`,
        x,
        wrong: [C.mul(B), C.mul(B).sub(A), C.add(A)],
        exp: `□ − ${s(A)} = ${s(C)} × ${s(B)} = ${s(x.sub(A))}\n□ = ${s(x.sub(A))} + ${s(A)} = ${s(x)}`,
      };
    }
  },
  // A − □ × B = C
  subMul(rng, easy) {
    for (let t = 0; t < 200; t++) {
      const x = f(rng.int(2, easy ? 60 : 120));
      const B = f(rng.pick(easy ? [2, 3, 4, 5, 6, 7, 8, 9] : [3, 4, 6, 7, 8, 9, 12, 0.5, 0.4, 1.5, 2.5]));
      const C = f(rng.int(5, 300));
      const A = x.mul(B).add(C);
      if (!ok(A, easy ? 0 : 2)) continue;
      return {
        expr: `${s(A)} − □ × ${s(B)} = ${s(C)}`,
        x,
        wrong: [A.sub(C), A.add(C).div(B)],
        exp: `□ × ${s(B)} = ${s(A)} − ${s(C)} = ${s(x.mul(B))}\n□ = ${s(x.mul(B))} ÷ ${s(B)} = ${s(x)}`,
      };
    }
  },
  // □ × A% = B
  pct(rng) {
    for (let t = 0; t < 200; t++) {
      const x = f(rng.int(2, 120) * rng.pick([5, 10, 20, 4]));
      const p = rng.pick(PCT);
      const B = x.mul(new Frac(p, 100));
      if (!ok(B, 1, 50000) || B.value < 1) continue;
      return {
        expr: rng.chance(0.5) ? `□ × ${p}% = ${s(B)}` : `${p}% × □ = ${s(B)}`,
        x,
        wrong: [B.mul(new Frac(p, 100)), B.mul(p)],
        exp: `${p}% = ${s(new Frac(p, 100))} なので\n□ = ${s(B)} ÷ ${s(new Frac(p, 100))} = ${s(x)}`,
      };
    }
  },
  // 分数
  frac(rng) {
    for (let t = 0; t < 300; t++) {
      const x = new Frac(rng.int(1, 11), rng.int(2, 12));
      if (x.isInt()) continue;
      const p = new Frac(rng.int(1, 9), rng.int(2, 10));
      if (p.isInt()) continue;
      const kind = rng.pick(['mul', 'add', 'div']);
      if (kind === 'mul') {
        const r = x.mul(p);
        if (r.d > 60 || r.n > 60) continue;
        return {
          expr: `□ × ${sf(p)} = ${sf(r)}`,
          x,
          fraction: true,
          wrong: [r.mul(p)],
          exp: `□ = ${sf(r)} ÷ ${sf(p)} = ${sf(r)} × ${p.d}/${p.n} = ${sf(x)}`,
        };
      }
      if (kind === 'add') {
        const r = x.add(p);
        if (r.d > 60 || r.n > 80) continue;
        return {
          expr: `□ + ${sf(p)} = ${sf(r)}`,
          x,
          fraction: true,
          wrong: [r.add(p)],
          exp: `□ = ${sf(r)} − ${sf(p)}。通分して計算すると ${sf(x)}`,
        };
      }
      const r = p.div(x);
      if (r.d > 60 || r.n > 60 || r.isInt()) continue;
      return {
        expr: `${sf(p)} ÷ □ = ${sf(r)}`,
        x,
        fraction: true,
        wrong: [p.mul(r)],
        exp: `□ = ${sf(p)} ÷ ${sf(r)} = ${sf(p)} × ${r.d}/${r.n} = ${sf(x)}`,
      };
    }
  },
  // A × B − □ = C ÷ D
  mixed(rng, easy) {
    for (let t = 0; t < 300; t++) {
      const A = f(rng.int(3, 40));
      const B = f(rng.pick(easy ? [2, 3, 4, 5, 6, 7, 8, 9] : [3, 4, 6, 7, 8, 9, 12, 0.5, 1.5, 2.5, 0.8]));
      const D = f(rng.pick([2, 3, 4, 5, 6, 8]));
      const R = f(rng.int(2, 60));
      const C = R.mul(D);
      const x = A.mul(B).sub(R);
      if (x.value <= 0 || !ok(x, easy ? 0 : 2) || !ok(A.mul(B), 2)) continue;
      return {
        expr: `${s(A)} × ${s(B)} − □ = ${s(C)} ÷ ${s(D)}`,
        x,
        wrong: [A.mul(B).add(R), C.sub(A.mul(B))],
        exp: `左の掛け算 ${s(A)} × ${s(B)} = ${s(A.mul(B))}、右辺 ${s(C)} ÷ ${s(D)} = ${s(R)}\n□ = ${s(A.mul(B))} − ${s(R)} = ${s(x)}`,
      };
    }
  },
  // □ − A = B × C（小数）
  subDec(rng, easy) {
    for (let t = 0; t < 200; t++) {
      const A = easy ? f(rng.int(2, 99)) : Frac.fromDecimal(Number((rng.int(5, 999) / rng.pick([10, 100])).toFixed(2)));
      const B = easy ? f(rng.int(2, 12)) : Frac.fromDecimal(Number((rng.int(2, 99) / 10).toFixed(1)));
      const C = easy ? f(rng.int(2, 15)) : f(rng.pick([2, 3, 4, 5, 6, 0.5, 1.5, 0.4]));
      const x = A.add(B.mul(C));
      if (!ok(x, 2) || B.mul(C).value < 1) continue;
      return {
        expr: `□ − ${s(A)} = ${s(B)} × ${s(C)}`,
        x,
        wrong: [B.mul(C).sub(A), B.mul(C)],
        exp: `右辺 ${s(B)} × ${s(C)} = ${s(B.mul(C))}\n□ = ${s(B.mul(C))} + ${s(A)} = ${s(x)}`,
      };
    }
  },
};

export function genShisoku(rng, { count, id, domain, easy = false, nChoices = 5 }) {
  const names = easy ? ['mulEq', 'divEq', 'paren', 'subMul', 'mixed', 'subDec'] : ['mulEq', 'mulEq', 'divEq', 'paren', 'subMul', 'pct', 'frac', 'mixed', 'subDec'];
  const out = [];
  const seen = new Set();
  while (out.length < count) {
    const name = rng.pick(names);
    const t = templates[name](rng, easy);
    if (!t || seen.has(t.expr)) continue;
    seen.add(t.expr);
    const { choices, answer } = choicesFor(rng, t.x, (t.wrong ?? []).filter(Boolean), nChoices, t.fraction);
    if (choices.length !== nChoices || new Set(choices).size !== nChoices) continue;
    out.push({
      id: id(),
      domain,
      type: 'single',
      question: `次の式の □ に入る数を求めなさい。\n${t.expr}`,
      choices,
      answer: [answer],
      explanation: t.exp,
    });
  }
  return out;
}
