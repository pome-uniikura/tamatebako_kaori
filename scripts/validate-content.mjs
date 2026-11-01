// 教材データの整合性チェック（npm run validate）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const { certs, steps } = JSON.parse(readFileSync(join(root, 'src/data/certs.json'), 'utf8'));
const errors = [];
const warnings = [];
const certById = new Map(certs.map((c) => [c.id, c]));
const stepIds = new Set(steps.map((s) => s.id));

for (const c of certs) {
  if (!stepIds.has(c.step)) errors.push(`${c.id}: STEP ${c.step} がありません`);
  if (c.exam.format === 'mixed') {
    const weights = c.domains.map((d) => d.weight);
    if (weights.some((w) => w === null)) errors.push(`${c.id}: 形式が混ざる科目は、全形式に割合（weight）が必要です`);
    else if (weights.reduce((a, b) => a + b, 0) !== 100) errors.push(`${c.id}: 割合の合計が 100% ではありません`);
    if (!c.exam.questions || !c.exam.minutes) errors.push(`${c.id}: 形式が混ざる科目は、科目の問題数と時間が必要です`);
  }
  if (c.exam.format === 'single' && c.domains.some((d) => !d.exam)) errors.push(`${c.id}: 形式ごとに出る科目は、全形式に本番の問題数と時間が必要です`);
}

const seen = new Set();
const prefixOf = new Map();
const passageIds = new Set();
const qDir = join(root, 'src/data/questions');
const counts = {};
const answerPos = {};
for (const certId of existsSync(qDir) ? readdirSync(qDir) : []) {
  const cert = certById.get(certId);
  if (!cert) {
    errors.push(`questions/${certId}: 科目 ${certId} が certs.json にありません`);
    continue;
  }
  const domainIds = new Set(cert.domains.map((d) => d.id));
  const localPassages = new Map();
  const questions = [];
  for (const file of readdirSync(join(qDir, certId)).filter((f) => f.endsWith('.json'))) {
    const raw = JSON.parse(readFileSync(join(qDir, certId, file), 'utf8'));
    const list = Array.isArray(raw) ? raw : raw.questions;
    for (const p of Array.isArray(raw) ? [] : (raw.passages ?? [])) {
      if (passageIds.has(p.id)) errors.push(`${certId}/${file} 本文 ${p.id}: ID が重複しています`);
      passageIds.add(p.id);
      localPassages.set(p.id, p);
      if (!p.text && !p.figure) errors.push(`${certId}/${file} 本文 ${p.id}: 本文も図表もありません`);
    }
    for (const q of list) questions.push({ q, where: `${certId}/${file} ${q.id}` });
  }
  const used = new Set();
  for (const { q, where } of questions) {
    if (seen.has(q.id)) errors.push(`${where}: ID が重複しています`);
    seen.add(q.id);
    const prefix = q.id.split('-')[0];
    if (!prefixOf.has(certId)) prefixOf.set(certId, prefix);
    if (prefixOf.get(certId) !== prefix) errors.push(`${where}: ID の先頭が ${prefixOf.get(certId)}- ではありません（復習ページで科目を見分けるのに使う）`);
    if (!domainIds.has(q.domain)) errors.push(`${where}: 形式 ${q.domain} がありません`);
    if (!q.question || !q.explanation) errors.push(`${where}: 問題文か解説が空です`);
    if (!Array.isArray(q.choices) || q.choices.length < 2) errors.push(`${where}: 選択肢が足りません`);
    else if (new Set(q.choices).size !== q.choices.length) errors.push(`${where}: 選択肢が重複しています`);
    if (!q.answer?.length || q.answer.some((a) => a < 0 || a >= q.choices.length)) errors.push(`${where}: 正解の番号が不正です`);
    if (q.type === 'single' && q.answer.length !== 1) errors.push(`${where}: single なのに正解が ${q.answer.length} 個です`);
    if (q.type === 'multi' && q.answer.length < 2) errors.push(`${where}: multi なのに正解が 1 個です`);
    if (q.passage) {
      if (!localPassages.has(q.passage)) errors.push(`${where}: 本文 ${q.passage} がこの科目にありません`);
      used.add(q.passage);
    }
    const key = `${certId}/${q.domain}`;
    counts[key] = (counts[key] ?? 0) + 1;
    if (q.type === 'single' && !q.shuffle) {
      answerPos[key] ??= {};
      answerPos[key][q.answer[0]] = (answerPos[key][q.answer[0]] ?? 0) + 1;
    }
  }
  for (const id of localPassages.keys()) if (!used.has(id)) warnings.push(`${certId}: 本文 ${id} を使う問題がありません`);
}
// 科目どうしで ID の先頭がかぶると、復習ページで科目を取り違える
const prefixes = [...prefixOf.values()];
if (new Set(prefixes).size !== prefixes.length) errors.push(`科目どうしで問題 ID の先頭が重複しています: ${prefixes.join(', ')}`);

// 本番形式に足りる問題数か
for (const c of certs) {
  for (const d of c.domains) {
    const n = counts[`${c.id}/${d.id}`] ?? 0;
    if (d.exam && n > 0 && n < d.exam.questions) warnings.push(`${c.id}/${d.id}: 問題 ${n} 問は本番の ${d.exam.questions} 問より少ないです`);
  }
}

const lessonDir = join(root, 'src/content/lessons');
for (const certId of existsSync(lessonDir) ? readdirSync(lessonDir) : []) {
  const cert = certById.get(certId);
  for (const file of readdirSync(join(lessonDir, certId))) {
    const text = readFileSync(join(lessonDir, certId, file), 'utf8');
    const cm = text.match(/^cert:\s*(.+)$/m)?.[1].trim();
    const dm = text.match(/^domain:\s*(.+)$/m)?.[1].trim();
    if (cm !== certId) errors.push(`lessons/${certId}/${file}: cert が ${cm} です`);
    if (!cert?.domains.some((d) => d.id === dm)) errors.push(`lessons/${certId}/${file}: 形式 ${dm} がありません`);
  }
}

if (process.argv.includes('--stats')) {
  console.log('形式ごとの問題数:');
  for (const [k, v] of Object.entries(counts)) {
    const pos = answerPos[k] ? Object.entries(answerPos[k]).map(([p, n]) => `${String.fromCharCode(65 + Number(p))}:${n}`).join(' ') : '';
    console.log(`  ${k}: ${v} 問  正解の位置 ${pos}`);
  }
}
if (warnings.length) console.warn(warnings.map((w) => `注意: ${w}`).join('\n'));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`OK: 科目 ${certs.length} 件、問題 ${seen.size} 問、本文 ${passageIds.size} 件`);
