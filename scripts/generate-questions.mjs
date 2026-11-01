// 計算問題・図表問題・TG-WEB の図形などを自動で作る（npm run generate）
// 乱数の種を固定しているので、何度実行しても同じ問題になる（問題 ID も変わらない）。
// 手で書いた問題は別のファイル（*-manual.json など）に置き、このスクリプトでは上書きしない。
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { idMaker, makeRng } from './gen/lib.mjs';
import { genShisoku } from './gen/shisoku.mjs';
import { genZuhyo } from './gen/zuhyo.mjs';
import { genKuuran } from './gen/kuuran.mjs';
import { genKeisan } from './gen/keisan.mjs';
import { genAngou, genDice, genHitofude, genShugo, genSuiron, genTenkai } from './gen/tgweb.mjs';

const root = new URL('..', import.meta.url).pathname;
const qDir = join(root, 'src/data/questions');

/** 日本語と英数字の間に半角スペースを入れる（サイト全体の表記に合わせる） */
const space = (s) =>
  s.replace(/([぀-ヿ一-鿿])([A-Za-z0-9])/g, '$1 $2').replace(/([A-Za-z0-9%])([぀-ゟ一-鿿])/g, '$1 $2');
const tidy = (q) => ({ ...q, question: space(q.question), explanation: space(q.explanation) });

function write(cert, name, data) {
  mkdirSync(join(qDir, cert), { recursive: true });
  const body = Array.isArray(data) ? data.map(tidy) : { passages: data.passages, questions: data.questions.map(tidy) };
  writeFileSync(join(qDir, cert, `${name}.json`), `${JSON.stringify(body, null, 1)}\n`);
  const n = Array.isArray(data) ? data.length : data.questions.length;
  console.log(`${cert}/${name}.json: ${n} 問`);
}

// はじめに: 計算の基礎
write('guide', 'keisan-generated', genKeisan(makeRng(101), { count: 80, id: idMaker('gd-keisan'), domain: 'keisan' }));

// 玉手箱 計数
write('tamatebako-keisu', 'shisoku-generated', genShisoku(makeRng(201), { count: 300, id: idMaker('tbk-shisoku'), domain: 'shisoku' }));
write(
  'tamatebako-keisu',
  'zuhyo-generated',
  genZuhyo(makeRng(202), {
    count: 180,
    id: idMaker('tbk-zuhyo'),
    passageId: idMaker('tbk-zuhyo-fig'),
    domain: 'zuhyo',
    weights: { trend: 4, share: 3, bar: 2, pie: 2, product: 2, density: 1 },
  }),
);
write('tamatebako-keisu', 'kuuran-generated', genKuuran(makeRng(203), { count: 120, id: idMaker('tbk-kuuran'), domain: 'kuuran', weights: { product: 3, linear: 2, ratio: 2, growth: 2, work: 2, scale: 1 } }));

// TG-WEB 新型 計数（4 択・やさしめ）
write('tgweb-new-keisu', 'shisoku-generated', genShisoku(makeRng(301), { count: 150, id: idMaker('tnk-shisoku'), domain: 'shisoku', easy: true, nChoices: 4 }));
write(
  'tgweb-new-keisu',
  'zuhyo-generated',
  genZuhyo(makeRng(302), {
    count: 120,
    id: idMaker('tnk-zuhyo'),
    passageId: idMaker('tnk-zuhyo-fig'),
    domain: 'zuhyo',
    weights: { trend: 2, bar: 2, pie: 2, product: 2 },
    nChoices: 4,
  }),
);

// TG-WEB 従来型 計数
write('tgweb-keisu', 'angou-generated', genAngou(makeRng(401), { count: 40, id: idMaker('tgk-angou'), domain: 'angou' }));
write('tgweb-keisu', 'shugo-generated', genShugo(makeRng(402), { count: 60, id: idMaker('tgk-shugo'), domain: 'shugo' }));
write('tgweb-keisu', 'suiron-generated', genSuiron(makeRng(403), { count: 50, id: idMaker('tgk-suiron'), domain: 'suiron' }));
write('tgweb-keisu', 'zukei-generated', [
  ...genTenkai(makeRng(404), { count: 30, id: idMaker('tgk-tenkai'), domain: 'zukei' }),
  ...genHitofude(makeRng(405), { count: 24, id: idMaker('tgk-hitofude'), domain: 'zukei' }),
  ...genDice(makeRng(406), { count: 16, id: idMaker('tgk-dice'), domain: 'zukei' }),
]);
