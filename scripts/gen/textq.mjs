// 手書きの問題（src/data/text/<科目>/<名前>.txt）を JSON にする。
//
// 書き方:
//   // で始まる行はコメント
//   @domain gab        以降の問題の形式 ID
//   @prefix tbg-gab    問題 ID の先頭（ファイル内で 01, 02 … と連番になる）
//   @choices gab       決まった選択肢を使う（gab / images / eng-gab）。none で解除
//   @shuffle on        選択肢を毎回並べ替える（off で解除）
//   @lang en           英語の問題（ja で解除）
//   @mix on            本文ごとに問題の順番を混ぜる（正解の並びが読まれないように。毎回同じ順になる）
//   ### タイトル        ここから新しい本文（タイトルは省略可）。空行で段落を分ける
//   ### -              本文のない問題に切り替える
//   Q: 問題文           次の行に続けて書くと改行になる
//   A: B               決まった選択肢のときの正解（A/B/C）
//   - 選択肢           「- *」で始まるものが正解
//   E: 解説            次の行に続けて書ける
import { readFileSync } from 'node:fs';
import { makeRng } from './lib.mjs';

export const PRESETS = {
  gab: [
    '本文から論理的に考えて、設問文は明らかに正しい（または正しい内容を含む）',
    '本文から論理的に考えて、設問文は明らかに誤っている（または誤った内容を含む）',
    '本文の内容だけからは、設問文が正しいか誤っているか判断できない',
  ],
  images: ['筆者が一番訴えたいこと（趣旨）が述べられている', '本文に書かれているが、一番訴えたいことではない', '本文とは関係のないことが書かれている'],
  'eng-gab': [
    'True（本文から考えて明らかに正しい）',
    'False（本文から考えて明らかに誤っている）',
    'Cannot say（本文だけでは判断できない）',
  ],
};

export function parseTextQuestions(path) {
  const lines = readFileSync(path, 'utf8').split('\n');
  const passages = [];
  const questions = [];
  let domain = null;
  let prefix = null;
  let preset = null;
  let shuffle = false;
  let lang = 'ja';
  let mix = false;
  let passage = null;
  let mode = null; // 'passage' | 'q' | 'e'
  let cur = null;
  let qn = 0;
  let pn = 0;
  const err = (i, msg) => {
    throw new Error(`${path}:${i + 1}: ${msg}`);
  };
  const finishQ = (i) => {
    if (!cur) return;
    if (!cur.explanation) err(i, `解説がありません（${cur.question.slice(0, 20)}…）`);
    if (preset) {
      if (cur.answerKey === undefined) err(i, '正解（A: ）がありません');
      cur.choices = PRESETS[preset].slice();
      cur.answer = [cur.answerKey];
    } else if (cur.answer.length !== 1) err(i, `正解の選択肢（- *）が ${cur.answer.length} 個です`);
    delete cur.answerKey;
    questions.push(cur);
    cur = null;
  };
  const finishPassage = () => {
    if (passage) {
      passage.text = passage.text.replace(/\n{3,}/g, '\n\n').trim();
      passages.push(passage);
    }
    passage = null;
  };
  lines.forEach((raw, i) => {
    const line = raw.replace(/\s+$/, '');
    if (line.startsWith('//')) return;
    if (line.startsWith('@')) {
      const [key, ...rest] = line.slice(1).split(/\s+/);
      const v = rest.join(' ');
      if (key === 'domain') domain = v;
      else if (key === 'prefix') prefix = v;
      else if (key === 'choices') preset = v === 'none' ? null : v;
      else if (key === 'shuffle') shuffle = v === 'on';
      else if (key === 'lang') lang = v;
      else if (key === 'mix') mix = v === 'on';
      else err(i, `不明な指定 @${key}`);
      return;
    }
    if (line.startsWith('###')) {
      finishQ(i);
      finishPassage();
      const title = line.slice(3).trim();
      if (title === '-') {
        mode = null;
        return;
      }
      pn++;
      passage = { id: `${prefix}-p${String(pn).padStart(2, '0')}`, text: '' };
      if (title) passage.title = title;
      if (lang === 'en') passage.lang = 'en';
      mode = 'passage';
      return;
    }
    if (line.startsWith('Q:')) {
      finishQ(i);
      if (!domain || !prefix) err(i, '@domain と @prefix を先に書いてください');
      qn++;
      cur = { id: `${prefix}-${String(qn).padStart(2, '0')}`, domain, type: 'single', question: line.slice(2).trim(), choices: [], answer: [], explanation: '' };
      if (passage) cur.passage = passage.id;
      if (mix) cur.mix = true;
      if (shuffle && !preset) cur.shuffle = true;
      if (lang === 'en') cur.lang = 'en';
      mode = 'q';
      return;
    }
    if (line.startsWith('A:') && cur) {
      const k = line.slice(2).trim();
      const idx = 'ABC'.indexOf(k);
      if (k.length !== 1 || idx < 0) err(i, `正解は A・B・C のどれかで書いてください: ${k}`);
      cur.answerKey = idx;
      mode = null;
      return;
    }
    if (line.startsWith('- ') && cur) {
      let c = line.slice(2).trim();
      if (c.startsWith('*')) {
        c = c.slice(1).trim();
        cur.answer.push(cur.choices.length);
      }
      cur.choices.push(c);
      mode = null;
      return;
    }
    if (line.startsWith('E:') && cur) {
      cur.explanation = line.slice(2).trim();
      mode = 'e';
      return;
    }
    if (mode === 'passage') passage.text += `${line}\n`;
    else if (mode === 'q' && line) cur.question += `\n${line}`;
    else if (mode === 'e' && line) cur.explanation += `\n${line}`;
    else if (line) err(i, `どこに属するかわからない行です: ${line.slice(0, 30)}`);
  });
  finishQ(lines.length);
  finishPassage();
  // 本文ごとに問題の順番を混ぜる（種は本文 ID から決めるので、毎回同じ順になる）
  const out = [];
  for (let i = 0; i < questions.length; ) {
    const q = questions[i];
    let j = i + 1;
    while (j < questions.length && q.passage && questions[j].passage === q.passage) j++;
    const group = questions.slice(i, j);
    if (q.mix && q.passage) {
      const seed = [...q.passage].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
      out.push(...makeRng(seed).shuffle(group));
    } else out.push(...group);
    i = j;
  }
  for (const q of out) delete q.mix;
  return { passages, questions: out };
}
