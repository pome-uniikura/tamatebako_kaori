/** テストのまとまり（玉手箱・TG-WEB 従来型 など） */
export interface Step {
  id: number;
  title: string;
  subtitle: string;
}

/** 本番の問題数と制限時間 */
export interface MockSpec {
  questions: number;
  minutes: number;
  /** 補足（例: 40 問・35 分の版もある） */
  note?: string;
}

/** 出題形式 */
export interface Domain {
  id: string;
  name: string;
  /** 補足の名前（例: GAB 形式） */
  nameEn: string;
  /** 科目の中での出題の割合（%）。科目の模擬試験で問題を選ぶときに使う。決まっていなければ null */
  weight: number | null;
  /** この形式だけで出題されるときの本番の問題数と時間 */
  exam?: MockSpec;
  /** この形式でよく出るパターン */
  objectives?: string[];
}

export interface ExamInfo {
  /** 科目全体の本番の問題数と時間（形式が混ざって出る科目）。形式ごとに分かれる科目は null */
  questions: number | null;
  minutes: number | null;
  /** 合格ラインは公表されていないので常に null */
  passingScore: number | null;
  passingNote?: string;
  /** 模擬試験や苦手判定に使う目安（%） */
  targetScore?: number;
  /** single: 形式のうち 1 つだけが出る / mixed: 形式が混ざって出る / none: 能力テストではない */
  format: 'single' | 'mixed' | 'none';
  /** 受検のしかたなどの表（電卓・受検場所など） */
  facts: { label: string; value: string }[];
  /** 情報の確認日（YYYY-MM-DD） */
  checkedAt: string;
  notes: string[];
}

export interface Cert {
  id: string;
  step: number;
  order: number;
  name: string;
  shortName?: string;
  summary: string;
  /** ready: 教材あり / outline: 概要のみ */
  status: 'ready' | 'outline';
  exam: ExamInfo;
  domains: Domain[];
  /** 学習時間の目安（時間）と前提 */
  study?: { hours: number; note: string };
  /** レッスンの読み上げ（聞く）を使えるか */
  listen?: boolean;
  suggestedTarget?: string;
  links: { label: string; url: string }[];
}

export interface TableFigure {
  kind: 'table';
  title?: string;
  /** 単位などの補足（例: 単位：百万円） */
  unit?: string;
  head: string[];
  rows: (string | number)[][];
  note?: string;
}

export interface ChartFigure {
  kind: 'bar' | 'line';
  title?: string;
  unit?: string;
  labels: string[];
  series: { name: string; values: number[] }[];
  note?: string;
}

export interface PieFigure {
  kind: 'pie';
  title?: string;
  unit?: string;
  labels: string[];
  values: number[];
  note?: string;
}

export interface SvgFigure {
  kind: 'svg';
  title?: string;
  unit?: string;
  /** 信頼できる教材データの SVG 文字列 */
  svg: string;
  alt: string;
  note?: string;
}

export type Figure = TableFigure | ChartFigure | PieFigure | SvgFigure;

/** 複数の問題で共通に使う本文や図表 */
export interface Passage {
  id: string;
  title?: string;
  /** 本文。空行で段落を分ける */
  text?: string;
  figure?: Figure;
  lang?: 'ja' | 'en';
}

export interface Question {
  id: string;
  domain: string;
  type: 'single' | 'multi';
  question: string;
  choices: string[];
  /** 正解の選択肢インデックス（0 始まり） */
  answer: number[];
  explanation: string;
  /** 共通の本文・図表の ID */
  passage?: string;
  /** この問題だけの図表 */
  figure?: Figure;
  /** 選択肢を並べ替えて出すか（数値の選択肢や A/B/C 形式は並べ替えない） */
  shuffle?: boolean;
  /** 英語の問題 */
  lang?: 'ja' | 'en';
  refs?: string[];
}

/** クライアントに渡す問題（科目 ID 付き） */
export interface QuizQuestion extends Question {
  certId: string;
}

/** 科目ごとの問題データ（/data/<科目>.json） */
export interface QuizPayload {
  certId: string;
  questions: QuizQuestion[];
  passages: Record<string, Passage>;
}

export interface GlossaryTerm {
  term: string;
  reading?: string;
  description: string;
  certs: string[];
  tags?: string[];
}
