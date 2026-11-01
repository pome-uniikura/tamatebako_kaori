// 問題の自動生成で使う共通の道具（乱数・分数・数値の表示・選択肢づくり）

/** 毎回同じ問題になるよう、種から決まる乱数 */
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
    sample: (arr, n) => rng.shuffle(arr).slice(0, n),
  };
  return rng;
}

export const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};

/** 分数（約分して持つ） */
export class Frac {
  constructor(n, d = 1) {
    if (d === 0) throw new Error('0 で割りました');
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      // 小数は 10 の累乗で分数にする
      const f = Frac.fromDecimal(n).div(Frac.fromDecimal(d));
      this.n = f.n;
      this.d = f.d;
      return;
    }
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d) || 1;
    this.n = n / g;
    this.d = d / g;
  }
  static fromDecimal(x) {
    if (x instanceof Frac) return x;
    const s = String(x);
    if (!s.includes('.')) return new Frac(Number(s), 1);
    const [i, f] = s.split('.');
    const d = 10 ** f.length;
    return new Frac(Number(i + f), d);
  }
  static of(x) {
    return x instanceof Frac ? x : Frac.fromDecimal(x);
  }
  add(o) {
    o = Frac.of(o);
    return new Frac(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o) {
    o = Frac.of(o);
    return new Frac(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o) {
    o = Frac.of(o);
    return new Frac(this.n * o.n, this.d * o.d);
  }
  div(o) {
    o = Frac.of(o);
    return new Frac(this.n * o.d, this.d * o.n);
  }
  eq(o) {
    o = Frac.of(o);
    return this.n === o.n && this.d === o.d;
  }
  get value() {
    return this.n / this.d;
  }
  isInt() {
    return this.d === 1;
  }
  /** 有限小数で、小数点以下 maxDigits 桁以内か */
  isNiceDecimal(maxDigits = 2) {
    let d = this.d;
    let twos = 0;
    let fives = 0;
    while (d % 2 === 0) {
      d /= 2;
      twos++;
    }
    while (d % 5 === 0) {
      d /= 5;
      fives++;
    }
    return d === 1 && Math.max(twos, fives) <= maxDigits;
  }
  /** 小数で表せるなら小数、そうでなければ分数の文字列 */
  toString(asFraction = false) {
    if (this.d === 1) return String(this.n);
    if (!asFraction && this.isNiceDecimal(3)) return trimNum(this.n / this.d, 3);
    return `${this.n}/${this.d}`;
  }
}

/** 浮動小数の誤差を消して文字列にする */
export function trimNum(x, digits = 3) {
  const s = (Math.round(x * 10 ** digits) / 10 ** digits).toFixed(digits);
  return s.replace(/\.?0+$/, '');
}

/** 3 桁区切り（小数は digits 桁まで） */
export function comma(x, digits = 0) {
  return new Intl.NumberFormat('ja-JP', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(x);
}

/** 指定の桁で四捨五入 */
export const roundTo = (x, digits = 0) => Math.round(x * 10 ** digits) / 10 ** digits;

/**
 * 数値の選択肢を 5 つ（または n 個）作る。
 * 正解を中心に、ほぼ等間隔（少しゆらぎあり）で並べ、小さい順にする。
 * 正解の位置はランダム。
 */
export function spreadChoices(rng, correct, { n = 5, step = 0.15, digits = 0, format = (v) => comma(v, digits), extra = [] } = {}) {
  const pos = rng.int(0, n - 1);
  const values = [];
  for (let i = 0; i < n; i++) {
    if (i === pos) values.push(correct);
    else {
      const jitter = 1 + (rng.next() - 0.5) * step * 0.5;
      values.push(correct * (1 + (i - pos) * step) * jitter);
    }
  }
  // 間違えやすい計算の結果があれば、近すぎない範囲で 1 つ入れ替える
  for (const e of extra) {
    if (!(e > 0) || Math.abs(e - correct) / correct < step * 0.6) continue;
    const idx = values.findIndex((v, i) => i !== pos && Math.abs(v - e) / correct < step * 1.2);
    if (idx >= 0) values[idx] = e;
    break;
  }
  let shown = values.map((v) => roundTo(v, digits));
  if (shown.some((v) => v <= 0)) return spreadChoices(rng, correct, { n, step: step * 0.7, digits, format, extra });
  const correctShown = roundTo(correct, digits);
  shown[pos] = correctShown;
  // 丸めで重なったら作り直す
  if (new Set(shown).size !== n) return spreadChoices(rng, correct, { n, step: step * 1.2, digits, format, extra: [] });
  const sorted = shown.slice().sort((a, b) => a - b);
  return { choices: sorted.map(format), answer: sorted.indexOf(correctShown) };
}

/** 文字の選択肢（正解を含む）を並べ替えて返す */
export function textChoices(rng, correct, wrongs, n = 5) {
  const list = rng.shuffle([correct, ...rng.sample(wrongs.filter((w) => w !== correct), n - 1)]);
  return { choices: list, answer: list.indexOf(correct) };
}

/** 問題 ID の連番 */
export function idMaker(prefix) {
  let i = 0;
  return () => `${prefix}-${String(++i).padStart(3, '0')}`;
}

export const KANA_ABCDE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
