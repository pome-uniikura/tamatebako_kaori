// 図表の読み取り（表・グラフを共通の本文にして、1 つの図表に複数の問題）
import { comma, roundTo, spreadChoices, textChoices } from './lib.mjs';

const YEARS = [2021, 2022, 2023, 2024, 2025];
const TOPICS = [
  { title: '主要 5 社の売上高の推移', unit: '単位：億円', items: ['A 社', 'B 社', 'C 社', 'D 社', 'E 社'], what: '売上高', base: [120, 900], amountUnit: '億円' },
  { title: '地域別の観光客数の推移', unit: '単位：千人', items: ['北部', '東部', '中部', '西部', '南部'], what: '観光客数', base: [300, 2500], amountUnit: '千人' },
  { title: '品目別の輸出額の推移', unit: '単位：十億円', items: ['機械', '電子部品', '自動車', '化学製品', '食料品'], what: '輸出額', base: [80, 950], amountUnit: '十億円' },
  { title: '店舗別の来店客数の推移', unit: '単位：百人', items: ['駅前店', '本町店', '港店', '中央店', '新町店'], what: '来店客数', base: [150, 800], amountUnit: '百人' },
  { title: '国別の留学生数の推移', unit: '単位：人', items: ['P 国', 'Q 国', 'R 国', 'S 国', 'T 国'], what: '留学生数', base: [800, 9000], amountUnit: '人' },
  { title: '部門別の研究開発費の推移', unit: '単位：百万円', items: ['素材', '医薬', '情報', '環境', '機器'], what: '研究開発費', base: [200, 1800], amountUnit: '百万円' },
  { title: '作物別の生産量の推移', unit: '単位：千 t', items: ['米', '小麦', '大豆', 'じゃがいも', 'たまねぎ'], what: '生産量', base: [60, 700], amountUnit: '千 t' },
  { title: '路線別の利用者数の推移', unit: '単位：万人', items: ['1 号線', '2 号線', '3 号線', '4 号線', '5 号線'], what: '利用者数', base: [100, 1200], amountUnit: '万人' },
];

const pct = (v) => `${Number(v).toFixed(1)}%`;

/** 推移の表（5 項目 × 4〜5 年） */
function trendTable(rng, topic, years) {
  const rows = topic.items.map(() => {
    let v = rng.int(topic.base[0], topic.base[1]);
    return years.map((_, i) => {
      if (i > 0) v = Math.max(10, Math.round(v * (1 + (rng.next() * 0.3 - 0.08))));
      return v;
    });
  });
  return rows;
}

function sceneTrend(rng, P) {
  const topic = rng.pick(TOPICS);
  const years = rng.chance(0.5) ? YEARS : YEARS.slice(1);
  const data = trendTable(rng, topic, years);
  const pid = P.passageId();
  const passage = {
    id: pid,
    figure: { kind: 'table', title: topic.title, unit: topic.unit, head: ['', ...years.map((y) => `${y} 年`)], rows: topic.items.map((it, i) => [it, ...data[i]]) },
  };
  const qs = [];
  const kinds = rng.shuffle(['growth', 'share', 'maxIncrease', 'ratio', 'totalDiff', 'average']).slice(0, rng.int(2, 3));
  const last = years.length - 1;
  for (const k of kinds) {
    const i = rng.int(0, topic.items.length - 1);
    const name = topic.items[i];
    if (k === 'growth') {
      const y = rng.int(1, last);
      const a = data[i][y - 1];
      const b = data[i][y];
      const rate = (b / a - 1) * 100;
      if (Math.abs(rate) < 1.5) continue;
      const up = rate > 0;
      const r = Math.abs(rate);
      const c = spreadChoices(rng, roundTo(r, 1), { digits: 1, step: 0.18, format: pct, extra: [Math.abs((a / b - 1) * 100)] });
      qs.push({
        question: `${years[y]} 年の${name}の${topic.what}は、前年に比べて約何 % ${up ? '増加' : '減少'}したか。`,
        ...c,
        explanation: `${years[y]} 年は ${comma(b)}、${years[y - 1]} 年は ${comma(a)}。\n${comma(b)} ÷ ${comma(a)} ≒ ${roundTo(b / a, 4)} なので、約 ${comma(roundTo(r, 1), 1)}% の${up ? '増加' : '減少'}です。\n増加率は「(今年 ÷ 前年) − 1」で求めます。前年を基準にすることに注意しましょう。`,
      });
    } else if (k === 'share') {
      const y = rng.int(0, last);
      const total = data.reduce((s, r) => s + r[y], 0);
      const share = (data[i][y] / total) * 100;
      const c = spreadChoices(rng, roundTo(share, 1), { digits: 1, step: 0.2, format: pct });
      qs.push({
        question: `${years[y]} 年の 5 つの合計に占める${name}の${topic.what}の割合は約何 % か。`,
        ...c,
        explanation: `${years[y]} 年の合計は ${data.map((r) => comma(r[y])).join(' + ')} = ${comma(total)}。\n${comma(data[i][y])} ÷ ${comma(total)} ≒ ${roundTo(data[i][y] / total, 4)} → 約 ${comma(roundTo(share, 1), 1)}%`,
      });
    } else if (k === 'maxIncrease') {
      const inc = data.map((r) => r[last] - r[0]);
      const max = Math.max(...inc);
      if (inc.filter((v) => v === max).length > 1) continue;
      const best = topic.items[inc.indexOf(max)];
      const list = topic.items.slice();
      qs.push({
        question: `${years[0]} 年から ${years[last]} 年にかけて、${topic.what}の増加数が最も大きいのはどれか。`,
        choices: list,
        answer: list.indexOf(best),
        explanation: `${years[last]} 年 − ${years[0]} 年 を計算します。\n${topic.items.map((it, j) => `${it}: ${comma(data[j][last])} − ${comma(data[j][0])} = ${comma(inc[j])}`).join('\n')}\n最も大きいのは${best}です。「増加率」ではなく「増加数（差）」を聞かれている点に注意しましょう。`,
        fixedTextChoices: true,
      });
    } else if (k === 'ratio') {
      const ratio = data[i][last] / data[i][0];
      if (ratio < 1.05) continue;
      const c = spreadChoices(rng, roundTo(ratio, 2), { digits: 2, step: 0.08, format: (v) => `${comma(v, 2)} 倍` });
      qs.push({
        question: `${years[last]} 年の${name}の${topic.what}は、${years[0]} 年の約何倍か。`,
        ...c,
        explanation: `${comma(data[i][last])} ÷ ${comma(data[i][0])} ≒ ${roundTo(ratio, 3)} → 約 ${comma(roundTo(ratio, 2), 2)} 倍`,
      });
    } else if (k === 'totalDiff') {
      const y = rng.int(1, last);
      const t1 = data.reduce((s, r) => s + r[y], 0);
      const t0 = data.reduce((s, r) => s + r[y - 1], 0);
      const diff = t1 - t0;
      if (diff <= 0) continue;
      const c = spreadChoices(rng, diff, { step: 0.15, format: (v) => `${comma(v)} ${topic.amountUnit}` });
      qs.push({
        question: `${years[y]} 年の 5 つの${topic.what}の合計は、前年に比べて約いくら増えたか。`,
        ...c,
        explanation: `${years[y]} 年の合計 ${comma(t1)}、${years[y - 1]} 年の合計 ${comma(t0)}。\n${comma(t1)} − ${comma(t0)} = ${comma(diff)}（${topic.amountUnit}）\n項目ごとの差を足しても同じ結果になります。`,
      });
    } else if (k === 'average') {
      const avg = data[i].reduce((a, b) => a + b, 0) / years.length;
      const c = spreadChoices(rng, Math.round(avg), { step: 0.08, format: (v) => `${comma(v)} ${topic.amountUnit}` });
      qs.push({
        question: `${years[0]} 年から ${years[last]} 年までの${name}の${topic.what}の 1 年あたりの平均は約いくらか。`,
        ...c,
        explanation: `${data[i].map((v) => comma(v)).join(' + ')} = ${comma(data[i].reduce((a, b) => a + b, 0))}\nこれを ${years.length} 年で割ると約 ${comma(Math.round(avg))}（${topic.amountUnit}）`,
      });
    }
  }
  return { passage, qs };
}

const SHARE_TOPICS = [
  { title: '業種別の就業者数の構成比', items: ['製造業', '卸売・小売業', '医療・福祉', '建設業', 'その他'], totalLabel: '就業者数の合計（千人）', unit: '千人', what: '就業者数' },
  { title: '年代別の利用者の構成比', items: ['10 代', '20 代', '30 代', '40 代', '50 代以上'], totalLabel: '利用者数の合計（人）', unit: '人', what: '利用者数' },
  { title: '用途別の電力消費量の構成比', items: ['産業用', '業務用', '家庭用', '運輸用', 'その他'], totalLabel: '消費量の合計（億 kWh）', unit: '億 kWh', what: '消費量' },
  { title: '品目別の支出の構成比', items: ['食費', '住居費', '交通・通信費', '教養娯楽費', 'その他'], totalLabel: '支出の合計（円）', unit: '円', what: '支出' },
];

/** 合計を 100 にする構成比（小数 1 桁） */
function shares(rng, n) {
  const raw = Array.from({ length: n }, () => 5 + rng.next() * 30);
  const sum = raw.reduce((a, b) => a + b, 0);
  const vals = raw.map((v) => roundTo((v / sum) * 100, 1));
  const diff = roundTo(100 - vals.reduce((a, b) => a + b, 0), 1);
  vals[n - 1] = roundTo(vals[n - 1] + diff, 1);
  return vals;
}

function sceneShare(rng, P) {
  const t = rng.pick(SHARE_TOPICS);
  const y0 = rng.pick([2015, 2016, 2018]);
  const y1 = 2025;
  const s0 = shares(rng, t.items.length);
  const s1 = shares(rng, t.items.length);
  const scale = t.unit === '円' ? 1000 : t.unit === '人' ? 100 : 10;
  const T0 = rng.int(200, 900) * scale;
  const T1 = Math.round(T0 * (1 + rng.next() * 0.3 - 0.05) / scale) * scale;
  const pid = P.passageId();
  const passage = {
    id: pid,
    figure: {
      kind: 'table',
      title: t.title,
      unit: '単位：%',
      head: ['', `${y0} 年`, `${y1} 年`],
      rows: [...t.items.map((it, i) => [it, s0[i].toFixed(1), s1[i].toFixed(1)]), [t.totalLabel, comma(T0), comma(T1)]],
      note: `最下段は${t.what}の合計（実数）です。`,
    },
  };
  const qs = [];
  const kinds = rng.shuffle(['amount', 'change', 'ratio2']).slice(0, rng.int(2, 3));
  for (const k of kinds) {
    const i = rng.int(0, t.items.length - 2);
    const name = t.items[i];
    const a0 = (T0 * s0[i]) / 100;
    const a1 = (T1 * s1[i]) / 100;
    if (k === 'amount') {
      const c = spreadChoices(rng, Math.round(a1), { step: 0.12, format: (v) => `${comma(v)} ${t.unit}`, extra: [(T0 * s1[i]) / 100] });
      qs.push({
        question: `${y1} 年の${name}の${t.what}は約いくらか。`,
        ...c,
        explanation: `合計 × 構成比 で求めます。\n${comma(T1)} × ${s1[i].toFixed(1)}% = ${comma(T1)} × ${roundTo(s1[i] / 100, 3)} ≒ ${comma(Math.round(a1))}（${t.unit}）`,
      });
    } else if (k === 'change') {
      const diff = a1 - a0;
      if (Math.abs(diff) < T0 * 0.003) continue;
      const up = diff > 0;
      const c = spreadChoices(rng, Math.round(Math.abs(diff)), {
        step: 0.2,
        format: (v) => `${comma(v)} ${t.unit}`,
        extra: [Math.abs(((s1[i] - s0[i]) * T1) / 100)],
      });
      qs.push({
        question: `${y0} 年から ${y1} 年にかけて、${name}の${t.what}は約いくら${up ? '増えた' : '減った'}か。`,
        ...c,
        explanation: `構成比の差ではなく、実数の差を求めます。\n${y0} 年: ${comma(T0)} × ${s0[i].toFixed(1)}% ≒ ${comma(Math.round(a0))}\n${y1} 年: ${comma(T1)} × ${s1[i].toFixed(1)}% ≒ ${comma(Math.round(a1))}\n差は約 ${comma(Math.round(Math.abs(diff)))}（${t.unit}）`,
      });
    } else {
      const ratio = a1 / a0;
      const c = spreadChoices(rng, roundTo(ratio, 2), { digits: 2, step: 0.1, format: (v) => `${comma(v, 2)} 倍`, extra: [s1[i] / s0[i]] });
      qs.push({
        question: `${y1} 年の${name}の${t.what}は、${y0} 年の約何倍か。`,
        ...c,
        explanation: `実数どうしで比べます。\n${y1} 年: ${comma(T1)} × ${s1[i].toFixed(1)}% ≒ ${comma(roundTo(a1, 1), 1)}\n${y0} 年: ${comma(T0)} × ${s0[i].toFixed(1)}% ≒ ${comma(roundTo(a0, 1), 1)}\n${comma(roundTo(a1, 1), 1)} ÷ ${comma(roundTo(a0, 1), 1)} ≒ ${roundTo(ratio, 2)} 倍\n構成比どうし（${s1[i].toFixed(1)} ÷ ${s0[i].toFixed(1)}）で割ると、合計の変化が抜けてしまうので注意しましょう。`,
      });
    }
  }
  return { passage, qs };
}

const BAR_TOPICS = [
  { title: 'テーマパークの年間入場者数', unit: '単位：万人', what: '入場者数', base: [150, 600], u: '万人' },
  { title: 'ある市の新築住宅の着工戸数', unit: '単位：戸', what: '着工戸数', base: [800, 3000], u: '戸' },
  { title: 'オンライン講座の受講者数', unit: '単位：千人', what: '受講者数', base: [40, 300], u: '千人' },
  { title: 'ある工場の年間生産台数', unit: '単位：千台', what: '生産台数', base: [100, 900], u: '千台' },
];

function sceneBar(rng, P) {
  const t = rng.pick(BAR_TOPICS);
  const years = [2020, 2021, 2022, 2023, 2024, 2025];
  let v = rng.int(t.base[0], t.base[1]);
  const vals = years.map((_, i) => {
    if (i > 0) v = Math.max(10, Math.round(v * (1 + (rng.next() * 0.36 - 0.1))));
    return v;
  });
  const pid = P.passageId();
  const passage = { id: pid, figure: { kind: 'bar', title: t.title, unit: t.unit, labels: years.map((y) => `${y}`), series: [{ name: t.what, values: vals }] } };
  const qs = [];
  // 前年比
  const y = rng.int(1, years.length - 1);
  const rate = (vals[y] / vals[y - 1] - 1) * 100;
  if (Math.abs(rate) >= 1.5) {
    const up = rate > 0;
    const c = spreadChoices(rng, roundTo(Math.abs(rate), 1), { digits: 1, step: 0.18, format: pct });
    qs.push({
      question: `${years[y]} 年の${t.what}は、前年に比べて約何 % ${up ? '増加' : '減少'}したか。`,
      ...c,
      explanation: `${comma(vals[y])} ÷ ${comma(vals[y - 1])} ≒ ${roundTo(vals[y] / vals[y - 1], 4)} → 約 ${comma(roundTo(Math.abs(rate), 1), 1)}% の${up ? '増加' : '減少'}`,
    });
  }
  // 増加数が最大の年
  const inc = vals.slice(1).map((x, i) => x - vals[i]);
  const max = Math.max(...inc);
  if (inc.filter((d) => d === max).length === 1 && max > 0) {
    const labels = years.slice(1).map((yy) => `${yy} 年`);
    const best = labels[inc.indexOf(max)];
    qs.push({
      question: `前年からの${t.what}の増加数が最も大きいのは何年か。`,
      choices: labels,
      answer: labels.indexOf(best),
      explanation: `前年との差を順に計算します。\n${labels.map((l, i) => `${l}: ${comma(vals[i + 1])} − ${comma(vals[i])} = ${comma(inc[i])}`).join('\n')}\n最も大きいのは${best}です。`,
      fixedTextChoices: true,
    });
  }
  // 平均
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const c = spreadChoices(rng, Math.round(avg), { step: 0.08, format: (x) => `${comma(x)} ${t.u}` });
  qs.push({
    question: `${years[0]} 年から ${years[years.length - 1]} 年までの${t.what}の平均は約いくらか。`,
    ...c,
    explanation: `6 年分の合計 ${comma(vals.reduce((a, b) => a + b, 0))} ÷ 6 ≒ ${comma(Math.round(avg))}（${t.u}）`,
  });
  return { passage, qs };
}

const PIE_TOPICS = [
  { title: 'ある会社の費用の内訳', items: ['人件費', '材料費', '広告費', '物流費', 'その他'], totalWord: '費用の総額', unit: '万円', totals: [2400, 9600], ask: (it) => `${it}は約何万円か。`, diff: (a, b) => `${a}と${b}の差は約何万円か。` },
  { title: 'ある市のごみの種類別の排出量', items: ['可燃ごみ', '資源ごみ', '不燃ごみ', '粗大ごみ', 'その他'], totalWord: '排出量の合計', unit: 't', totals: [12000, 48000], ask: (it) => `${it}の排出量は約何 t か。`, diff: (a, b) => `${a}と${b}の排出量の差は約何 t か。` },
  { title: '社員の通勤手段の内訳', items: ['電車', 'バス', '自動車', '自転車', '徒歩'], totalWord: '社員数', unit: '人', totals: [800, 4000], ask: (it) => `通勤手段が${it}の社員は約何人か。`, diff: (a, b) => `通勤手段が${a}の社員と${b}の社員の人数の差は約何人か。` },
];

function scenePie(rng, P) {
  const t = rng.pick(PIE_TOPICS);
  const sh = shares(rng, t.items.length).map((v) => Math.round(v));
  sh[sh.length - 1] += 100 - sh.reduce((a, b) => a + b, 0);
  if (sh.some((v) => v <= 0)) return { passage: null, qs: [] };
  const total = Math.round(rng.int(t.totals[0], t.totals[1]) / 100) * 100;
  const pid = P.passageId();
  const passage = {
    id: pid,
    figure: { kind: 'pie', title: `${t.title}（${t.totalWord} ${comma(total)} ${t.unit}）`, unit: '単位：%', labels: t.items, values: sh },
  };
  const qs = [];
  const i = rng.int(0, t.items.length - 1);
  let j = rng.int(0, t.items.length - 1);
  if (j === i) j = (i + 1) % t.items.length;
  const amount = (total * sh[i]) / 100;
  qs.push({
    question: t.ask(t.items[i]),
    ...spreadChoices(rng, Math.round(amount), { step: 0.15, format: (v) => `${comma(v)} ${t.unit}` }),
    explanation: `${comma(total)} × ${sh[i]}% = ${comma(roundTo(amount, 1), 1)}（${t.unit}）`,
  });
  const diff = Math.abs(total * (sh[i] - sh[j])) / 100;
  if (diff > 0) {
    qs.push({
      question: t.diff(t.items[i], t.items[j]),
      ...spreadChoices(rng, Math.round(diff), { step: 0.2, format: (v) => `${comma(v)} ${t.unit}` }),
      explanation: `割合の差を先に出すと速く計算できます。\n${Math.max(sh[i], sh[j])}% − ${Math.min(sh[i], sh[j])}% = ${Math.abs(sh[i] - sh[j])}%\n${comma(total)} × ${Math.abs(sh[i] - sh[j])}% = ${comma(roundTo(diff, 1), 1)}（${t.unit}）`,
    });
  }
  return { passage, qs };
}

const PRODUCTS = [
  { title: '商品別の単価と販売数', items: ['商品 P', '商品 Q', '商品 R', '商品 S', '商品 T'], a: '単価（円）', b: '販売数（個）', aR: [80, 2400], bR: [120, 3000], what: '売上高' },
  { title: '路線別の運賃と乗客数（1 日）', items: ['A 線', 'B 線', 'C 線', 'D 線', 'E 線'], a: '運賃（円）', b: '乗客数（人）', aR: [150, 900], bR: [800, 9000], what: '運賃収入' },
];

function sceneProduct(rng, P) {
  const t = rng.pick(PRODUCTS);
  const rows = t.items.map(() => [Math.round(rng.int(t.aR[0], t.aR[1]) / 10) * 10, Math.round(rng.int(t.bR[0], t.bR[1]) / 10) * 10]);
  const sales = rows.map(([a, b]) => a * b);
  const pid = P.passageId();
  const passage = { id: pid, figure: { kind: 'table', title: t.title, head: ['', t.a, t.b], rows: t.items.map((it, i) => [it, ...rows[i]]) } };
  const qs = [];
  const max = Math.max(...sales);
  if (sales.filter((s) => s === max).length === 1) {
    const best = t.items[sales.indexOf(max)];
    qs.push({
      question: `${t.what}（${t.a.replace(/（.*）/, '')} × ${t.b.replace(/（.*）/, '')}）が最も大きいのはどれか。`,
      choices: t.items.slice(),
      answer: t.items.indexOf(best),
      explanation: `${t.items.map((it, i) => `${it}: ${comma(rows[i][0])} × ${comma(rows[i][1])} = ${comma(sales[i])}`).join('\n')}\n最も大きいのは${best}です。概算（上 2 桁ずつで掛ける）でも十分に比べられます。`,
      fixedTextChoices: true,
    });
  }
  const i = rng.int(0, 4);
  const total = sales.reduce((a, b) => a + b, 0);
  const share = (sales[i] / total) * 100;
  qs.push({
    question: `5 つの${t.what}の合計に占める${t.items[i]}の割合は約何 % か。`,
    ...spreadChoices(rng, roundTo(share, 1), { digits: 1, step: 0.2, format: pct }),
    explanation: `${t.items[i]}の${t.what}: ${comma(rows[i][0])} × ${comma(rows[i][1])} = ${comma(sales[i])}\n合計: ${comma(total)}\n${comma(sales[i])} ÷ ${comma(total)} ≒ ${roundTo(sales[i] / total, 4)} → 約 ${comma(roundTo(share, 1), 1)}%`,
  });
  return { passage, qs };
}

const DENSITY = { title: '市町村別の人口と面積', items: ['A 市', 'B 市', 'C 町', 'D 町', 'E 村'] };

function sceneDensity(rng, P) {
  const rows = DENSITY.items.map((_, i) => {
    const area = rng.int(i < 2 ? 40 : 60, i < 2 ? 300 : 600);
    const pop = Math.round((rng.int(i < 2 ? 800 : 50, i < 2 ? 4000 : 900) * area) / 10) * 10;
    return [pop, area];
  });
  const dens = rows.map(([p, a]) => p / a);
  const pid = P.passageId();
  const passage = { id: pid, figure: { kind: 'table', title: DENSITY.title, head: ['', '人口（人）', '面積（km²）'], rows: DENSITY.items.map((it, i) => [it, ...rows[i]]) } };
  const qs = [];
  const max = Math.max(...dens);
  if (dens.filter((d) => Math.abs(d - max) < 1e-9).length === 1) {
    const best = DENSITY.items[dens.indexOf(max)];
    qs.push({
      question: '人口密度（1 km² あたりの人口）が最も高いのはどれか。',
      choices: DENSITY.items.slice(),
      answer: DENSITY.items.indexOf(best),
      explanation: `人口 ÷ 面積 を比べます。\n${DENSITY.items.map((it, i) => `${it}: ${comma(rows[i][0])} ÷ ${rows[i][1]} ≒ ${comma(Math.round(dens[i]))}`).join('\n')}\n最も高いのは${best}です。`,
      fixedTextChoices: true,
    });
  }
  const i = rng.int(0, 4);
  qs.push({
    question: `${DENSITY.items[i]}の人口密度は約何人/km² か。`,
    ...spreadChoices(rng, Math.round(dens[i]), { step: 0.15, format: (v) => `${comma(v)} 人/km²`, extra: [rows[i][1] / rows[i][0] * 1000] }),
    explanation: `${comma(rows[i][0])} ÷ ${rows[i][1]} ≒ ${comma(roundTo(dens[i], 1), 1)} → 約 ${comma(Math.round(dens[i]))} 人/km²`,
  });
  return { passage, qs };
}

const SCENES = { trend: sceneTrend, share: sceneShare, bar: sceneBar, pie: scenePie, product: sceneProduct, density: sceneDensity };

/**
 * 図表の問題を作る。
 * weights: 場面ごとの出やすさ。count: おおよその問題数。
 */
export function genZuhyo(rng, { count, id, passageId, domain, weights, nChoices = 5 }) {
  const passages = [];
  const questions = [];
  const bag = Object.entries(weights).flatMap(([k, w]) => Array(w).fill(k));
  while (questions.length < count) {
    const scene = SCENES[rng.pick(bag)];
    const { passage, qs } = scene(rng, { passageId });
    if (!passage || qs.length === 0) continue;
    passages.push(passage);
    for (const q of qs) {
      let { choices, answer } = q;
      if (choices.length > nChoices) {
        // 選択肢を減らす（正解は残す）
        const correct = choices[answer];
        const others = rng.sample(choices.filter((_, i) => i !== answer), nChoices - 1);
        const keep = q.fixedTextChoices ? choices.filter((c) => c === correct || others.includes(c)) : [...others, correct];
        choices = keep;
        answer = keep.indexOf(correct);
        if (!q.fixedTextChoices) {
          // 数値は小さい順に並べ直す
          const num = (s) => Number(String(s).replace(/[^\d.]/g, ''));
          const sorted = choices.slice().sort((a, b) => num(a) - num(b));
          answer = sorted.indexOf(correct);
          choices = sorted;
        }
      }
      questions.push({ id: id(), domain, type: 'single', question: q.question, choices, answer: [answer], explanation: q.explanation, passage: passage.id });
    }
  }
  return { passages, questions };
}

export { textChoices };
