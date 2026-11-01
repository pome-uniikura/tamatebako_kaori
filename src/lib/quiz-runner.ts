import type { Passage, QuizQuestion } from './types';
import { addMockResult, recordAnswer } from './storage';
import { renderFigure } from './figures';

export interface DomainInfo {
  id: string;
  name: string;
  weight: number | null;
  /** 1 問あたりの目安の秒数 */
  seconds?: number | null;
}

export interface QuizOptions {
  root: HTMLElement;
  questions: QuizQuestion[];
  passages: Record<string, Passage>;
  mode: 'practice' | 'mock';
  title: string;
  domains: DomainInfo[];
  /** 模擬試験の設定 */
  mock?: { certId: string; domain?: string; minutes: number; passingScore: number | null; scoreLabel?: string };
  /** 練習で問題の順番を混ぜるか（初期値 true） */
  shuffle?: boolean;
  /** 終了画面に出す「戻る」リンク */
  backHref: string;
  backLabel: string;
}

interface Item {
  q: QuizQuestion;
  /** 表示順 → 元の選択肢インデックス */
  order: number[];
  selected: Set<number>;
  submitted: boolean;
  flagged: boolean;
  /** 練習で、この問題を表示した時刻と回答にかかった秒数 */
  shownAt?: number;
  seconds?: number;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 同じ本文の問題をひとまとまりにする（本文の中の順番は保つ） */
export function units(questions: QuizQuestion[]): QuizQuestion[][] {
  const byPassage = new Map<string, QuizQuestion[]>();
  const list: QuizQuestion[][] = [];
  for (const q of questions) {
    if (!q.passage) {
      list.push([q]);
      continue;
    }
    let group = byPassage.get(q.passage);
    if (!group) {
      group = [];
      byPassage.set(q.passage, group);
      list.push(group);
    }
    group.push(q);
  }
  return list;
}

/** 本文ごとのまとまりを保ったまま順番を混ぜる */
export function arrange(questions: QuizQuestion[], mix = true): QuizQuestion[] {
  const u = units(questions);
  return (mix ? shuffle(u) : u).flat();
}

/**
 * 練習の 1 回分を選ぶ。まだ解いていない問題 → 前回まちがえた問題 → 正解した問題 の順に優先する。
 * 本文のまとまりは崩さない。
 */
export function pickPractice(pool: QuizQuestion[], count: number, stats: Record<string, { last: boolean } | undefined>): QuizQuestion[] {
  if (pool.length <= count * 1.5) return pool;
  const rank = (q: QuizQuestion) => {
    const s = stats[q.id];
    return !s ? 0 : s.last ? 2 : 1;
  };
  const scored = shuffle(units(pool)).map((u) => ({ u, r: Math.min(...u.map(rank)) }));
  scored.sort((a, b) => a.r - b.r);
  const picked: QuizQuestion[][] = [];
  let n = 0;
  for (const { u } of scored) {
    if (n >= count) break;
    picked.push(u);
    n += u.length;
  }
  return picked.flat();
}

/** 割合に合わせて形式ごとに問題を選ぶ（本文のまとまりは崩さない） */
export function pickMockQuestions(all: QuizQuestion[], domains: DomainInfo[], count: number): QuizQuestion[] {
  if (all.length <= count) return arrange(all);
  const totalWeight = domains.reduce((s, d) => s + (d.weight ?? 0), 0);
  const picked: QuizQuestion[][] = [];
  let pickedCount = 0;
  const used = new Set<QuizQuestion[]>();
  const allUnits = units(all);
  for (const d of domains) {
    const pool = shuffle(allUnits.filter((u) => u[0].domain === d.id));
    const want = totalWeight ? Math.round((count * (d.weight ?? 0)) / totalWeight) : Math.round(count / domains.length);
    let got = 0;
    for (const u of pool) {
      if (got >= want || pickedCount + u.length > count) break;
      picked.push(u);
      used.add(u);
      got += u.length;
      pickedCount += u.length;
    }
  }
  // 端数の調整
  for (const u of shuffle(allUnits)) {
    if (pickedCount >= count) break;
    if (used.has(u) || pickedCount + u.length > count) continue;
    picked.push(u);
    pickedCount += u.length;
  }
  return shuffle(picked).flat();
}

const isCorrect = (item: Item) =>
  item.selected.size === item.q.answer.length && item.q.answer.every((a) => item.selected.has(a));

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

/** 教材データの HTML（図表）を要素にする */
function html(markup: string): HTMLElement {
  const box = document.createElement('div');
  box.innerHTML = markup;
  return box.firstElementChild as HTMLElement;
}

/** 本文（段落）と図表 */
function passageBlock(p: Passage | undefined, open = true): HTMLElement | null {
  if (!p) return null;
  const body = el('div', { class: 'passage-body' });
  if (p.title) body.append(el('p', { class: 'passage-title' }, p.title));
  for (const para of (p.text ?? '').split(/\n{2,}/).filter((s) => s.trim())) body.append(el('p', {}, para.trim()));
  if (p.figure) body.append(html(renderFigure(p.figure)));
  const box = el('details', { class: 'passage', lang: p.lang ?? 'ja' }, el('summary', { lang: 'ja' }, p.text ? '本文' : '図表'), body);
  (box as HTMLDetailsElement).open = open;
  return box;
}

function fmtSec(sec: number): string {
  return sec >= 60 ? `${Math.floor(sec / 60)}分${String(Math.round(sec % 60)).padStart(2, '0')}秒` : `${Math.round(sec)}秒`;
}

/** キーボード操作の受け口（runQuiz を呼び直したときに古いものを外す） */
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let tickTimer: number | undefined;

export function runQuiz(opts: QuizOptions): void {
  const { root, mode } = opts;
  const domainOf = (id: string) => opts.domains.find((d) => d.id === id);
  const domainName = (id: string) => domainOf(id)?.name ?? id;
  const target = (q: QuizQuestion) => domainOf(q.domain)?.seconds ?? null;
  let items: Item[] = [];
  let index = 0;
  let startedAt = Date.now();
  let finished = false;
  let lastPassage: string | undefined;

  function start(questions: QuizQuestion[]) {
    const list = mode === 'mock' ? questions : arrange(questions, opts.shuffle !== false);
    items = list.map((q) => ({
      q,
      order: q.shuffle ? shuffle(q.choices.map((_, i) => i)) : q.choices.map((_, i) => i),
      selected: new Set<number>(),
      submitted: false,
      flagged: false,
    }));
    index = 0;
    startedAt = Date.now();
    finished = false;
    lastPassage = undefined;
    startTicking();
    if (mode === 'mock') {
      window.addEventListener('beforeunload', (e) => {
        if (!finished) e.preventDefault();
      });
    }
    renderQuestion();
  }

  /** 1 秒ごとの更新（模擬試験の残り時間とペース、練習のストップウォッチ） */
  function startTicking() {
    window.clearInterval(tickTimer);
    const tick = () => {
      if (finished) return;
      if (mode === 'mock') {
        const limit = (opts.mock?.minutes ?? 10) * 60;
        const elapsed = (Date.now() - startedAt) / 1000;
        const left = Math.ceil(limit - elapsed);
        const t = root.querySelector('[data-timer]');
        if (t) {
          const m = Math.max(0, Math.floor(left / 60));
          const s = Math.max(0, left % 60);
          t.textContent = `残り ${m}:${String(s).padStart(2, '0')}`;
          t.classList.toggle('timer-warn', left <= Math.min(60, limit * 0.15));
        }
        const pace = root.querySelector('[data-pace]');
        if (pace) {
          const answered = items.filter((i) => i.selected.size > 0).length;
          const expected = Math.min(items.length, Math.floor((elapsed / limit) * items.length));
          const diff = answered - expected;
          pace.textContent = diff >= 0 ? `目安ペース +${diff} 問` : `目安ペース ${diff} 問`;
          pace.classList.toggle('pace-behind', diff < -1);
        }
        if (left <= 0) finishMock(true);
      } else {
        const item = items[index];
        const sw = root.querySelector('[data-stopwatch]');
        if (!item || !sw || item.submitted || item.shownAt === undefined) return;
        const sec = (Date.now() - item.shownAt) / 1000;
        const goal = target(item.q);
        sw.textContent = goal ? `${fmtSec(sec)}（目安 ${fmtSec(goal)}）` : fmtSec(sec);
        sw.classList.toggle('timer-warn', goal !== null && sec > goal);
      }
    };
    tick();
    tickTimer = window.setInterval(tick, 1000);
  }

  function header() {
    const answered = items.filter((i) => (mode === 'mock' ? i.selected.size > 0 : i.submitted)).length;
    const correct = items.filter((i) => i.submitted && isCorrect(i)).length;
    const status =
      mode === 'mock' ? `問題 ${index + 1} / ${items.length} ・ 回答済み ${answered}` : `問題 ${index + 1} / ${items.length} ・ 正解 ${correct} / ${answered}`;
    const bar = el('span');
    bar.style.width = `${(answered / items.length) * 100}%`;
    const item = items[index];
    const side =
      mode === 'mock'
        ? el('div', { class: 'timer-box' }, el('span', { class: 'timer', 'data-timer': '', 'aria-live': 'off' }, ''), el('span', { class: 'pace small', 'data-pace': '' }, ''))
        : item && !item.submitted
          ? el('span', { class: 'timer stopwatch', 'data-stopwatch': '', 'aria-live': 'off', title: 'この問題にかけている時間' }, '')
          : item?.seconds !== undefined
            ? el('span', { class: 'timer stopwatch' }, fmtSec(item.seconds))
            : null;
    return el(
      'div',
      { class: 'quiz-header' },
      el('div', { class: 'quiz-header-row' }, el('div', {}, el('p', { class: 'quiz-title' }, opts.title), el('p', { class: 'small muted' }, status)), side),
      el('div', { class: 'progress', 'aria-hidden': 'true' }, bar),
    );
  }

  function renderQuestion() {
    const item = items[index];
    const { q } = item;
    const showResult = mode === 'practice' && item.submitted;
    const inputType = q.type === 'multi' ? 'checkbox' : 'radio';
    if (mode === 'practice' && !item.submitted) item.shownAt ??= Date.now();

    const compact = q.choices.every((c) => c.length <= 10);
    const choices = el('div', { class: `choices${compact ? ' choices-compact' : ''}`, role: q.type === 'multi' ? 'group' : 'radiogroup' });
    item.order.forEach((orig, pos) => {
      const id = `c-${pos}`;
      const input = el('input', { type: inputType, name: 'choice', id, value: String(orig) }) as HTMLInputElement;
      input.checked = item.selected.has(orig);
      input.disabled = showResult;
      input.addEventListener('change', () => {
        if (q.type === 'single') item.selected = new Set([orig]);
        else if (input.checked) item.selected.add(orig);
        else item.selected.delete(orig);
        updateButtons();
        if (mode === 'mock') renderPalette();
      });
      let state = '';
      if (showResult) {
        if (q.answer.includes(orig)) state = ' is-correct';
        else if (item.selected.has(orig)) state = ' is-wrong';
      }
      choices.append(
        el(
          'label',
          { class: `choice${state}`, for: id },
          input,
          el('span', { class: 'choice-key' }, String.fromCharCode(65 + pos)),
          el('span', { lang: q.lang ?? 'ja' }, q.choices[orig]),
        ),
      );
    });

    const passage = q.passage ? opts.passages[q.passage] : undefined;
    const samePassage = Boolean(q.passage) && q.passage === lastPassage;
    lastPassage = q.passage;
    const groupInfo = (() => {
      if (!q.passage) return null;
      const group = items.filter((i) => i.q.passage === q.passage);
      return group.length > 1 ? `この本文の ${group.indexOf(item) + 1} / ${group.length} 問目` : null;
    })();

    const body = el(
      'div',
      { class: 'card quiz-card' },
      el(
        'p',
        { class: 'quiz-meta small muted' },
        el('span', {}, domainName(q.domain)),
        groupInfo ? el('span', {}, `・ ${groupInfo}`) : null,
        q.type === 'multi' ? el('span', { class: 'tag tag-accent' }, `${q.answer.length} つ選択`) : null,
      ),
      passageBlock(passage),
      q.figure ? html(renderFigure(q.figure)) : null,
      el('p', { class: 'question', id: 'question-text', lang: q.lang ?? 'ja' }, q.question),
      choices,
    );
    choices.setAttribute('aria-labelledby', 'question-text');

    if (showResult) {
      const ok = isCorrect(item);
      const correctLabels = item.order
        .map((orig, pos) => (q.answer.includes(orig) ? String.fromCharCode(65 + pos) : null))
        .filter(Boolean)
        .join('・');
      const goal = target(q);
      const timeNote =
        item.seconds !== undefined ? el('p', { class: 'small muted' }, `回答時間 ${fmtSec(item.seconds)}${goal ? `（本番の目安 ${fmtSec(goal)}）` : ''}`) : null;
      body.append(
        el(
          'div',
          { class: `feedback ${ok ? 'ok' : 'ng'}`, role: 'status' },
          el('p', { class: 'feedback-title' }, ok ? '正解！' : `不正解　正解は ${correctLabels}`),
          el('p', { class: 'explanation' }, q.explanation),
          timeNote,
        ),
      );
    }

    const actions = el('div', { class: 'quiz-actions' });
    if (mode === 'practice') {
      if (!item.submitted) {
        const submit = el('button', { class: 'btn btn-primary', type: 'button', 'data-submit': '' }, '回答する');
        submit.addEventListener('click', () => {
          item.submitted = true;
          if (item.shownAt !== undefined) item.seconds = Math.round((Date.now() - item.shownAt) / 1000);
          recordAnswer(q.id, isCorrect(item));
          renderQuestion();
          // 解説と「次の問題」ボタンが画面の外にあるときは見える位置まで送る
          root.querySelector<HTMLElement>('.quiz-actions')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          root.querySelector<HTMLElement>('[data-next]')?.focus({ preventScroll: true });
        });
        actions.append(submit);
      } else {
        const last = index === items.length - 1;
        const nextBtn = el('button', { class: 'btn btn-primary', type: 'button', 'data-next': '' }, last ? '結果を見る' : '次の問題 →');
        nextBtn.addEventListener('click', () => {
          if (last) showPracticeResult();
          else {
            index++;
            renderQuestion();
            scrollToTop();
          }
        });
        actions.append(nextBtn);
      }
      // 途中でやめても、それまでの結果を見られるようにする
      const answered = items.filter((i) => i.submitted).length;
      if (answered > 0 && index < items.length - 1) {
        const stop = el('button', { class: 'btn btn-ghost', type: 'button' }, 'ここで終了して結果を見る');
        stop.addEventListener('click', showPracticeResult);
        actions.prepend(stop);
      }
    } else {
      const prevBtn = el('button', { class: 'btn', type: 'button' }, '← 前へ');
      prevBtn.disabled = index === 0;
      prevBtn.addEventListener('click', () => {
        index--;
        renderQuestion();
      });
      const flag = el('button', { class: `btn${item.flagged ? ' is-flagged' : ''}`, type: 'button' }, item.flagged ? '★ 見直し' : '☆ 見直し');
      flag.addEventListener('click', () => {
        item.flagged = !item.flagged;
        renderQuestion();
      });
      const nextBtn = el('button', { class: 'btn', type: 'button', 'data-next': '' }, '次へ →');
      nextBtn.disabled = index === items.length - 1;
      nextBtn.addEventListener('click', () => {
        index++;
        renderQuestion();
        scrollToTop();
      });
      const finish = el('button', { class: 'btn btn-primary', type: 'button' }, '見直し画面へ');
      finish.addEventListener('click', renderReviewScreen);
      actions.append(prevBtn, flag, nextBtn, finish);
    }

    root.replaceChildren(header(), body, actions);
    if (mode === 'mock') {
      root.append(el('div', { class: 'palette', 'data-palette': '' }));
      renderPalette();
    }
    root.append(
      el(
        'p',
        { class: 'kbd-hint small muted' },
        'キーボード: ',
        el('kbd', {}, '1'),
        '〜',
        el('kbd', {}, String(Math.min(9, item.order.length))),
        ' で選択、',
        el('kbd', {}, 'Enter'),
        mode === 'mock' ? ' で次の問題' : ' で回答・次の問題',
      ),
    );
    updateButtons();
    // 表示を切り替えた直後に時間の表示を合わせる
    if (!finished) {
      const t = root.querySelector('[data-timer], [data-stopwatch]');
      if (t && !t.textContent) startTicking();
    }
    // 同じ本文の続きの問題では、本文を読み直す必要が少ないので問題の位置へ送る
    if (samePassage && mode === 'practice') root.querySelector('#question-text')?.scrollIntoView({ block: 'nearest' });
  }

  /** 次の問題に進んだとき、問題文が画面の上に隠れていれば戻す */
  function scrollToTop() {
    if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start' });
  }

  function onKey(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey || finished) return;
    const target = e.target as HTMLElement;
    if (target.closest('input[type="text"], input[type="search"], input[type="date"], textarea, select, dialog')) return;
    const item = items[index];
    if (!item || !root.querySelector('.quiz-card')) return;
    const pos = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1;
    if (pos >= 0 && pos < item.order.length) {
      const input = root.querySelector<HTMLInputElement>(`#c-${pos}`);
      if (!input || input.disabled) return;
      e.preventDefault();
      input.click();
      input.focus({ preventScroll: true });
      return;
    }
    // ボタンやリンクの上の Enter は、そのボタン自体の動作に任せる
    if (e.key === 'Enter' && !target.closest('button, a, summary')) {
      const btn = root.querySelector<HTMLButtonElement>('[data-submit]:not([disabled]), [data-next]:not([disabled])');
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    }
  }

  /** 本番の試験と同じく、採点前に全問の回答状況を一覧で確認する画面 */
  function renderReviewScreen() {
    const unanswered = items.filter((i) => i.selected.size === 0).length;
    const flagged = items.filter((i) => i.flagged).length;
    const jumpTo = (pred: (i: Item) => boolean) => {
      const i = items.findIndex(pred);
      if (i >= 0) {
        index = i;
        renderQuestion();
      }
    };
    const list = el(
      'div',
      { class: 'palette review-palette' },
      ...items.map((it, i) => {
        const b = el(
          'button',
          {
            type: 'button',
            class: `pal${it.selected.size ? ' answered' : ''}${it.flagged ? ' flagged' : ''}`,
            'aria-label': `問題 ${i + 1}${it.selected.size ? '' : '（未回答）'}${it.flagged ? '（見直し）' : ''}`,
          },
          String(i + 1),
        );
        b.addEventListener('click', () => {
          index = i;
          renderQuestion();
        });
        return b;
      }),
    );
    const actions = el('div', { class: 'quiz-actions' });
    if (unanswered) {
      const b = el('button', { class: 'btn', type: 'button' }, `未回答の問題へ（${unanswered}）`);
      b.addEventListener('click', () => jumpTo((i) => i.selected.size === 0));
      actions.append(b);
    }
    if (flagged) {
      const b = el('button', { class: 'btn', type: 'button' }, `見直しの問題へ（${flagged}）`);
      b.addEventListener('click', () => jumpTo((i) => i.flagged));
      actions.append(b);
    }
    const back = el('button', { class: 'btn', type: 'button' }, '問題に戻る');
    back.addEventListener('click', renderQuestion);
    const submit = el('button', { class: 'btn btn-primary', type: 'button' }, '終了して採点する');
    submit.addEventListener('click', () => {
      if (window.confirm('採点すると回答は変更できません。採点しますか？')) finishMock(false);
    });
    actions.append(back, submit);
    root.replaceChildren(
      header(),
      el(
        'div',
        { class: 'card' },
        el('h2', { class: 'review-title' }, '見直し'),
        el(
          'p',
          { class: 'small muted' },
          `回答済み ${items.length - unanswered} / ${items.length} ・ 見直しマーク ${flagged} 問。番号を押すとその問題に戻れます。本番の WEB テストの多くは前の問題に戻れないので、ここは練習用の機能です。`,
        ),
        list,
      ),
      actions,
    );
  }

  function updateButtons() {
    const submit = root.querySelector<HTMLButtonElement>('[data-submit]');
    if (submit) submit.disabled = items[index].selected.size === 0;
  }

  function renderPalette() {
    const p = root.querySelector('[data-palette]');
    if (!p) return;
    p.replaceChildren(
      ...items.map((it, i) => {
        const b = el(
          'button',
          {
            type: 'button',
            class: `pal${i === index ? ' current' : ''}${it.selected.size ? ' answered' : ''}${it.flagged ? ' flagged' : ''}`,
            'aria-label': `問題 ${i + 1}`,
          },
          String(i + 1),
        );
        b.addEventListener('click', () => {
          index = i;
          renderQuestion();
        });
        return b;
      }),
    );
  }

  function byDomainTable(list: Item[]) {
    const stats = new Map<string, { correct: number; total: number }>();
    for (const it of list) {
      const s = stats.get(it.q.domain) ?? { correct: 0, total: 0 };
      s.total++;
      if (isCorrect(it)) s.correct++;
      stats.set(it.q.domain, s);
    }
    const line = opts.mock?.passingScore ?? 70;
    const rows = opts.domains
      .filter((d) => stats.has(d.id))
      .map((d) => {
        const s = stats.get(d.id)!;
        const pct = Math.round((s.correct / s.total) * 100);
        return el('tr', {}, el('td', {}, d.name), el('td', {}, `${s.correct}/${s.total}`), el('td', { class: pct < line ? 'weak' : '' }, `${pct}%`));
      });
    const table = el(
      'table',
      {},
      el('thead', {}, el('tr', {}, el('th', {}, '形式'), el('th', {}, '正解'), el('th', {}, '正答率'))),
      el('tbody', {}, ...rows),
    );
    return { table: el('div', { class: 'table-wrap' }, table), stats };
  }

  function reviewList(list: Item[]) {
    const wrong = list.filter((it) => !isCorrect(it));
    if (!wrong.length) return el('p', {}, '全問正解です。');
    return el(
      'ol',
      { class: 'review-list' },
      ...wrong.map((it) =>
        el(
          'li',
          { class: 'card' },
          el('p', { class: 'small muted' }, domainName(it.q.domain)),
          passageBlock(it.q.passage ? opts.passages[it.q.passage] : undefined, false),
          it.q.figure ? html(renderFigure(it.q.figure)) : null,
          el('p', { class: 'question', lang: it.q.lang ?? 'ja' }, it.q.question),
          el('p', { class: 'small' }, 'あなたの回答: ', it.selected.size ? [...it.selected].map((i) => it.q.choices[i]).join(' / ') : '未回答'),
          el('p', { class: 'small ok-text' }, '正解: ', it.q.answer.map((i) => it.q.choices[i]).join(' / ')),
          el('p', { class: 'small explanation' }, it.q.explanation),
        ),
      ),
    );
  }

  function resultActions(wrongCount: number, list: Item[]) {
    const row = el('div', { class: 'btn-row' });
    if (wrongCount > 0) {
      const retry = el('button', { class: 'btn btn-primary', type: 'button' }, `間違えた ${wrongCount} 問をもう一度`);
      retry.addEventListener('click', () => {
        const wrongQs = list.filter((it) => !isCorrect(it)).map((it) => it.q);
        // 再挑戦は練習モード（本文の順番はそのまま）
        runQuiz({ ...opts, mode: 'practice', questions: wrongQs, title: '間違えた問題の再挑戦', shuffle: false });
      });
      row.append(retry);
    }
    const again = el('button', { class: 'btn', type: 'button' }, 'もう一度最初から');
    again.addEventListener('click', () => start(opts.questions));
    row.append(again, el('a', { class: 'btn', href: opts.backHref }, opts.backLabel));
    return row;
  }

  /** 練習の回答時間のまとめ */
  function timeSummary(done: Item[]) {
    const timed = done.filter((i) => i.seconds !== undefined);
    if (!timed.length) return null;
    const avg = timed.reduce((s, i) => s + i.seconds!, 0) / timed.length;
    const goals = timed.map((i) => target(i.q)).filter((g): g is number => g !== null);
    const goal = goals.length ? goals.reduce((a, b) => a + b, 0) / goals.length : null;
    const over = goal !== null ? timed.filter((i) => i.seconds! > (target(i.q) ?? Infinity)).length : 0;
    return el(
      'p',
      { class: 'small' },
      `1 問あたり平均 ${fmtSec(avg)}`,
      goal !== null ? `（本番の目安 ${fmtSec(goal)}）・ 目安を超えた問題 ${over} 問` : '',
    );
  }

  function showPracticeResult() {
    finished = true;
    window.clearInterval(tickTimer);
    // 途中で終えた場合は、回答した問題だけで集計する
    const done = items.filter((i) => i.submitted);
    const correct = done.filter(isCorrect).length;
    const pct = done.length ? Math.round((correct / done.length) * 100) : 0;
    const { table } = byDomainTable(done);
    root.replaceChildren(
      el(
        'div',
        { class: 'card result' },
        el('p', { class: 'small muted' }, opts.title, done.length < items.length ? `（${items.length} 問中 ${done.length} 問に回答）` : ''),
        el('p', { class: 'score' }, `${correct} / ${done.length} 問正解`, el('span', { class: 'score-pct' }, `${pct}%`)),
        el('div', { class: 'progress thick result-bar', 'aria-hidden': 'true' }, el('span', { style: `width:${pct}%` })),
        timeSummary(done),
        table,
        resultActions(done.length - correct, done),
      ),
    );
    root.scrollIntoView({ block: 'start' });
  }

  function finishMock(timeUp: boolean) {
    if (finished) return;
    finished = true;
    window.clearInterval(tickTimer);
    const limitSec = (opts.mock?.minutes ?? 10) * 60;
    const durationSec = Math.min(limitSec, Math.floor((Date.now() - startedAt) / 1000));
    // 未回答は時間切れや飛ばしなので、学習記録（復習リスト）には入れない
    for (const it of items) if (it.selected.size > 0) recordAnswer(it.q.id, isCorrect(it));
    const correct = items.filter(isCorrect).length;
    const answered = items.filter((i) => i.selected.size > 0).length;
    const pct = Math.round((correct / items.length) * 100);
    const { table, stats } = byDomainTable(items);
    addMockResult({
      certId: opts.mock!.certId,
      domain: opts.mock?.domain,
      date: new Date().toISOString(),
      score: correct,
      total: items.length,
      durationSec,
      byDomain: Object.fromEntries(stats),
    });
    const passing = opts.mock?.passingScore;
    const label = opts.mock?.scoreLabel ?? '目安';
    const verdict =
      passing == null
        ? null
        : el('p', { class: `verdict ${pct >= passing ? 'ok' : 'ng'}` }, pct >= passing ? `${label}（${passing}%）を超えました` : `${label}（${passing}%）まであと ${passing - pct} ポイント`);
    root.replaceChildren(
      el(
        'div',
        { class: 'card result' },
        timeUp ? el('p', { class: 'notice' }, '時間切れのため自動で採点しました。') : null,
        el('p', { class: 'small muted' }, opts.title),
        el('p', { class: 'score' }, `${correct} / ${items.length} 問正解`, el('span', { class: 'score-pct' }, `${pct}%`)),
        verdict,
        el(
          'p',
          { class: 'small muted' },
          `回答できた問題 ${answered} / ${items.length} 問 ・ 所要時間 ${Math.floor(durationSec / 60)} 分 ${durationSec % 60} 秒 ・ 1 問あたり ${fmtSec(durationSec / Math.max(1, answered))}`,
        ),
        answered < items.length
          ? el('p', { class: 'small' }, `時間内に解き終えられなかった問題が ${items.length - answered} 問あります。本番では最後まで回答できるペース配分を意識しましょう。`)
          : null,
        el('h2', {}, '形式別の正答率'),
        table,
        resultActions(items.length - correct, items),
      ),
      el('h2', {}, '間違えた問題の解説'),
      reviewList(items),
    );
    root.scrollIntoView({ block: 'start' });
  }

  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = onKey;
  document.addEventListener('keydown', keyHandler);

  if (!opts.questions.length) {
    root.replaceChildren(el('div', { class: 'card' }, el('p', {}, '対象の問題がありません。'), el('a', { class: 'btn', href: opts.backHref }, opts.backLabel)));
    return;
  }
  start(opts.questions);
}
