// 計算の基礎（割合・増減率・概算）
import { comma, roundTo, spreadChoices } from './lib.mjs';

const T = {
  percentOf(rng) {
    const a = rng.int(12, 96) * rng.pick([10, 25, 50]);
    const p = rng.pick([4, 6, 8, 12, 15, 18, 24, 35, 45, 65, 85]);
    const v = (a * p) / 100;
    return { q: `${comma(a)} の ${p}% はいくつか。`, c: v, digits: 1, exp: `${comma(a)} × ${p / 100} = ${comma(v, 1)}\n「% → 小数」は 100 で割ります（${p}% = ${p / 100}）。`, extra: [a * p / 10] };
  },
  rate(rng) {
    const a = rng.int(8, 60) * 10;
    const r = rng.pick([-25, -20, -15, -12, -8, 5, 8, 12, 15, 20, 25, 30, 40]);
    const b = (a * (100 + r)) / 100;
    if (!Number.isInteger(b)) return null;
    const up = r > 0;
    return {
      q: `ある商品の価格が ${comma(a)} 円から ${comma(b)} 円になった。何 % ${up ? '値上がり' : '値下がり'}したか。`,
      c: Math.abs(r),
      digits: 1,
      unit: '%',
      exp: `変化した額 ÷ 元の額 で求めます。\n${comma(Math.abs(b - a))} ÷ ${comma(a)} = ${Math.abs(r) / 100} → ${Math.abs(r)}%\n変化した後の額（${comma(b)}）で割らないように注意しましょう。`,
      extra: [roundTo((Math.abs(b - a) / b) * 100, 1)],
    };
  },
  reverse(rng) {
    const x = rng.int(6, 90) * 10;
    const r = rng.pick([10, 20, 25, 30, 40, 50, -10, -20, -25]);
    const y = (x * (100 + r)) / 100;
    if (!Number.isInteger(y)) return null;
    return {
      q: `ある数を ${Math.abs(r)}% ${r > 0 ? '増やす' : '減らす'}と ${comma(y)} になった。元の数はいくつか。`,
      c: x,
      exp: `元の数 × ${(100 + r) / 100} = ${comma(y)}\n元の数 = ${comma(y)} ÷ ${(100 + r) / 100} = ${comma(x)}\n${comma(y)} × ${(100 - r) / 100} と計算するのはよくある間違いです。`,
      extra: [(y * (100 - r)) / 100],
    };
  },
  nested(rng) {
    const a = rng.pick([20, 25, 30, 40, 45, 60, 75, 80]);
    const b = rng.pick([10, 15, 20, 25, 30, 40, 50]);
    const v = (a * b) / 100;
    const ctx = rng.pick([
      ['社員', '女性', '管理職'],
      ['回答者', '学生', '「満足」と答えた人'],
      ['来場者', '県外から来た人', '宿泊した人'],
    ]);
    return {
      q: `${ctx[0]}の ${a}% が${ctx[1]}で、${ctx[1]}のうち ${b}% が${ctx[2]}である。${ctx[2]}の${ctx[1]}は、${ctx[0]}全体の何 % か。`,
      c: v,
      digits: 1,
      unit: '%',
      exp: `割合の割合は掛け算です。\n${a / 100} × ${b / 100} = ${roundTo(v / 100, 4)} → ${comma(v, 1)}%`,
      extra: [a + b, Math.abs(a - b)],
    };
  },
  frac(rng) {
    const pairs = [[1, 8], [3, 8], [5, 8], [7, 8], [1, 16], [3, 16], [1, 40], [3, 40], [7, 20], [9, 25], [13, 20], [11, 25], [17, 50], [3, 125], [7, 4], [5, 2]];
    const [n, d] = rng.pick(pairs);
    const v = (n / d) * 100;
    // 選択肢はほかの分数の百分率（きれいな数どうしで比べる）
    const others = rng.sample(pairs.filter(([a, b]) => a / b !== n / d).map(([a, b]) => (a / b) * 100), 3);
    const all = [...others, v].sort((a, b) => a - b);
    return { q: `${n}/${d} を百分率で表すと何 % か。`, fixed: { choices: all.map((x) => `${comma(x, 2)}%`), answer: all.indexOf(v) }, exp: `${n} ÷ ${d} = ${n / d} → ${comma(v, 2)}%
分母を 100 にそろえる（${d} × ${roundTo(100 / d, 3)} = 100）と考えても求められます。` };
  },
  approx(rng) {
    const a = rng.int(1200, 9800);
    const b = rng.pick([0.198, 0.252, 0.331, 0.489, 0.751, 1.21, 1.48, 2.02, 0.0975]);
    const v = a * b;
    return {
      q: `${comma(a)} × ${b} に最も近いものはどれか。`,
      c: Math.round(v),
      step: 0.3,
      exp: `概算: ${comma(Math.round(a / 100) * 100)} × ${roundTo(b, 2)} ≒ ${comma(Math.round((Math.round(a / 100) * 100 * roundTo(b, 2)) / 10) * 10)}\n正確には ${comma(roundTo(v, 2), 2)}。選択肢の間が広いときは、上 2 桁で計算すれば十分です。`,
    };
  },
  twoYears(rng) {
    const a = rng.pick([10, 20, 25, 30, 40, 50]);
    const b = rng.pick([10, 20, 25, 30, 40]);
    const v = (1 + a / 100) * (1 - b / 100) * 100 - 100;
    if (Math.abs(v) < 0.5) return null;
    return {
      q: `ある店の売上高は、1 年目に ${a}% 増え、2 年目に ${b}% 減った。最初と比べて何 % ${v > 0 ? '増えた' : '減った'}か。`,
      c: Math.abs(roundTo(v, 1)),
      digits: 1,
      unit: '%',
      exp: `増減率は足し算ではなく掛け算で重ねます。\n${1 + a / 100} × ${1 - b / 100} = ${roundTo(1 + v / 100, 4)}\nよって ${comma(Math.abs(roundTo(v, 1)), 1)}% ${v > 0 ? '増加' : '減少'}。${a - b === 0 ? '同じ率で増えて減っても元には戻りません。' : ''}`,
      extra: [Math.abs(a - b) || 1],
    };
  },
  amount(rng) {
    const total = rng.int(12, 96) * 100;
    const p = rng.pick([12.5, 15, 22, 35, 37.5, 42, 64]);
    const v = (total * p) / 100;
    return { q: `全体 ${comma(total)} 人のうち ${p}% が「はい」と答えた。「はい」と答えた人は何人か。`, c: v, exp: `${comma(total)} × ${p / 100} = ${comma(v)}（人）`, unit: '人' };
  },
  discount(rng) {
    const price = rng.int(8, 60) * 100;
    const off = rng.pick([1, 2, 3, 4]);
    const sale = (price * (10 - off)) / 10;
    return {
      q: `定価の ${off} 割引きで売ると ${comma(sale)} 円だった。定価はいくらか。`,
      c: price,
      unit: '円',
      exp: `${off} 割引き = 定価の ${(10 - off) / 10} 倍。\n定価 = ${comma(sale)} ÷ ${(10 - off) / 10} = ${comma(price)}（円）`,
      extra: [(sale * (10 + off)) / 10],
    };
  },
};

export function genKeisan(rng, { count, id, domain }) {
  const names = Object.keys(T);
  const out = [];
  const seen = new Set();
  while (out.length < count) {
    const t = T[rng.pick(names)](rng);
    if (!t || seen.has(t.q)) continue;
    seen.add(t.q);
    if (t.fixed) {
      out.push({ id: id(), domain, type: 'single', question: t.q, choices: t.fixed.choices, answer: [t.fixed.answer], explanation: t.exp });
      continue;
    }
    const digits = t.digits ?? 0;
    const unit = t.unit ?? '';
    const { choices, answer } = spreadChoices(rng, t.c, {
      n: 4,
      digits,
      step: t.step ?? 0.2,
      extra: t.extra ?? [],
      format: (v) => `${comma(v, digits)}${unit === '%' ? '%' : unit ? ` ${unit}` : ''}`,
    });
    out.push({ id: id(), domain, type: 'single', question: t.q, choices, answer: [answer], explanation: t.exp });
  }
  return out;
}
