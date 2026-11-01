import type { CertSummary } from './data';
import type { ProgressData } from './storage';

/** 形式ごとの練習の目標（一度でも正解した問題数）。問題がこれより多い形式は、ここまでで「練習済み」とする */
export const PRACTICE_GOAL = 40;

export interface CertProgress {
  lessonsDone: number;
  lessonsTotal: number;
  /** 一度でも正解した問題数（形式ごとに目標の数まで） */
  mastered: number;
  /** 練習の目標の問題数（形式ごとに最大 PRACTICE_GOAL 問） */
  questionsTotal: number;
  reviewCount: number;
  percent: number;
}

export function certProgress(cert: CertSummary, data: ProgressData, domainId?: string): CertProgress {
  const lessonDomains = domainId ? cert.lessonDomains.filter((d) => d === domainId) : cert.lessonDomains;
  const lessonsDone = lessonDomains.filter((d) => data.lessons[`${cert.id}/${d}`]).length;
  let mastered = 0;
  let questionsTotal = 0;
  let reviewCount = 0;
  for (const d of cert.domains) {
    if (domainId && d.id !== domainId) continue;
    const qIds = cert.questions.filter((q) => q.domain === d.id).map((q) => q.id);
    let m = 0;
    for (const id of qIds) {
      const s = data.questions[id];
      if (s && s.correct > 0) m++;
      if (s?.inReview) reviewCount++;
    }
    const goal = Math.min(qIds.length, PRACTICE_GOAL);
    mastered += Math.min(m, goal);
    questionsTotal += goal;
  }
  const total = lessonDomains.length + questionsTotal;
  return {
    lessonsDone,
    lessonsTotal: lessonDomains.length,
    mastered,
    questionsTotal,
    reviewCount,
    percent: total === 0 ? 0 : Math.round(((lessonsDone + mastered) / total) * 100),
  };
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function readJson<T>(id: string): T {
  const el = document.getElementById(id);
  return JSON.parse(el?.textContent ?? 'null') as T;
}

/** 「あと N 日」「N 日超過」の表示 */
export function daysLabel(days: number): string {
  if (days > 0) return `あと ${days} 日`;
  if (days === 0) return '今日';
  return `${-days} 日超過`;
}

/** 連続して学習した日数と、今日の学習量 */
export function studyStreak(activity: Record<string, number>, now = new Date()): { streak: number; today: number } {
  const key = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const day = new Date(now);
  const today = activity[key(day)] ?? 0;
  // 今日まだ学習していなくても、昨日までの連続は途切れていない扱いにする
  if (!today) day.setDate(day.getDate() - 1);
  let streak = 0;
  while ((activity[key(day)] ?? 0) > 0) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return { streak, today };
}

/** 受験目標日までのペース（残りの学習時間は進み具合で減らす） */
export function paceText(studyHours: number | null, percent: number, daysLeft: number): string {
  if (!studyHours || daysLeft <= 0) return '';
  const remaining = (studyHours * (100 - percent)) / 100;
  if (remaining <= 0) return '学習の目安時間をこなしました。模擬試験で仕上げましょう。';
  const perDay = Math.ceil((remaining * 60) / daysLeft / 5) * 5;
  return `残り約 ${Math.round(remaining)} 時間。1 日あたり約 ${perDay} 分のペースです。`;
}

export interface DomainAccuracy {
  /** 一度でも解いた問題数 */
  answered: number;
  /** 直近の回答が正解だった問題数 */
  lastCorrect: number;
  /** 正答率（%）。解いた問題がなければ null */
  rate: number | null;
}

/** 範囲ごとの正答率（各問題の直近の回答で数える） */
export function domainAccuracy(cert: CertSummary, data: ProgressData, domainId: string): DomainAccuracy {
  let answered = 0;
  let lastCorrect = 0;
  for (const q of cert.questions) {
    if (q.domain !== domainId) continue;
    const s = data.questions[q.id];
    if (!s) continue;
    answered++;
    if (s.last) lastCorrect++;
  }
  return { answered, lastCorrect, rate: answered ? Math.round((lastCorrect / answered) * 100) : null };
}

/** 苦手な形式: 5 問以上解いて、正答率が基準（合格ラインか目安）に届いていない範囲（低い順） */
export function weakDomains(cert: CertSummary, data: ProgressData, line: number) {
  return cert.domains
    .map((d) => ({ ...d, acc: domainAccuracy(cert, data, d.id) }))
    .filter((d) => d.acc.answered >= 5 && d.acc.rate !== null && d.acc.rate < line)
    .sort((a, b) => a.acc.rate! - b.acc.rate!);
}

export interface NextAction {
  label: string;
  href: string;
  /** 補足（例: 前回の続き） */
  note?: string;
}

/** 科目で次にやること（未読のレッスン → 練習問題 → 本番形式） */
export function nextAction(cert: CertSummary, data: ProgressData, base: string): NextAction | null {
  const domainName = (id: string) => cert.domains.find((d) => d.id === id)?.name ?? id;
  const unread = cert.lessonDomains.find((d) => !data.lessons[`${cert.id}/${d}`]);
  if (unread) return { label: `レッスンを読む: ${domainName(unread)}`, href: `${base}/certs/${cert.id}/${unread}/` };
  const p = certProgress(cert, data);
  if (p.mastered < p.questionsTotal) {
    // 練習の目標まで残りが多い形式から
    const domain = cert.domains
      .map((d) => {
        const dp = certProgress(cert, data, d.id);
        return { id: d.id, left: dp.questionsTotal - dp.mastered };
      })
      .sort((a, b) => b.left - a.left)[0];
    return { label: `練習問題: ${domainName(domain.id)}`, href: `${base}/certs/${cert.id}/quiz/?domain=${domain.id}` };
  }
  if (p.questionsTotal > 0 && cert.format === 'mixed') return { label: '本番形式で解く', href: `${base}/certs/${cert.id}/quiz/?mode=mock` };
  if (p.questionsTotal > 0 && cert.format === 'single') {
    // まだ本番形式で解いていない形式から
    const d = cert.domains.find((x) => x.exam && !data.mocks.some((m) => m.certId === cert.id && m.domain === x.id)) ?? cert.domains.find((x) => x.exam);
    if (d) return { label: `本番形式で解く: ${d.name}`, href: `${base}/certs/${cert.id}/quiz/?mode=mock&domain=${d.id}` };
  }
  return null;
}
