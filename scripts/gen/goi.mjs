// TG-WEB 新型 言語の語彙問題（同義語・対義語・ことわざ・慣用句）
import { DOUIGO, KOTOWAZA, TAIGIGO } from './goi-data.mjs';

/** 選択肢に使ってよい組（同じ組・同じ tag の組は除く） */
const others = (list, item) => list.filter((x) => x !== item && (!item.tag || x.tag !== item.tag));

export function genDouigo(rng, { id, domain }) {
  const out = [];
  for (const set of DOUIGO) {
    for (const w of set.w) {
      const answer = rng.pick(set.w.filter((x) => x !== w));
      const pool = others(DOUIGO, set).flatMap((x) => x.w);
      const wrong = rng.sample(pool, 4);
      const choices = rng.shuffle([answer, ...wrong]);
      out.push({
        id: id(),
        domain,
        type: 'single',
        question: `「${w}」と最も意味が近い語はどれか。`,
        choices,
        answer: [choices.indexOf(answer)],
        explanation: `「${set.w.join('」「')}」は、どれも「${set.m}」という意味です。`,
      });
    }
  }
  return out;
}

export function genTaigigo(rng, { id, domain }) {
  const out = [];
  for (const pair of TAIGIGO) {
    const [m0, m1] = pair.m.split('／');
    for (const [a, b, ma, mb] of [
      [pair.w[0], pair.w[1], m0, m1],
      [pair.w[1], pair.w[0], m1, m0],
    ]) {
      const pool = others(TAIGIGO, pair).flatMap((x) => x.w);
      const wrong = rng.sample(pool, 4);
      const choices = rng.shuffle([b, ...wrong]);
      out.push({
        id: id(),
        domain,
        type: 'single',
        question: `「${a}」の対義語として最も適切なものはどれか。`,
        choices,
        answer: [choices.indexOf(b)],
        explanation: `「${a}」（${ma}）の対義語は「${b}」（${mb}）です。`,
      });
    }
  }
  return out;
}

export function genKotowaza(rng, { id, domain }) {
  const out = [];
  const firstKanyo = KOTOWAZA.findIndex((k) => k.p === '手を焼く');
  const isKanyo = (k) => KOTOWAZA.indexOf(k) >= firstKanyo;
  for (const k of KOTOWAZA) {
    const pool = others(KOTOWAZA, k).filter((x) => x.m !== k.m && isKanyo(x) === isKanyo(k));
    const wrong = rng.sample([...new Set(pool.map((x) => x.m))], 3);
    const choices = rng.shuffle([k.m, ...wrong]);
    out.push({
      id: id(),
      domain,
      type: 'single',
      question: `${isKanyo(k) ? '慣用句' : 'ことわざ'}「${k.p}」の意味として最も適切なものはどれか。`,
      choices,
      answer: [choices.indexOf(k.m)],
      explanation: `「${k.p}」は「${k.m}」という意味です。${
        k.tag
          ? `\n似た意味のことば: ${KOTOWAZA.filter((x) => x.tag === k.tag && x !== k)
              .map((x) => `「${x.p}」`)
              .join('')}`
          : ''
      }`,
    });
  }
  // 似た意味のことわざを選ぶ問題
  const tags = [...new Set(KOTOWAZA.filter((k) => k.tag).map((k) => k.tag))];
  for (const tag of tags) {
    const group = KOTOWAZA.filter((k) => k.tag === tag && !isKanyo(k));
    if (group.length < 2) continue;
    for (const k of group) {
      const answer = rng.pick(group.filter((x) => x !== k));
      const pool = KOTOWAZA.filter((x) => x.tag !== tag && !isKanyo(x) && x.m !== k.m);
      const wrong = rng.sample(pool, 3).map((x) => x.p);
      const choices = rng.shuffle([answer.p, ...wrong]);
      out.push({
        id: id(),
        domain,
        type: 'single',
        question: `「${k.p}」と似た意味のことわざはどれか。`,
        choices,
        answer: [choices.indexOf(answer.p)],
        explanation: `「${k.p}」は「${k.m}」、「${answer.p}」は「${answer.m}」という意味で、似た意味を表します。`,
      });
    }
  }
  return out;
}
