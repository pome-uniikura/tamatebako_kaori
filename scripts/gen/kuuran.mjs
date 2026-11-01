// 表の空欄推測（表の数値の決まりを見つけて、？ に入る数を求める）
import { comma, spreadChoices } from './lib.mjs';

const L5 = ['A', 'B', 'C', 'D', 'E'];
const Q = '？';

/** 来店客数 × 客単価 = 売上高 */
function product(rng) {
  const names = L5.map((l) => `${l} 店`);
  const rows = names.map(() => {
    const n = rng.int(12, 48) * 100;
    const p = rng.int(60, 150) * 10;
    return { n, p, s: (n * p) / 1000, staff: rng.int(5, 30) };
  });
  const r = rng.int(0, 4);
  const askPrice = rng.chance(0.35);
  const correct = askPrice ? rows[r].p : rows[r].s;
  const table = {
    kind: 'table',
    title: '店舗別の営業データ（1 か月）',
    head: ['店舗', '来店客数（人）', '客単価（円）', '売上高（千円）', '従業員数（人）'],
    rows: rows.map((x, i) => [names[i], comma(x.n), i === r && askPrice ? Q : comma(x.p), i === r && !askPrice ? Q : comma(x.s), x.staff]),
  };
  const ex = rows[(r + 1) % 5];
  const explanation = `どの店舗でも「来店客数 × 客単価 ÷ 1,000 = 売上高（千円）」になっています。\n例: ${names[(r + 1) % 5]} ${comma(ex.n)} × ${comma(ex.p)} ÷ 1,000 = ${comma(ex.s)}\n${
    askPrice
      ? `${names[r]}の客単価 = ${comma(rows[r].s)} × 1,000 ÷ ${comma(rows[r].n)} = ${comma(rows[r].p)}（円）`
      : `${names[r]}の売上高 = ${comma(rows[r].n)} × ${comma(rows[r].p)} ÷ 1,000 = ${comma(rows[r].s)}（千円）`
  }\n従業員数は計算に関係しません。`;
  return {
    figure: table,
    question: `表の ${Q} に入る数値として最も近いものはどれか。`,
    correct,
    extra: askPrice ? [(rows[r].s / rows[r].staff) * 10] : [rows[r].n * rows[r].staff / 10],
    explanation,
  };
}

/** 料金 = 基本料金 + 単価 × 量 */
function linear(rng) {
  const ctx = rng.pick([
    { title: '宅配便の重さと料金', x: '重さ（kg）', y: '料金（円）', xs: [1, 2, 3, 5, 8, 10, 12, 15], base: [400, 900], unit: [60, 180], noise: '配達日数（日）', noiseR: [1, 3] },
    { title: '貸し会議室の利用時間と料金', x: '利用時間（時間）', y: '料金（円）', xs: [1, 2, 3, 4, 5, 6, 8], base: [1000, 3000], unit: [800, 2500], noise: '定員（人）', noiseR: [6, 40] },
    { title: '印刷の部数と費用', x: '部数（部）', y: '費用（円）', xs: [50, 100, 150, 200, 300, 400, 500], base: [2000, 6000], unit: [8, 30], noise: 'ページ数', noiseR: [4, 24] },
  ]);
  const base = Math.round(rng.int(ctx.base[0], ctx.base[1]) / 10) * 10;
  const unit = Math.round(rng.int(ctx.unit[0], ctx.unit[1]) / (ctx.unit[1] > 100 ? 10 : 1)) * (ctx.unit[1] > 100 ? 10 : 1);
  const xs = rng.sample(ctx.xs, 5).sort((a, b) => a - b);
  const ys = xs.map((x) => base + unit * x);
  const r = rng.int(1, 4);
  const names = ['ア', 'イ', 'ウ', 'エ', 'オ'];
  const table = {
    kind: 'table',
    title: ctx.title,
    head: ['', ctx.x, ctx.y, ctx.noise],
    rows: xs.map((x, i) => [names[i], comma(x), i === r ? Q : comma(ys[i]), rng.int(ctx.noiseR[0], ctx.noiseR[1])]),
  };
  const i0 = r === 1 ? 0 : 0;
  const i1 = r === 4 ? 3 : r === 1 ? 2 : 4;
  return {
    figure: table,
    question: `表の ${Q} に入る数値として最も近いものはどれか。`,
    correct: ys[r],
    extra: [(ys[i0] / xs[i0]) * xs[r]],
    explanation: `${ctx.x.replace(/（.*）/, '')}が増えると、${ctx.y.replace(/（.*）/, '')}が一定の割合で増えています。\n${names[i0]}と${names[i1]}を比べると、${comma(xs[i1] - xs[i0])} 増えると ${comma(ys[i1] - ys[i0])} 増えるので、1 あたり ${comma(unit)}。\n基本の額は ${comma(ys[i0])} − ${comma(unit)} × ${comma(xs[i0])} = ${comma(base)}\n${names[r]}: ${comma(base)} + ${comma(unit)} × ${comma(xs[r])} = ${comma(ys[r])}\n単純な比例（${ctx.y.replace(/（.*）/, '')} ÷ ${ctx.x.replace(/（.*）/, '')} が一定）ではない点に注意しましょう。`,
  };
}

/** 合格率 = 合格者 ÷ 受験者 */
function ratio(rng) {
  const names = ['第 1 会場', '第 2 会場', '第 3 会場', '第 4 会場', '第 5 会場'];
  const rows = names.map(() => {
    const n = rng.int(8, 60) * 25;
    const rate = rng.int(12, 68);
    return { n, rate, pass: (n * rate) / 100 };
  });
  for (const x of rows) if (!Number.isInteger(x.pass)) x.n = Math.round(x.n / 100) * 100 || 100;
  for (const x of rows) x.pass = (x.n * x.rate) / 100;
  const r = rng.int(0, 4);
  const askN = rng.chance(0.4);
  const table = {
    kind: 'table',
    title: '会場別の試験結果',
    head: ['会場', '受験者数（人）', '合格者数（人）', '合格率（%）'],
    rows: rows.map((x, i) => [names[i], i === r && askN ? Q : comma(x.n), i === r && !askN ? Q : comma(x.pass), x.rate]),
  };
  const x = rows[r];
  return {
    figure: table,
    question: `表の ${Q} に入る数値として最も近いものはどれか。`,
    correct: askN ? x.n : x.pass,
    extra: askN ? [x.pass * x.rate] : [x.n - x.pass],
    explanation: `「合格者数 ÷ 受験者数 × 100 = 合格率」の関係です。\n${
      askN ? `受験者数 = ${comma(x.pass)} ÷ ${x.rate}% = ${comma(x.pass)} ÷ ${x.rate / 100} = ${comma(x.n)}（人）` : `合格者数 = ${comma(x.n)} × ${x.rate}% = ${comma(x.pass)}（人）`
    }`,
  };
}

/** 今年 = 前年 × (1 + 増加率) */
function growth(rng) {
  const names = ['飲料', '菓子', '日用品', '衣料', '家電'];
  const rows = names.map(() => {
    const prev = rng.int(20, 300) * 10;
    const rate = rng.pick([-15, -10, -8, -5, -4, 2, 4, 5, 6, 8, 10, 12, 15, 20, 25]);
    return { prev, rate, now: (prev * (100 + rate)) / 100 };
  });
  for (const x of rows) {
    while (!Number.isInteger(x.now)) {
      x.prev += 10;
      x.now = (x.prev * (100 + x.rate)) / 100;
    }
  }
  const r = rng.int(0, 4);
  const askPrev = rng.chance(0.4);
  const table = {
    kind: 'table',
    title: '分野別の売上高',
    unit: '単位：百万円',
    head: ['分野', '前年', '前年比増減率（%）', '今年'],
    rows: rows.map((x, i) => [names[i], i === r && askPrev ? Q : comma(x.prev), x.rate > 0 ? `+${x.rate}` : `${x.rate}`, i === r && !askPrev ? Q : comma(x.now)]),
  };
  const x = rows[r];
  return {
    figure: table,
    question: `表の ${Q} に入る数値として最も近いものはどれか。`,
    correct: askPrev ? x.prev : x.now,
    extra: askPrev ? [x.now * (1 - x.rate / 100)] : [x.prev + x.rate],
    explanation: `「今年 = 前年 × (1 + 増減率)」の関係です。\n${
      askPrev
        ? `前年 = ${comma(x.now)} ÷ ${(100 + x.rate) / 100} = ${comma(x.prev)}\n今年 × (1 − 増減率) と計算すると、わずかにずれるので注意しましょう。`
        : `今年 = ${comma(x.prev)} × ${(100 + x.rate) / 100} = ${comma(x.now)}`
    }`,
  };
}

/** 作業量 = 人数 × 日数 × 1 人 1 日あたりの量 */
function work(rng) {
  const per = rng.pick([12, 15, 18, 20, 24, 25, 30, 40]);
  const names = ['工程 1', '工程 2', '工程 3', '工程 4', '工程 5'];
  const rows = names.map(() => {
    const p = rng.int(2, 12);
    const d = rng.int(2, 15);
    return { p, d, w: p * d * per };
  });
  const r = rng.int(0, 4);
  const ask = rng.pick(['w', 'd', 'p']);
  const x = rows[r];
  const table = {
    kind: 'table',
    title: '工程別の作業計画（どの工程も 1 人 1 日あたりの作業量は同じ）',
    head: ['工程', '作業人数（人）', '作業日数（日）', '作業量（個）'],
    rows: rows.map((y, i) => [names[i], i === r && ask === 'p' ? Q : y.p, i === r && ask === 'd' ? Q : y.d, i === r && ask === 'w' ? Q : comma(y.w)]),
  };
  const ex = rows[(r + 1) % 5];
  const correct = ask === 'w' ? x.w : ask === 'd' ? x.d : x.p;
  return {
    figure: table,
    question: `表の ${Q} に入る数値として最も近いものはどれか。`,
    correct,
    extra: ask === 'w' ? [x.w + x.p * per] : [],
    step: ask === 'w' ? 0.15 : 0.25,
    explanation: `「作業人数 × 作業日数 × 1 人 1 日あたりの作業量 = 作業量」です。\n${names[(r + 1) % 5]}から 1 人 1 日あたりを求めると ${comma(ex.w)} ÷ (${ex.p} × ${ex.d}) = ${per}（個）\n${
      ask === 'w'
        ? `${names[r]}: ${x.p} × ${x.d} × ${per} = ${comma(x.w)}`
        : ask === 'd'
          ? `${names[r]}の日数 = ${comma(x.w)} ÷ (${x.p} × ${per}) = ${x.d}`
          : `${names[r]}の人数 = ${comma(x.w)} ÷ (${x.d} × ${per}) = ${x.p}`
    }`,
  };
}

/** 人数に比例する材料 */
function scale(rng) {
  const perA = rng.pick([30, 45, 60, 75, 80, 120]);
  const perB = rng.pick([15, 20, 25, 35, 40, 50]);
  const ns = rng.sample([4, 6, 8, 10, 12, 15, 20, 24, 30, 40], 5).sort((a, b) => a - b);
  const r = rng.int(0, 4);
  const askB = rng.chance(0.5);
  const table = {
    kind: 'table',
    title: '人数ごとの材料の分量',
    head: ['人数（人）', '小麦粉（g）', '砂糖（g）', '調理時間（分）'],
    rows: ns.map((n, i) => [n, i === r && !askB ? Q : comma(n * perA), i === r && askB ? Q : comma(n * perB), rng.int(30, 90)]),
  };
  const correct = ns[r] * (askB ? perB : perA);
  return {
    figure: table,
    question: `表の ${Q} に入る数値として最も近いものはどれか。`,
    correct,
    extra: [ns[r] * (askB ? perA : perB)],
    explanation: `材料の分量は人数に比例しています（調理時間は関係しません）。\n1 人あたり ${askB ? `砂糖 ${perB} g` : `小麦粉 ${perA} g`} なので、${ns[r]} 人では ${ns[r]} × ${askB ? perB : perA} = ${comma(correct)}（g）`,
  };
}

const RULES = { product, linear, ratio, growth, work, scale };

export function genKuuran(rng, { count, id, domain, weights }) {
  const bag = Object.entries(weights).flatMap(([k, w]) => Array(w).fill(k));
  const out = [];
  while (out.length < count) {
    const t = RULES[rng.pick(bag)](rng);
    if (!(t.correct > 0)) continue;
    let choices;
    let answer;
    if (t.correct < 20) {
      // 小さい整数は、となりの整数を選択肢にする
      const near = rng.sample([-3, -2, -1, 1, 2, 3, 4].map((d) => t.correct + d).filter((v) => v > 0), 4);
      const all = [...near, t.correct].sort((a, b) => a - b);
      choices = all.map((v) => comma(v));
      answer = all.indexOf(t.correct);
    } else ({ choices, answer } = spreadChoices(rng, t.correct, { step: t.step ?? 0.12, extra: t.extra ?? [] }));
    out.push({ id: id(), domain, type: 'single', question: t.question, figure: t.figure, choices, answer: [answer], explanation: t.explanation });
  }
  return out;
}
