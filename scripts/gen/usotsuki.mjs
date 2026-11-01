// TG-WEB 従来型 計数「推論」のうそつき問題（手で作った条件を、全通り調べて答えが 1 つか確かめる）

const P5 = ['A', 'B', 'C', 'D', 'E'];
const P4 = ['A', 'B', 'C', 'D'];

/* ---- 犯人探し: 1 人が○○した。うそつきの人数が決まっている ---- */
export const CULPRIT = [
  {
    story: 'A〜E の 5 人のうち 1 人が、会議室の花びんを割った。5 人に聞いたところ、次のように答えた。このうち 1 人だけがうそをついている。',
    people: P5,
    liars: 1,
    says: {
      A: ['B が割った。', (w) => w === 'B'],
      B: ['私は割っていない。', (w) => w !== 'B'],
      C: ['D は割っていない。', (w) => w !== 'D'],
      D: ['A が割った。', (w) => w === 'A'],
      E: ['C は割っていない。', (w) => w !== 'C'],
    },
  },
  {
    story: 'A〜E の 5 人のうち 1 人が、冷蔵庫のケーキを食べた。5 人は次のように話している。このうち本当のことを言っているのは 1 人だけである。',
    people: P5,
    liars: 4,
    says: {
      A: ['B が食べた。', (w) => w === 'B'],
      B: ['D が食べた。', (w) => w === 'D'],
      C: ['私は食べていない。', (w) => w !== 'C'],
      D: ['B の言っていることはうそだ。', (w) => w !== 'D'],
      E: ['A が食べた。', (w) => w === 'A'],
    },
  },
  {
    story: 'A〜D の 4 人のうち 1 人が、くじで 1 等を当てた。4 人は次のように話している。このうち 2 人がうそをついている。',
    people: P4,
    liars: 2,
    says: {
      A: ['1 等は B だ。', (w) => w === 'B'],
      B: ['1 等は C か D だ。', (w) => w === 'C' || w === 'D'],
      C: ['私は 1 等ではない。', (w) => w !== 'C'],
      D: ['1 等は A ではない。', (w) => w !== 'A'],
    },
  },
  {
    story: 'A〜E の 5 人のうち 1 人が、受付に置いてあった書類を持ち出した。5 人は次のように答えた。このうち 2 人がうそをついている。',
    people: P5,
    liars: 2,
    says: {
      A: ['持ち出したのは C か E だ。', (w) => w === 'C' || w === 'E'],
      B: ['私でも A でもない。', (w) => w !== 'B' && w !== 'A'],
      C: ['持ち出したのは B だ。', (w) => w === 'B'],
      D: ['E ではない。', (w) => w !== 'E'],
      E: ['A が持ち出した。', (w) => w === 'A'],
    },
  },
  {
    story: 'A〜D の 4 人のうち 1 人だけが、昨日の会議に遅刻した。4 人は次のように話している。このうち 1 人だけがうそをついている。',
    people: P4,
    liars: 1,
    says: {
      A: ['遅刻したのは私ではない。', (w) => w !== 'A'],
      B: ['遅刻したのは C だ。', (w) => w === 'C'],
      C: ['遅刻したのは D だ。', (w) => w === 'D'],
      D: ['C の言っていることはうそだ。', (w) => w !== 'D'],
    },
  },
];

export function solveCulprit(p) {
  const rows = p.people.map((w) => {
    const lying = p.people.filter((x) => !p.says[x][1](w));
    return { w, lying };
  });
  const ok = rows.filter((r) => r.lying.length === p.liars);
  return { rows, ok };
}

/* ---- 順位: 1 人だけがうそをついている ---- */
function perms(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((q) => [x, ...q]));
}
const rank = (o, p) => o.indexOf(p) + 1;

export const RANKING = [
  {
    story: 'A〜D の 4 人がマラソン大会に出場した。順位について、4 人は次のように話している。このうち 1 人だけがうそをついている。なお、同じ順位の人はいない。',
    people: P4,
    liars: 1,
    ask: 1,
    says: {
      A: ['私は B より順位が上だった。', (o) => rank(o, 'A') < rank(o, 'B')],
      B: ['私は 2 位だった。', (o) => rank(o, 'B') === 2],
      C: ['私は 1 位ではなかった。', (o) => rank(o, 'C') !== 1],
      D: ['私は C のすぐ後ろだった。', (o) => rank(o, 'D') === rank(o, 'C') + 1],
    },
  },
  {
    story: 'A〜D の 4 人が試験を受け、点数の高い順に 1 位から 4 位までの順位がついた。4 人は次のように話している。このうち 1 人だけがうそをついている。なお、同じ順位の人はいない。',
    people: P4,
    liars: 1,
    ask: 4,
    says: {
      A: ['C は 1 位だった。', (o) => rank(o, 'C') === 1],
      B: ['私は 3 位だった。', (o) => rank(o, 'B') === 3],
      C: ['私は 2 位だった。', (o) => rank(o, 'C') === 2],
      D: ['私は B より順位が下だった。', (o) => rank(o, 'D') > rank(o, 'B')],
    },
  },
];

export function solveRanking(p) {
  const ok = perms(p.people).filter((o) => p.people.filter((x) => !p.says[x][1](o)).length === p.liars);
  return ok;
}

/* ---- 正直者とうそつき: 正直者は必ず本当のことを、うそつきは必ずうそを言う ---- */
export const TYPES = [
  {
    story: 'A、B、C の 3 人は、それぞれ「いつも本当のことを言う正直者」か「いつもうそを言ううそつき」のどちらかである。3 人は次のように話した。',
    people: ['A', 'B', 'C'],
    ask: 'count',
    says: {
      A: ['B はうそつきだ。', (t) => !t.B],
      B: ['C はうそつきだ。', (t) => !t.C],
      C: ['A と B は、2 人ともうそつきだ。', (t) => !t.A && !t.B],
    },
  },
  {
    story: 'A、B、C、D の 4 人は、それぞれ「いつも本当のことを言う正直者」か「いつもうそを言ううそつき」のどちらかである。4 人は次のように話した。',
    people: P4,
    ask: 'count',
    says: {
      A: ['B は正直者だ。', (t) => t.B],
      B: ['C はうそつきだ。', (t) => !t.C],
      C: ['D は正直者だ。', (t) => t.D],
      D: ['A と C は、どちらもうそつきだ。', (t) => !t.A && !t.C],
    },
  },
  {
    story: 'A、B、C の 3 人は、それぞれ「いつも本当のことを言う正直者」か「いつもうそを言ううそつき」のどちらかである。3 人は次のように話した。',
    people: ['A', 'B', 'C'],
    ask: 'who',
    says: {
      A: ['私たち 3 人の中に、うそつきはちょうど 1 人いる。', (t) => ['A', 'B', 'C'].filter((x) => !t[x]).length === 1],
      B: ['A はうそつきだ。', (t) => !t.A],
      C: ['A と B のうち、少なくとも 1 人は正直者だ。', (t) => t.A || t.B],
    },
  },
];

export function solveTypes(p) {
  const n = p.people.length;
  const ok = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const t = Object.fromEntries(p.people.map((x, i) => [x, Boolean(mask & (1 << i))]));
    // 正直者の発言は真、うそつきの発言は偽
    if (p.people.every((x) => p.says[x][1](t) === t[x])) ok.push(t);
  }
  return ok;
}

const saysText = (p) => p.people.map((x) => `${x}「${p.says[x][0]}」`).join('\n');

export function genUsotsuki(rng, { id, domain }) {
  const out = [];
  for (const p of CULPRIT) {
    const { rows, ok } = solveCulprit(p);
    if (ok.length !== 1) throw new Error(`うそつき問題の答えが ${ok.length} 通りです: ${p.story}`);
    const ans = ok[0].w;
    const what = p.story.includes('1 等') ? '1 等を当てたのは誰か。' : p.story.includes('遅刻') ? '遅刻したのは誰か。' : p.story.includes('ケーキ') ? 'ケーキを食べたのは誰か。' : p.story.includes('書類') ? '書類を持ち出したのは誰か。' : '花びんを割ったのは誰か。';
    out.push({
      id: id(),
      domain,
      type: 'single',
      question: `${p.story}\n${saysText(p)}\n${what}`,
      choices: p.people.slice(),
      answer: [p.people.indexOf(ans)],
      explanation: `「答えが〇〇だとしたら、うそをついているのは誰か」を全員分調べます。\n${rows
        .map((r) => `${r.w} だとすると → うそは ${r.lying.length ? r.lying.join('・') : 'なし'}（${r.lying.length} 人）`)
        .join('\n')}\nうそつきが ${p.liars} 人になるのは ${ans} の場合だけです。`,
    });
  }
  for (const p of RANKING) {
    const ok = solveRanking(p);
    const answers = new Set(ok.map((o) => o[p.ask - 1]));
    if (answers.size !== 1) throw new Error(`順位のうそつき問題の答えが 1 つに決まりません: ${p.story}`);
    const ans = [...answers][0];
    const lies = ok.map((o) => p.people.filter((x) => !p.says[x][1](o)).join(''));
    out.push({
      id: id(),
      domain,
      type: 'single',
      question: `${p.story}\n${saysText(p)}\n${p.ask} 位は誰か。`,
      choices: p.people.slice(),
      answer: [p.people.indexOf(ans)],
      explanation: `「うそをついているのは〇〇」と 1 人ずつ仮定して、ほかの 3 人の発言がすべて成り立つ順位があるかを調べます。\n条件を満たすのは次の場合です。\n${ok
        .map((o, i) => `うそつき ${lies[i]} → ${o.map((x, j) => `${j + 1} 位 ${x}`).join('、')}`)
        .join('\n')}\nどの場合も ${p.ask} 位は ${ans} です。`,
    });
  }
  for (const p of TYPES) {
    const ok = solveTypes(p);
    if (ok.length !== 1) throw new Error(`正直者とうそつきの問題の答えが ${ok.length} 通りです: ${p.story}`);
    const t = ok[0];
    const liars = p.people.filter((x) => !t[x]);
    const detail = p.people.map((x) => `${x}: ${t[x] ? '正直者' : 'うそつき'}`).join('、');
    if (p.ask === 'count') {
      const choices = Array.from({ length: p.people.length + 1 }, (_, i) => `${i} 人`);
      out.push({
        id: id(),
        domain,
        type: 'single',
        question: `${p.story}\n${saysText(p)}\nうそつきは何人いるか。`,
        choices,
        answer: [liars.length],
        explanation: `誰か 1 人を「正直者」と仮定し、その発言から他の人を順に決めていきます。矛盾が出たら仮定を「うそつき」に変えます。\n矛盾なく成り立つのは「${detail}」の場合だけなので、うそつきは ${liars.length} 人です。\nうそつきの発言は「内容が偽」になることに注意しましょう（例: うそつきが「X はうそつきだ」と言えば、X は正直者）。`,
      });
    } else {
      const choices = ['A だけ', 'B だけ', 'C だけ', 'A と B', 'B と C'];
      const key = liars.length === 1 ? `${liars[0]} だけ` : liars.join(' と ');
      if (!choices.includes(key)) throw new Error(`選択肢に答えがありません: ${key}`);
      out.push({
        id: id(),
        domain,
        type: 'single',
        question: `${p.story}\n${saysText(p)}\nうそつきは誰か。`,
        choices,
        answer: [choices.indexOf(key)],
        explanation: `A が正直者か、うそつきかで場合分けします。\n矛盾なく成り立つのは「${detail}」の場合だけです。\nよって、うそつきは ${key}。`,
      });
    }
  }
  return out;
}
