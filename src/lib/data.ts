import certData from '../data/certs.json';
import glossaryData from '../data/glossary.json';
import type { Cert, GlossaryTerm, Passage, Question, QuizPayload, QuizQuestion, Step } from './types';

export const steps = certData.steps as Step[];
export const certs = (certData.certs as unknown as Cert[]).slice().sort((a, b) => a.step - b.step || a.order - b.order);
export const glossary = glossaryData as GlossaryTerm[];

/** 問題ファイル: src/data/questions/<科目>/<名前>.json（問題の配列か、{ passages, questions }） */
type QuestionFile = Question[] | { passages?: Passage[]; questions: Question[] };
const questionModules = import.meta.glob<{ default: QuestionFile }>('../data/questions/*/*.json', { eager: true });

const questionsByCert: Record<string, Question[]> = {};
const passagesByCert: Record<string, Record<string, Passage>> = {};
for (const [path, mod] of Object.entries(questionModules).sort(([a], [b]) => a.localeCompare(b))) {
  const id = path.split('/').slice(-2)[0];
  const file = mod.default;
  const list = Array.isArray(file) ? file : file.questions;
  (questionsByCert[id] ??= []).push(...list);
  if (!Array.isArray(file)) for (const p of file.passages ?? []) (passagesByCert[id] ??= {})[p.id] = p;
}

/** 画面に出す科目名 */
export function displayName(cert: Pick<Cert, 'name' | 'shortName'>): string {
  return cert.shortName ?? cert.name;
}

/** 科目の問題データ（/data/<科目>.json の中身） */
export function quizPayload(certId: string): QuizPayload {
  return { certId, questions: getQuestions(certId), passages: passagesByCert[certId] ?? {} };
}

/** 1 問あたりの目安の秒数（形式ごとの本番、なければ科目の本番から） */
export function secondsPerQuestion(cert: Cert, domainId?: string): number | null {
  const d = domainId ? cert.domains.find((x) => x.id === domainId) : undefined;
  const spec = d?.exam ?? (cert.exam.questions && cert.exam.minutes ? { questions: cert.exam.questions, minutes: cert.exam.minutes } : null);
  return spec ? Math.round((spec.minutes * 60 * 10) / spec.questions) / 10 : null;
}

/** 苦手判定や模擬試験の判定に使う基準（合格ライン、なければ目安） */
export function scoreLine(cert: Cert): { value: number; label: string } {
  if (cert.exam.passingScore !== null) return { value: cert.exam.passingScore, label: '合格ライン' };
  return { value: cert.exam.targetScore ?? 65, label: '目安' };
}

export function getCert(id: string): Cert | undefined {
  return certs.find((c) => c.id === id);
}

export function getQuestions(certId: string): QuizQuestion[] {
  return (questionsByCert[certId] ?? []).map((q) => ({ ...q, certId }));
}

export function getAllQuestions(): QuizQuestion[] {
  return certs.flatMap((c) => getQuestions(c.id));
}

/** ページのリンクに base を付ける */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return `${base}/${clean}`;
}

/** レッスンがある「資格/範囲」の一覧 */
export async function getLessonKeys(): Promise<Set<string>> {
  const { getCollection } = await import('astro:content');
  const lessons = await getCollection('lessons');
  return new Set(lessons.map((l) => `${l.data.cert}/${l.data.domain}`));
}

/** クライアントのスクリプトに渡す、資格の要約 */
export function certSummaries(lessonKeys: Set<string>) {
  return certs.map((c) => ({
    id: c.id,
    name: displayName(c),
    status: c.status,
    suggestedTarget: c.suggestedTarget ?? null,
    studyHours: c.study?.hours ?? null,
    format: c.exam.format,
    domains: c.domains.map((d) => ({ id: d.id, name: d.name, weight: d.weight, hours: domainStudyHours(c, d.id), exam: d.exam ?? null })),
    questions: getQuestions(c.id).map((q) => ({ id: q.id, domain: q.domain })),
    lessonDomains: c.domains.map((d) => d.id).filter((d) => lessonKeys.has(`${c.id}/${d}`)),
  }));
}

export type CertSummary = ReturnType<typeof certSummaries>[number];

/** 練習問題 1 問あたりの時間（回答と解説を読む時間、分） */
export const MINUTES_PER_QUESTION = 1;

/** 0.5 時間単位に丸める（最低 0.5 時間） */
export function roundHours(h: number): number {
  return Math.max(0.5, Math.round(h * 2) / 2);
}

/** 時間の表示（例: 1.5 → 「1.5 時間」、0.5 → 「30 分」） */
export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} 分`;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} 時間`;
}

/** 形式の学習時間の目安（科目の合計時間 × 割合。割合がなければ均等） */
export function domainStudyHours(cert: Cert, domainId: string): number | null {
  const total = cert.study?.hours;
  const d = cert.domains.find((x) => x.id === domainId);
  if (!total || !d) return null;
  const share = d.weight == null ? 100 / cert.domains.length : d.weight;
  return roundHours((total * share) / 100);
}

export interface LessonStats {
  /** レッスンを読む時間（分）。日本語はおよそ 1 分 500 文字 */
  readMinutes: number;
  /** 「やってみよう（N 分）」の合計（分） */
  handsOnMinutes: number;
}

/** レッスン本文から読む時間とハンズオンの時間を見積もる */
export function lessonStats(body: string): LessonStats {
  const readMinutes = Math.max(1, Math.round(body.replace(/```mermaid[\s\S]*?```|<svg[\s\S]*?<\/svg>/g, '').length / 500));
  let handsOnMinutes = 0;
  for (const m of body.matchAll(/やってみよう（[^）]*?(\d+)\s*分/g)) handsOnMinutes += Number(m[1]);
  return { readMinutes, handsOnMinutes };
}

/** 「資格/範囲」ごとのレッスンの見積もり */
export async function getLessonStats(): Promise<Map<string, LessonStats>> {
  const { getCollection } = await import('astro:content');
  const lessons = await getCollection('lessons');
  return new Map(lessons.map((l) => [`${l.data.cert}/${l.data.domain}`, lessonStats(l.body ?? '')]));
}

/** 範囲ごとの学習時間の内訳（このサイトの教材の分） */
export function domainBreakdown(cert: Cert, domainId: string, stats?: LessonStats) {
  const questions = getQuestions(cert.id).filter((q) => q.domain === domainId).length;
  // 問題が多い形式は、練習の目標（40 問）までを学習時間に数える
  const practiceMinutes = Math.round(Math.min(questions, 40) * MINUTES_PER_QUESTION);
  const siteMinutes = (stats?.readMinutes ?? 0) + (stats?.handsOnMinutes ?? 0) + practiceMinutes;
  const totalHours = domainStudyHours(cert, domainId);
  return {
    totalHours,
    readMinutes: stats?.readMinutes ?? 0,
    handsOnMinutes: stats?.handsOnMinutes ?? 0,
    questions,
    practiceMinutes,
    siteMinutes,
    /** 復習・公式教材・実務での練習に使う残りの時間（分） */
    otherMinutes: totalHours === null ? null : Math.max(0, Math.round(totalHours * 60 - siteMinutes)),
  };
}
