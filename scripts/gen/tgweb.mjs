// TG-WEB 従来型 計数（暗号・集合・場合の数・数列・推論・図形）
import { comma } from './lib.mjs';

const sortNum = (arr) => arr.slice().sort((a, b) => a - b);

/** 数値の選択肢（正解のまわりの整数） */
function numChoices(rng, correct, spread = [1, 2, 3, 4, 5, 6], n = 5, extra = []) {
  const set = new Set([correct]);
  for (const e of rng.shuffle(extra)) if (e > 0 && Number.isInteger(e) && set.size < 3) set.add(e);
  // 正解の位置がかたよらないよう、正解より小さい数の個数をランダムに決める
  const below = rng.int(0, n - 1);
  const downs = rng.shuffle(spread).map((d) => correct - d).filter((v) => v > 0);
  const ups = rng.shuffle(spread).map((d) => correct + d);
  let nBelow = [...set].filter((v) => v < correct).length;
  for (const v of downs) {
    if (set.size >= n || nBelow >= below) break;
    if (!set.has(v)) {
      set.add(v);
      nBelow++;
    }
  }
  for (const v of [...ups, ...downs]) {
    if (set.size >= n) break;
    set.add(v);
  }
  const list = sortNum([...set]);
  return { choices: list.map((v) => comma(v)), answer: list.indexOf(correct) };
}

/* ---------- 暗号 ---------- */

const EN_WORDS = ['DOG', 'CAT', 'SUN', 'BOX', 'PEN', 'MAP', 'BIRD', 'FISH', 'TREE', 'BOOK', 'DESK', 'LAMP', 'STAR', 'MOON', 'RAIN', 'SNOW', 'WIND', 'ROSE', 'MILK', 'CAKE', 'SHIP', 'KING', 'GOLD', 'TOWN', 'LAKE', 'HAND', 'BELL', 'CLOCK', 'TRAIN', 'MUSIC', 'PLANT', 'LIGHT', 'WATER'];
const shiftChar = (c, k) => String.fromCharCode(((c.charCodeAt(0) - 65 + k + 26 * 10) % 26) + 65);
const shiftWord = (w, k) => [...w].map((c) => shiftChar(c, k)).join('');
const posShift = (w, sign = 1) => [...w].map((c, i) => shiftChar(c, sign * (i + 1))).join('');

function angouShift(rng) {
  const [w1, w2] = rng.sample(EN_WORDS, 2);
  const kind = rng.pick(['fixed', 'fixed', 'pos', 'reverse']);
  if (kind === 'fixed') {
    const k = rng.pick([1, 2, 3, 4, -1, -2, -3]);
    const ans = shiftWord(w2, k);
    const wrongs = [shiftWord(w2, k + 1), shiftWord(w2, k - 1), shiftWord(w2, -k), posShift(w2, Math.sign(k))].filter((x) => x !== ans);
    return {
      q: `ある暗号では「${w1}」を「${shiftWord(w1, k)}」と表す。この暗号で「${w2}」を表したものはどれか。`,
      ans,
      wrongs,
      exp: `「${w1[0]}」→「${shiftWord(w1, k)[0]}」のように、どの文字もアルファベット順で ${Math.abs(k)} つ${k > 0 ? '後ろ' : '前'}にずれています（Z の次は A に戻る）。\n「${w2}」の各文字を ${Math.abs(k)} つ${k > 0 ? '後ろ' : '前'}にずらすと「${ans}」。`,
    };
  }
  if (kind === 'pos') {
    const ans = posShift(w2);
    const wrongs = [shiftWord(w2, 1), shiftWord(w2, 2), posShift(w2, -1), [...w2].map((c, i) => shiftChar(c, i)).join('')].filter((x) => x !== ans);
    return {
      q: `ある暗号では「${w1}」を「${posShift(w1)}」と表す。この暗号で「${w2}」を表したものはどれか。`,
      ans,
      wrongs,
      exp: `1 文字目は 1 つ後ろ、2 文字目は 2 つ後ろ……と、n 文字目をアルファベット順で n 個後ろにずらしています。\n「${w2}」に当てはめると「${ans}」。\n最初の 1 文字だけで規則を決めず、2 文字目以降も確かめることが大切です。`,
    };
  }
  const k = rng.pick([1, 2]);
  const enc = (w) => shiftWord([...w].reverse().join(''), k);
  const ans = enc(w2);
  const wrongs = [shiftWord(w2, k), [...w2].reverse().join(''), shiftWord([...w2].reverse().join(''), k + 1), shiftWord([...w2].reverse().join(''), -k)].filter((x) => x !== ans);
  return {
    q: `ある暗号では「${w1}」を「${enc(w1)}」と表す。この暗号で「${w2}」を表したものはどれか。`,
    ans,
    wrongs,
    exp: `文字の順番を逆にしてから、各文字をアルファベット順で ${k} つ後ろにずらしています。\n「${w1}」→ 逆順「${[...w1].reverse().join('')}」→ ${k} つずらす「${enc(w1)}」\n「${w2}」→ 逆順「${[...w2].reverse().join('')}」→「${ans}」`,
  };
}

const GOJUON = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', null, 'ゆ', null, 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', null, null, null, null],
];
const KANA_POS = new Map();
GOJUON.forEach((row, r) => row.forEach((k, c) => k && KANA_POS.set(k, [r + 1, c + 1])));
const JA_WORDS_ALL = ['さくら', 'ねこ', 'いぬ', 'はな', 'そら', 'うみ', 'やま', 'かわ', 'もり', 'ほし', 'つき', 'ゆき', 'あめ', 'かぜ', 'くも', 'とり', 'さかな', 'たまご', 'からす', 'すいか', 'みかん', 'きつね', 'たぬき', 'ひかり', 'こころ', 'つくえ', 'いちご', 'めがね', 'ふね', 'なつ', 'あき', 'ふゆ', 'はる', 'まくら', 'ほたる', 'ひまわり', 'あさひ', 'ゆうひ', 'こけし', 'おかし', 'ほたて', 'うさぎ', 'すすき', 'ひよこ', 'にわとり', 'かもめ', 'くじら', 'あひる', 'さくらもち', 'ふくろう', 'もみじ', 'こよみ', 'やまびこ', 'たけのこ', 'ゆりかご'];
// 濁音・「ん」などは五十音表の位置で表せないので除く
const JA_WORDS = JA_WORDS_ALL.filter((w) => [...w].every((k) => KANA_POS.has(k)));

function angouGojuon(rng) {
  const [w1, w2] = rng.sample(JA_WORDS, 2);
  const swap = rng.chance(0.4);
  const enc = (w) => [...w].map((k) => (swap ? [...KANA_POS.get(k)].reverse() : KANA_POS.get(k)).join('')).join('・');
  const decode = rng.chance(0.5);
  if (decode) {
    const sameLen = JA_WORDS.filter((w) => w.length === w2.length && w !== w2 && w !== w1);
    return {
      q: `ある暗号では「${w1}」を「${enc(w1)}」と表す。この暗号で「${enc(w2)}」が表すものはどれか。`,
      ans: w2,
      wrongs: sameLen.length >= 4 ? sameLen : JA_WORDS.filter((w) => w !== w2 && w !== w1),
      exp: `五十音表で、${swap ? '1 けた目が段（あ段 = 1、い段 = 2 …）、2 けた目が行（あ行 = 1、か行 = 2 …）' : '1 けた目が行（あ行 = 1、か行 = 2 …）、2 けた目が段（あ段 = 1、い段 = 2 …）'}を表しています。\n例:「${w1[0]}」→「${enc(w1[0])}」\n「${enc(w2)}」を戻すと「${w2}」。`,
    };
  }
  const ans = enc(w2);
  const alt = (w) => [...w].map((k) => (swap ? KANA_POS.get(k) : [...KANA_POS.get(k)].reverse()).join('')).join('・');
  const plus = (w) => [...w].map((k) => { const p = KANA_POS.get(k); return (swap ? [p[1], p[0] + 1] : [p[0] + 1, p[1]]).join(''); }).join('・');
  const minus = (w) => [...w].map((k) => { const p = KANA_POS.get(k); return (swap ? [p[1] + 1, p[0]] : [p[0], p[1] + 1]).join(''); }).join('・');
  return {
    q: `ある暗号では「${w1}」を「${enc(w1)}」と表す。この暗号で「${w2}」を表したものはどれか。`,
    ans,
    wrongs: [alt(w2), plus(w2), minus(w2), enc(w1)].filter((x) => x !== ans),
    exp: `五十音表の${swap ? '段（あ段 = 1 …）と行（あ行 = 1 …）の順' : '行（あ行 = 1、か行 = 2 …）と段（あ段 = 1、い段 = 2 …）の順'}に数字を並べています。\n「${w2}」は「${ans}」。`,
  };
}

function angouNumber(rng) {
  const [w1, w2] = rng.sample(EN_WORDS.filter((w) => w.length <= 5), 2);
  const kind = rng.pick(['fwd', 'rev', 'double']);
  const f = { fwd: (c) => c.charCodeAt(0) - 64, rev: (c) => 27 - (c.charCodeAt(0) - 64), double: (c) => (c.charCodeAt(0) - 64) * 2 }[kind];
  const enc = (w) => [...w].map(f).join('・');
  const others = ['fwd', 'rev', 'double'].filter((k) => k !== kind).map((k) => ({ fwd: (c) => c.charCodeAt(0) - 64, rev: (c) => 27 - (c.charCodeAt(0) - 64), double: (c) => (c.charCodeAt(0) - 64) * 2 })[k]);
  const ans = enc(w2);
  const wrongs = [...others.map((g) => [...w2].map(g).join('・')), [...w2].map((c) => f(c) + 1).join('・'), [...w2].map((c) => Math.max(1, f(c) - 1)).join('・')].filter((x) => x !== ans);
  const rule = { fwd: 'A = 1、B = 2 …… Z = 26 とアルファベットの順番', rev: 'A = 26、B = 25 …… Z = 1 と、後ろから数えた順番', double: 'アルファベットの順番（A = 1 …… Z = 26）を 2 倍した数' }[kind];
  return {
    q: `ある暗号では「${w1}」を「${enc(w1)}」と表す。この暗号で「${w2}」を表したものはどれか。`,
    ans,
    wrongs,
    exp: `各文字を、${rule}に置きかえています。\n「${w2}」は「${ans}」。`,
  };
}

export function genAngou(rng, { count, id, domain }) {
  const out = [];
  const seen = new Set();
  while (out.length < count) {
    const t = rng.pick([angouShift, angouShift, angouGojuon, angouGojuon, angouNumber])(rng);
    if (seen.has(t.q)) continue;
    const wrongs = [...new Set(t.wrongs)].filter((w) => w !== t.ans);
    if (wrongs.length < 4) continue;
    seen.add(t.q);
    const list = rng.shuffle([t.ans, ...rng.sample(wrongs, 4)]);
    out.push({ id: id(), domain, type: 'single', question: t.q, choices: list, answer: [list.indexOf(t.ans)], explanation: t.exp });
  }
  return out;
}

/* ---------- 集合・場合の数・数列 ---------- */

const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const P = (n, r) => fact(n) / fact(n - r);
const C = (n, r) => P(n, r) / fact(r);

function set2(rng) {
  const ctx = rng.pick([
    ['ある会社の社員', '自動車を持っている', '自転車を持っている'],
    ['あるクラスの生徒', '英語の検定に合格している', '数学の検定に合格している'],
    ['ある店の客', 'ポイントカードを持っている', 'アプリを使っている'],
    ['ある町の住民', '新聞を読んでいる', 'ラジオを聞いている'],
  ]);
  const both = rng.int(5, 40);
  const onlyA = rng.int(5, 60);
  const onlyB = rng.int(5, 60);
  const none = rng.int(3, 40);
  const N = both + onlyA + onlyB + none;
  const a = onlyA + both;
  const b = onlyB + both;
  if (rng.chance(0.5)) {
    return {
      q: `${ctx[0]} ${N} 人に調査したところ、${ctx[1]}人は ${a} 人、${ctx[2]}人は ${b} 人、両方に当てはまる人は ${both} 人だった。どちらにも当てはまらない人は何人か。`,
      c: none,
      extra: [N - a - b + 2 * both, N - a],
      exp: `どちらかに当てはまる人 = ${a} + ${b} − ${both} = ${a + b - both}（両方の人を 2 回数えないように引く）\nどちらにも当てはまらない人 = ${N} − ${a + b - both} = ${none}（人）`,
    };
  }
  return {
    q: `${ctx[0]} ${N} 人に調査したところ、${ctx[1]}人は ${a} 人、${ctx[2]}人は ${b} 人、どちらにも当てはまらない人は ${none} 人だった。両方に当てはまる人は何人か。`,
    c: both,
    extra: [a + b - N, onlyA],
    exp: `どちらかに当てはまる人 = ${N} − ${none} = ${N - none}\n両方 = ${a} + ${b} − ${N - none} = ${both}（人）`,
  };
}

function set3(rng) {
  const r = { a: rng.int(3, 30), b: rng.int(3, 30), c: rng.int(3, 30), ab: rng.int(2, 15), bc: rng.int(2, 15), ca: rng.int(2, 15), abc: rng.int(1, 10), none: rng.int(2, 25) };
  const N = Object.values(r).reduce((x, y) => x + y, 0);
  const A = r.a + r.ab + r.ca + r.abc;
  const B = r.b + r.ab + r.bc + r.abc;
  const Cc = r.c + r.bc + r.ca + r.abc;
  const AB = r.ab + r.abc;
  const BC = r.bc + r.abc;
  const CA = r.ca + r.abc;
  const any = N - r.none;
  const [x, y, z] = rng.pick([
    ['犬', '猫', '鳥'],
    ['スポーツ', '音楽', '読書'],
    ['電車', 'バス', '自転車'],
  ]);
  return {
    q: `${N} 人に、${x}・${y}・${z}が好きかどうかを聞いた。${x}が好きな人は ${A} 人、${y}は ${B} 人、${z}は ${Cc} 人。${x}と${y}の両方が好きな人は ${AB} 人、${y}と${z}は ${BC} 人、${z}と${x}は ${CA} 人、3 つとも好きな人は ${r.abc} 人だった。どれも好きではない人は何人か。`,
    c: r.none,
    extra: [N - (A + B + Cc - AB - BC - CA), N - (A + B + Cc)].filter((v) => v > 0),
    exp: `少なくとも 1 つが好きな人 = ${A} + ${B} + ${Cc} − ${AB} − ${BC} − ${CA} + ${r.abc} = ${any}\n（2 つずつの重なりを引くと、3 つとも好きな人を引きすぎるので最後に足し戻す）\nどれも好きではない人 = ${N} − ${any} = ${r.none}（人）`,
  };
}

function cases(rng) {
  const k = rng.pick(['perm', 'comb', 'mixed', 'adjacent', 'grid', 'dice']);
  if (k === 'perm') {
    const n = rng.int(5, 9);
    return { q: `${n} 人の中から、リーダーとサブリーダーを 1 人ずつ選ぶ。選び方は何通りか。`, c: P(n, 2), extra: [C(n, 2), n * 2], exp: `リーダーの選び方 ${n} 通り × サブリーダーの選び方 ${n - 1} 通り = ${P(n, 2)}（通り）\n役割があるので順番を区別します（組み合わせではなく順列）。` };
  }
  if (k === 'comb') {
    const n = rng.int(6, 10);
    return { q: `${n} 人の中から、掃除当番を 3 人選ぶ。選び方は何通りか。`, c: C(n, 3), extra: [P(n, 3), C(n, 2)], exp: `役割のない 3 人を選ぶので組み合わせです。\n${n}C3 = (${n} × ${n - 1} × ${n - 2}) ÷ (3 × 2 × 1) = ${C(n, 3)}（通り）` };
  }
  if (k === 'mixed') {
    const m = rng.int(3, 6);
    const w = rng.int(3, 6);
    return { q: `男性 ${m} 人、女性 ${w} 人の中から、男性 2 人と女性 1 人を選ぶ。選び方は何通りか。`, c: C(m, 2) * w, extra: [C(m + w, 3), C(m, 2) + w], exp: `男性 2 人の選び方 ${m}C2 = ${C(m, 2)} 通り、女性 1 人の選び方 ${w} 通り。\n同時に起こるので掛け算: ${C(m, 2)} × ${w} = ${C(m, 2) * w}（通り）` };
  }
  if (k === 'adjacent') {
    const n = rng.int(4, 6);
    return { q: `${n} 人が横一列に並ぶとき、特定の 2 人 P と Q が隣り合う並び方は何通りか。`, c: fact(n - 1) * 2, extra: [fact(n - 1), fact(n)], exp: `P と Q をひとまとまりと考えると、${n - 1} 個の並び方 ${n - 1}! = ${fact(n - 1)} 通り。\nまとまりの中で P と Q の順番が 2 通りあるので、${fact(n - 1)} × 2 = ${fact(n - 1) * 2}（通り）` };
  }
  if (k === 'grid') {
    const a = rng.int(3, 5);
    const b = rng.int(2, 4);
    return { q: `碁盤の目の道で、右に ${a} 区画、上に ${b} 区画進んだところに目的地がある。遠回りをせずに行く道順は何通りか。`, c: C(a + b, b), extra: [a * b, P(a + b, b)], exp: `右 ${a} 回と上 ${b} 回、合計 ${a + b} 回の移動のうち、どこで上に進むかを選ぶ組み合わせです。\n${a + b}C${b} = ${C(a + b, b)}（通り）` };
  }
  const s = rng.int(4, 10);
  let cnt = 0;
  for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === s) cnt++;
  return { q: `2 個のサイコロを同時に投げるとき、出た目の和が ${s} になる場合は何通りか（2 個のサイコロは区別する）。`, c: cnt, extra: [Math.ceil(cnt / 2), cnt + 1], spread: [1, 2, 3], exp: `和が ${s} になる組み合わせを書き出します。\n${Array.from({ length: 6 }, (_, i) => i + 1).filter((i) => s - i >= 1 && s - i <= 6).map((i) => `(${i}, ${s - i})`).join('、')}\n全部で ${cnt} 通り。確率なら ${cnt}/36 です。` };
}

function sequence(rng) {
  const k = rng.pick(['arith', 'geo', 'diff', 'alt']);
  let seq;
  let rule;
  if (k === 'arith') {
    const a = rng.int(2, 40);
    const d = rng.pick([3, 4, 6, 7, 8, 9, 11, 13, -3, -4, -6]);
    seq = Array.from({ length: 7 }, (_, i) => a + d * i + (d < 0 ? 80 : 0));
    rule = `${d > 0 ? d : -d} ずつ${d > 0 ? '増える' : '減る'}`;
  } else if (k === 'geo') {
    const a = rng.int(1, 5);
    const r = rng.pick([2, 3]);
    seq = Array.from({ length: 7 }, (_, i) => a * r ** i);
    rule = `前の数を ${r} 倍する`;
  } else if (k === 'diff') {
    const a = rng.int(1, 20);
    const d0 = rng.int(1, 5);
    const dd = rng.int(1, 4);
    seq = [a];
    for (let i = 1; i < 7; i++) seq.push(seq[i - 1] + d0 + dd * (i - 1));
    rule = `差が ${d0}, ${d0 + dd}, ${d0 + 2 * dd} …… と ${dd} ずつ増える（階差数列）`;
  } else {
    const a = rng.int(1, 10);
    const b = rng.int(20, 60);
    const da = rng.int(2, 5);
    const db = rng.pick([-2, -3, 3, 5]);
    seq = Array.from({ length: 8 }, (_, i) => (i % 2 === 0 ? a + da * (i / 2) : b + db * ((i - 1) / 2)));
    rule = `奇数番目は ${da} ずつ増え、偶数番目は ${Math.abs(db)} ずつ${db > 0 ? '増える' : '減る'}（2 つの数列が交互に並ぶ）`;
  }
  const hide = rng.chance(0.6) ? seq.length - 1 : rng.int(3, seq.length - 2);
  const shown = seq.map((v, i) => (i === hide ? '□' : String(v))).slice(0, hide === seq.length - 1 ? seq.length : seq.length);
  return {
    q: `次の数列の □ に入る数はどれか。\n${shown.join(', ')}`,
    c: seq[hide],
    spread: [1, 2, 3, 4, 6, 8],
    exp: `規則: ${rule}。\nよって □ = ${seq[hide]}`,
  };
}

export function genShugo(rng, { count, id, domain }) {
  const out = [];
  const seen = new Set();
  const gens = [set2, set2, set3, cases, cases, cases, sequence, sequence];
  while (out.length < count) {
    const t = rng.pick(gens)(rng);
    if (seen.has(t.q) || !(t.c > 0)) continue;
    seen.add(t.q);
    const spread = t.spread ?? (t.c < 30 ? [1, 2, 3, 4, 5] : [2, 4, 6, 8, 10, 12].map((x) => Math.max(1, Math.round((x * t.c) / 60))));
    const { choices, answer } = numChoices(rng, t.c, spread, 5, (t.extra ?? []).filter((v) => Number.isInteger(v) && v !== t.c));
    if (new Set(choices).size !== 5) continue;
    out.push({ id: id(), domain, type: 'single', question: t.q, choices, answer: [answer], explanation: t.exp });
  }
  return out;
}

/* ---------- 推論（順位・席） ---------- */

const PEOPLE = ['A', 'B', 'C', 'D', 'E'];
function perms(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}
/** 並び（index 0 が 1 位 / 左端） */
const ALL = perms(PEOPLE);

function makeClue(rng, order, mode) {
  const pos = (p) => order.indexOf(p);
  const [x, y] = rng.sample(PEOPLE, 2);
  const t = rng.pick(['above', 'above', 'diff', 'diff', 'not', 'adj', 'notEdge', 'between']);
  const R = mode === 'rank';
  if (t === 'above') {
    const [u, v] = pos(x) < pos(y) ? [x, y] : [y, x];
    return { text: R ? `${u} は ${v} より順位が上だった。` : `${u} は ${v} より左に座った。`, test: (o) => o.indexOf(u) < o.indexOf(v) };
  }
  if (t === 'diff') {
    const [u, v] = pos(x) < pos(y) ? [x, y] : [y, x];
    const d = pos(v) - pos(u);
    if (R) return { text: d === 1 ? `${u} は ${v} のすぐ上の順位だった。` : `${u} は ${v} より ${d} つ上の順位だった。`, test: (o) => o.indexOf(v) - o.indexOf(u) === d };
    return { text: d === 1 ? `${u} のすぐ右に ${v} が座った。` : `${u} と ${v} の間には ${d - 1} 人が座っていて、${u} のほうが左だった。`, test: (o) => o.indexOf(v) - o.indexOf(u) === d };
  }
  if (t === 'not') {
    let r = rng.int(0, 4);
    if (r === pos(x)) r = (r + rng.int(1, 4)) % 5;
    return { text: R ? `${x} は ${r + 1} 位ではなかった。` : `${x} は左から ${r + 1} 番目の席ではなかった。`, test: (o) => o.indexOf(x) !== r };
  }
  if (t === 'adj') {
    const d = Math.abs(pos(x) - pos(y));
    if (d === 1) return { text: R ? `${x} と ${y} の順位は続いていた。` : `${x} と ${y} は隣どうしに座った。`, test: (o) => Math.abs(o.indexOf(x) - o.indexOf(y)) === 1 };
    return { text: R ? `${x} と ${y} の順位は続いていなかった。` : `${x} と ${y} は隣どうしではなかった。`, test: (o) => Math.abs(o.indexOf(x) - o.indexOf(y)) !== 1 };
  }
  if (t === 'notEdge') {
    const edge = pos(x) === 0 || pos(x) === 4;
    if (edge) return { text: R ? `${x} は 1 位か 5 位のどちらかだった。` : `${x} は端の席に座った。`, test: (o) => o.indexOf(x) === 0 || o.indexOf(x) === 4 };
    return { text: R ? `${x} は 1 位でも 5 位でもなかった。` : `${x} は端の席ではなかった。`, test: (o) => o.indexOf(x) !== 0 && o.indexOf(x) !== 4 };
  }
  const d = Math.abs(pos(x) - pos(y)) - 1;
  if (d === 0) return { text: R ? `${x} と ${y} の順位は続いていた。` : `${x} と ${y} は隣どうしに座った。`, test: (o) => Math.abs(o.indexOf(x) - o.indexOf(y)) === 1 };
  return { text: R ? `${x} と ${y} の間の順位には ${d} 人いた。` : `${x} と ${y} の間には ${d} 人が座っていた。`, test: (o) => Math.abs(o.indexOf(x) - o.indexOf(y)) - 1 === d };
}

const orderText = (o, mode) => (mode === 'rank' ? o.map((p, i) => `${i + 1} 位 ${p}`).join('、') : `左から ${o.join(' ・ ')}`);

function suironUnique(rng, mode) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = rng.shuffle(PEOPLE);
    const clues = [];
    let sols = ALL;
    while (clues.length < 6 && sols.length > 1) {
      const c = makeClue(rng, order, mode);
      if (clues.some((x) => x.text === c.text)) continue;
      const next = sols.filter(c.test);
      if (next.length === sols.length) continue;
      clues.push(c);
      sols = next;
    }
    if (sols.length !== 1 || clues.length < 3) continue;
    const r = rng.int(0, 4);
    const ans = order[r];
    const intro = mode === 'rank' ? 'A〜E の 5 人が競走をした。順位について次のことがわかっている（同じ順位の人はいない）。' : 'A〜E の 5 人が、横一列に並んだ 5 つの席に 1 人ずつ座った。次のことがわかっている。';
    const ask = mode === 'rank' ? `${r + 1} 位は誰か。` : `左から ${r + 1} 番目に座ったのは誰か。`;
    return {
      q: `${intro}\n${clues.map((c) => `・${c.text}`).join('\n')}\n${ask}`,
      choices: PEOPLE.slice(),
      answer: PEOPLE.indexOf(ans),
      exp: `条件をすべて満たす並びは 1 通りだけです。\n${orderText(order, mode)}\nよって答えは ${ans}。\n解き方: 「〜の 2 つ上」「隣どうし」のように位置の差が決まる条件から、考えられる並びを書き出します。そこに「〜ではない」などの条件を当てはめて絞り込むと速く解けます。`,
    };
  }
  return null;
}

function suironCertain(rng, mode) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const order = rng.shuffle(PEOPLE);
    const clues = [];
    let sols = ALL;
    while (clues.length < 5 && sols.length > 4) {
      const c = makeClue(rng, order, mode);
      if (clues.some((x) => x.text === c.text)) continue;
      const next = sols.filter(c.test);
      if (next.length === sols.length || next.length < 2) continue;
      clues.push(c);
      sols = next;
    }
    if (sols.length < 2 || sols.length > 4 || clues.length < 3) continue;
    // 文の候補
    const stmts = [];
    for (const p of PEOPLE)
      for (let r = 0; r < 5; r++) stmts.push({ text: mode === 'rank' ? `${p} は ${r + 1} 位だった。` : `${p} は左から ${r + 1} 番目に座った。`, test: (o) => o.indexOf(p) === r });
    for (const p of PEOPLE)
      for (const q of PEOPLE) if (p < q) stmts.push({ text: mode === 'rank' ? `${p} は ${q} より順位が上だった。` : `${p} は ${q} より左に座った。`, test: (o) => o.indexOf(p) < o.indexOf(q) }, { text: mode === 'rank' ? `${q} は ${p} より順位が上だった。` : `${q} は ${p} より左に座った。`, test: (o) => o.indexOf(q) < o.indexOf(p) });
    const clueTexts = new Set(clues.map((c) => c.text));
    const must = stmts.filter((s) => sols.every(s.test) && !clueTexts.has(s.text));
    const notMust = stmts.filter((s) => !sols.every(s.test) && sols.some(s.test));
    const never = stmts.filter((s) => !sols.some(s.test));
    if (!must.length || notMust.length + never.length < 4) continue;
    const correct = rng.pick(must);
    const wrong = rng.sample(notMust.length >= 3 ? notMust : [...notMust, ...never], 4);
    if (wrong.length < 4) continue;
    const list = rng.shuffle([correct, ...wrong]);
    const intro = mode === 'rank' ? 'A〜E の 5 人が競走をした。順位について次のことがわかっている（同じ順位の人はいない）。' : 'A〜E の 5 人が、横一列に並んだ 5 つの席に 1 人ずつ座った。次のことがわかっている。';
    return {
      q: `${intro}\n${clues.map((c) => `・${c.text}`).join('\n')}\n確実にいえるものはどれか。`,
      choices: list.map((s) => s.text.replace(/。$/, '')),
      answer: list.indexOf(correct),
      exp: `条件を満たす並びは次の ${sols.length} 通りです。\n${sols.map((o) => orderText(o, mode)).join('\n')}\nどの並びでも正しいのは「${correct.text.replace(/。$/, '')}」だけです。ほかの選択肢は、成り立たない並びがあるので「確実」とはいえません。`,
    };
  }
  return null;
}

export function genSuiron(rng, { count, id, domain }) {
  const out = [];
  const seen = new Set();
  while (out.length < count) {
    const mode = rng.chance(0.6) ? 'rank' : 'seat';
    const t = rng.chance(0.55) ? suironUnique(rng, mode) : suironCertain(rng, mode);
    if (!t || seen.has(t.q)) continue;
    seen.add(t.q);
    out.push({ id: id(), domain, type: 'single', question: t.q, choices: t.choices, answer: [t.answer], explanation: t.exp });
  }
  return out;
}

/* ---------- 図形：展開図 ---------- */

/** 立方体の展開図（11 種類）を、6 マスの形をすべて試して見つける */
function cubeNets() {
  const key = (cells) => cells.map(([x, y]) => `${x},${y}`).sort().join(';');
  const norm = (cells) => {
    const mx = Math.min(...cells.map((c) => c[0]));
    const my = Math.min(...cells.map((c) => c[1]));
    return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  };
  let shapes = new Map([[key([[0, 0]]), [[0, 0]]]]);
  for (let size = 1; size < 6; size++) {
    const next = new Map();
    for (const cells of shapes.values()) {
      for (const [x, y] of cells)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const c = [x + dx, y + dy];
          if (cells.some(([a, b]) => a === c[0] && b === c[1])) continue;
          const n = norm([...cells, c]);
          next.set(key(n), n);
        }
    }
    shapes = next;
  }
  const valid = [];
  const canon = new Set();
  const transforms = [
    ([x, y]) => [x, y], ([x, y]) => [-y, x], ([x, y]) => [-x, -y], ([x, y]) => [y, -x],
    ([x, y]) => [-x, y], ([x, y]) => [y, x], ([x, y]) => [x, -y], ([x, y]) => [-y, -x],
  ];
  for (const cells of shapes.values()) {
    const has = (x, y) => cells.some(([a, b]) => a === x && b === y);
    if (cells.some(([x, y]) => has(x + 1, y) && has(x, y + 1) && has(x + 1, y + 1))) continue;
    const faces = foldNet(cells);
    if (!faces || new Set(faces).size !== 6) continue;
    const c = transforms.map((t) => key(norm(cells.map(t)))).sort()[0];
    if (canon.has(c)) continue;
    canon.add(c);
    valid.push(cells);
  }
  return { nets: valid, transforms, norm };
}

/** 展開図のマスごとに、立方体のどの面になるか（0〜5。0-1, 2-3, 4-5 が向かい合う） */
function foldNet(cells) {
  const idx = (x, y) => cells.findIndex(([a, b]) => a === x && b === y);
  const faces = Array(cells.length).fill(null);
  const roll = {
    E: (s) => ({ B: s.E, E: s.T, T: s.W, W: s.B, N: s.N, S: s.S }),
    W: (s) => ({ B: s.W, W: s.T, T: s.E, E: s.B, N: s.N, S: s.S }),
    S: (s) => ({ B: s.S, S: s.T, T: s.N, N: s.B, E: s.E, W: s.W }),
    N: (s) => ({ B: s.N, N: s.T, T: s.S, S: s.B, E: s.E, W: s.W }),
  };
  const dirs = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
  const stack = [[0, { B: 0, T: 1, N: 2, S: 3, E: 4, W: 5 }]];
  faces[0] = 0;
  while (stack.length) {
    const [i, st] = stack.pop();
    const [x, y] = cells[i];
    for (const [d, [dx, dy]] of Object.entries(dirs)) {
      const j = idx(x + dx, y + dy);
      if (j < 0 || faces[j] !== null) continue;
      const ns = roll[d](st);
      faces[j] = ns.B;
      stack.push([j, ns]);
    }
  }
  return faces;
}

const opposite = (f) => (f % 2 === 0 ? f + 1 : f - 1);

function netSvg(cells, labels, size = 40) {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const pad = 2;
  const rects = cells
    .map(([x, y], i) => {
      const px = pad + x * size;
      const py = pad + y * size;
      return `<rect x="${px}" y="${py}" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="${px + size / 2}" y="${py + size / 2}" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="700" fill="currentColor">${labels[i]}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${w * size + pad * 2} ${h * size + pad * 2}" width="${w * size + pad * 2}" height="${h * size + pad * 2}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

export function genTenkai(rng, { count, id, domain }) {
  const { nets, transforms, norm } = cubeNets();
  if (nets.length !== 11) throw new Error(`立方体の展開図が ${nets.length} 種類になりました`);
  const out = [];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seen = new Set();
  while (out.length < count) {
    const cells = norm(rng.pick(nets).map(rng.pick(transforms)));
    const labels = rng.shuffle(letters);
    const faces = foldNet(cells);
    const faceOf = (l) => faces[labels.indexOf(l)];
    const letterOfFace = (f) => labels[faces.indexOf(f)];
    const svg = netSvg(cells, labels);
    const figure = { kind: 'svg', title: '立方体の展開図', svg, alt: `立方体の展開図。マスの並び: ${cells.map(([x, y], i) => `(${x + 1}, ${y + 1}) ${labels[i]}`).join('、')}` };
    if (rng.chance(0.65)) {
      const t = rng.pick(letters);
      const ans = letterOfFace(opposite(faceOf(t)));
      const qtext = `次の展開図を組み立てて立方体を作るとき、「${t}」の面と向かい合う面はどれか。`;
      const k = qtext + svg;
      if (seen.has(k)) continue;
      seen.add(k);
      // 選択肢の記号（A〜E）と面の文字がまぎれないよう「」で囲む
      const face = (l) => `「${l}」の面`;
      const choices = letters.filter((l) => l !== t).map(face);
      out.push({
        id: id(),
        domain,
        type: 'single',
        question: qtext,
        figure,
        choices,
        answer: [choices.indexOf(face(ans))],
        explanation: `向かい合う面は、展開図の上で「1 つおきに一直線に並ぶ面」になります（間に 1 面はさむ）。一直線になっていないときは、面を回転させて移動し、一直線に並べ直して考えます。\nこの展開図では「${t}」と「${ans}」が向かい合います。\n向かい合う面の組: ${[0, 2, 4].map((f) => `${letterOfFace(f)} と ${letterOfFace(f + 1)}`).join('、')}`,
      });
    } else {
      const pairText = (a, b) => `「${a}」と「${b}」`;
      const pairs = [0, 2, 4].map((f) => pairText(...[letterOfFace(f), letterOfFace(f + 1)].sort()));
      const nonPairs = [];
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
        const p = pairText(letters[i], letters[j]);
        if (!pairs.includes(p)) nonPairs.push(p);
      }
      const correct = rng.pick(pairs);
      const list = rng.shuffle([correct, ...rng.sample(nonPairs, 4)]);
      out.push({
        id: id(),
        domain,
        type: 'single',
        question: '次の展開図を組み立てて立方体を作るとき、向かい合う面の組み合わせとして正しいものはどれか。',
        figure,
        choices: list,
        answer: [list.indexOf(correct)],
        explanation: `向かい合う面の組は ${pairs.join('、')} です。\n展開図で一直線に 3 面並んでいるとき、両端の面が向かい合います。隣り合う面（辺を共有する面）は向かい合いません。`,
      });
    }
  }
  return out;
}

/* ---------- 図形：一筆書き ---------- */

const NODE_LABELS = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ'];

function randomGraph(rng) {
  // 3×3 の点。縦横の辺と、マスごとに多くても 1 本の対角線
  const edges = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    if (x < 2) edges.push([y * 3 + x, y * 3 + x + 1]);
    if (y < 2) edges.push([y * 3 + x, (y + 1) * 3 + x]);
  }
  const diag = [];
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const a = rng.chance(0.5) ? [y * 3 + x, (y + 1) * 3 + x + 1] : [y * 3 + x + 1, (y + 1) * 3 + x];
    if (rng.chance(0.45)) diag.push(a);
  }
  const chosen = [...edges.filter(() => rng.chance(0.7)), ...diag];
  const nodes = [...new Set(chosen.flat())];
  // つながっているか
  const adj = new Map(nodes.map((n) => [n, []]));
  for (const [a, b] of chosen) {
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  const seen = new Set([nodes[0]]);
  const st = [nodes[0]];
  while (st.length) for (const m of adj.get(st.pop())) if (!seen.has(m)) (seen.add(m), st.push(m));
  if (seen.size !== nodes.length || nodes.length < 6) return null;
  const deg = new Map(nodes.map((n) => [n, adj.get(n).length]));
  return { edges: chosen, nodes: nodes.sort((a, b) => a - b), deg };
}

function graphSvg(g, labels) {
  const S = 70;
  const pad = 26;
  const xy = (n) => [pad + (n % 3) * S, pad + Math.floor(n / 3) * S];
  const lines = g.edges.map(([a, b]) => {
    const [x1, y1] = xy(a);
    const [x2, y2] = xy(b);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`;
  });
  const dots = g.nodes.map((n) => {
    const [x, y] = xy(n);
    const lab = labels.get(n);
    return `<circle cx="${x}" cy="${y}" r="4.5" fill="currentColor"/>${lab ? `<text x="${x + 9}" y="${y - 9}" font-size="14" font-weight="700" fill="currentColor">${lab}</text>` : ''}`;
  });
  const W = pad * 2 + S * 2;
  return `<svg viewBox="0 0 ${W + 10} ${W}" width="${W + 10}" height="${W}" xmlns="http://www.w3.org/2000/svg">${lines.join('')}${dots.join('')}</svg>`;
}

export function genHitofude(rng, { count, id, domain }) {
  const out = [];
  let k = 0;
  while (out.length < count) {
    // 「書き始めの点」→「どこからでも書ける」→「書き始めの点」→「書けない」の順に作る
    const want = ['start', 'zero', 'start', 'many'][k % 4];
    const g = randomGraph(rng);
    if (!g) continue;
    const odd = g.nodes.filter((n) => g.deg.get(n) % 2 === 1);
    const cls = odd.length === 0 ? 'zero' : odd.length === 2 ? 'start' : 'many';
    if (cls !== want) continue;
    k++;
    const labels = new Map(g.nodes.map((n, i) => [n, NODE_LABELS[i]]));
    const degText = g.nodes.map((n) => `${labels.get(n)}: ${g.deg.get(n)} 本`).join('、');
    if (odd.length === 2 && rng.chance(0.75)) {
      const correctNode = rng.pick(odd);
      const evens = g.nodes.filter((n) => g.deg.get(n) % 2 === 0);
      if (evens.length < 4) continue;
      const opts = rng.shuffle([correctNode, ...rng.sample(evens, 4)]).sort((a, b) => a - b);
      const svg = graphSvg(g, labels);
      out.push({
        id: id(),
        domain,
        type: 'single',
        question: '次の図形を一筆書きするとき、書き始めの点として正しいものはどれか（同じ線を 2 度通らず、すべての線を 1 回ずつ通る）。',
        figure: { kind: 'svg', title: '図形', svg, alt: `点と線の図形。各点に集まる線の数: ${degText}` },
        choices: opts.map((n) => labels.get(n)),
        answer: [opts.indexOf(correctNode)],
        explanation: `各点に集まる線の数を数えます。\n${degText}\n線が奇数本集まる点（奇数点）は ${odd.map((n) => labels.get(n)).join(' と ')} の 2 つです。奇数点が 2 つの図形は、一方の奇数点から書き始め、もう一方の奇数点で書き終わります。\nよって、書き始められるのは ${labels.get(correctNode)}（選択肢の中で奇数点はこれだけ）。`,
      });
    } else {
      const choices = ['書ける。どの点から書き始めてもよい', '書ける。ただし書き始めは決まった 2 点のどちらか', '書けない'];
      const ans = odd.length === 0 ? 0 : odd.length === 2 ? 1 : 2;
      const svg = graphSvg(g, new Map());
      out.push({
        id: id(),
        domain,
        type: 'single',
        question: '次の図形は一筆書きできるか（同じ線を 2 度通らず、すべての線を 1 回ずつ通る）。',
        figure: { kind: 'svg', title: '図形', svg, alt: `点と線の図形。奇数本の線が集まる点の数: ${odd.length}` },
        choices,
        answer: [ans],
        explanation: `線が奇数本集まる点（奇数点）を数えます。この図形の奇数点は ${odd.length} 個です。\n・奇数点が 0 個 → 一筆書きでき、どこから書き始めてもよい\n・奇数点が 2 個 → 一筆書きできるが、奇数点から書き始めて、もう一方の奇数点で終わる\n・奇数点が 4 個以上 → 一筆書きできない\nよって「${choices[ans]}」。`,
      });
    }
  }
  return out;
}

/* ---------- 図形：サイコロ ---------- */

export function genDice(rng, { count, id, domain }) {
  const out = [];
  const seen = new Set();
  const names = { R: '右', L: '左', B: '奥', F: '手前' };
  const roll = {
    R: (s) => ({ ...s, right: s.top, bottom: s.right, left: s.bottom, top: s.left }),
    L: (s) => ({ ...s, left: s.top, top: s.right, right: s.bottom, bottom: s.left }),
    B: (s) => ({ ...s, back: s.top, top: s.front, front: s.bottom, bottom: s.back }),
    F: (s) => ({ ...s, front: s.top, top: s.back, back: s.bottom, bottom: s.front }),
  };
  while (out.length < count) {
    const top = rng.int(1, 6);
    const front = rng.pick([1, 2, 3, 4, 5, 6].filter((v) => v !== top && v !== 7 - top));
    const right = rng.pick([1, 2, 3, 4, 5, 6].filter((v) => ![top, 7 - top, front, 7 - front].includes(v)));
    let s = { top, bottom: 7 - top, front, back: 7 - front, right, left: 7 - right };
    const back = { R: 'L', L: 'R', B: 'F', F: 'B' };
    const moves = [];
    const len = rng.int(2, 4);
    while (moves.length < len) {
      const m = rng.pick(['R', 'L', 'B', 'F']);
      // すぐ逆向きに戻す転がし方は除く
      if (moves.length && back[moves[moves.length - 1]] === m) continue;
      moves.push(m);
    }
    const trace = [];
    for (const m of moves) {
      s = roll[m](s);
      trace.push(`${names[m]}へ → 上 ${s.top}、手前 ${s.front}、右 ${s.right}`);
    }
    const askFront = rng.chance(0.3);
    const q = `向かい合う面の目の和が 7 になるサイコロがある。上の面が ${top}、手前の面が ${front}、右の面が ${right} になるように置き、${moves.map((m) => names[m]).join('、')}の順に 1 回ずつ転がした。このとき${askFront ? '手前' : '上'}の面の目はいくつか。`;
    if (seen.has(q)) continue;
    seen.add(q);
    const ans = askFront ? s.front : s.top;
    const choices = ['1', '2', '3', '4', '5', '6'];
    out.push({
      id: id(),
      domain,
      type: 'single',
      question: q,
      choices,
      answer: [ans - 1],
      explanation: `「上・手前・右」の 3 面だけを追いかけ、反対側は 7 から引いて求めます。\n最初: 上 ${top}、手前 ${front}、右 ${right}\n${trace.join('\n')}\nよって${askFront ? '手前' : '上'}の面は ${ans}。\n右へ転がすと「上の面が右へ」、奥へ転がすと「上の面が奥へ」移ります。`,
    });
  }
  return out;
}
