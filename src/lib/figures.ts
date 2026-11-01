/**
 * 問題の図表（表・棒グラフ・折れ線グラフ・円グラフ・SVG）を HTML 文字列にする。
 * 教材データ（自分たちで書いた JSON）だけを渡す前提。文字列は念のためエスケープする。
 */
import type { ChartFigure, Figure, PieFigure, TableFigure } from './types';

const esc = (s: string | number) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** 数値を 3 桁区切りで表示（文字列はそのまま） */
const fmt = (v: string | number) => (typeof v === 'number' ? v.toLocaleString('ja-JP', { maximumFractionDigits: 2 }) : v);

/** グラフの系列の色（ライト・ダークの両方で見分けやすいもの） */
const SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

function caption(fig: Figure): string {
  if (!fig.title && !fig.unit) return '';
  return `<figcaption>${fig.title ? `<span class="fig-title">${esc(fig.title)}</span>` : ''}${
    fig.unit ? `<span class="fig-unit">${esc(fig.unit)}</span>` : ''
  }</figcaption>`;
}

function table(fig: TableFigure): string {
  const numeric = (v: string | number) => typeof v === 'number' || /^[-+]?[\d,.]+%?$/.test(String(v).trim());
  const head = `<thead><tr>${fig.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${fig.rows
    .map(
      (r) =>
        `<tr>${r
          .map((c, i) => (i === 0 ? `<th scope="row">${esc(fmt(c))}</th>` : `<td${numeric(c) ? ' class="num"' : ''}>${esc(fmt(c))}</td>`))
          .join('')}</tr>`,
    )
    .join('')}</tbody>`;
  return `<div class="table-wrap"><table class="fig-table">${head}${body}</table></div>`;
}

/** 目盛りのきりのよい間隔 */
function niceStep(max: number, ticks = 5): number {
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

function legend(names: string[]): string {
  if (names.length < 2) return '';
  return `<p class="fig-legend">${names
    .map((n, i) => `<span><i style="background:${SERIES[i % SERIES.length]}"></i>${esc(n)}</span>`)
    .join('')}</p>`;
}

function chart(fig: ChartFigure): string {
  const W = 560;
  const H = 260;
  const left = 52;
  const right = 12;
  const top = 14;
  const bottom = 34;
  const all = fig.series.flatMap((s) => s.values);
  const max = Math.max(...all, 0);
  const step = niceStep(max || 1);
  const yMax = Math.ceil(max / step) * step || step;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const y = (v: number) => top + plotH - (v / yMax) * plotH;
  const n = fig.labels.length;
  const band = plotW / n;
  const parts: string[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) {
    const yy = y(v).toFixed(1);
    parts.push(`<line x1="${left}" x2="${W - right}" y1="${yy}" y2="${yy}" class="grid"/>`);
    parts.push(`<text x="${left - 6}" y="${yy}" class="tick" text-anchor="end" dominant-baseline="middle">${esc(fmt(Math.round(v * 100) / 100))}</text>`);
  }
  fig.labels.forEach((l, i) => {
    parts.push(`<text x="${(left + band * (i + 0.5)).toFixed(1)}" y="${H - bottom + 18}" class="tick" text-anchor="middle">${esc(l)}</text>`);
  });
  if (fig.kind === 'bar') {
    const groupW = band * 0.72;
    const barW = groupW / fig.series.length;
    fig.series.forEach((s, si) => {
      s.values.forEach((v, i) => {
        const x = left + band * i + (band - groupW) / 2 + barW * si;
        parts.push(
          `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${(barW - 2).toFixed(1)}" height="${(top + plotH - y(v)).toFixed(1)}" rx="2" fill="${SERIES[si % SERIES.length]}"/>`,
        );
        if (n * fig.series.length <= 12) {
          parts.push(`<text x="${(x + (barW - 2) / 2).toFixed(1)}" y="${(y(v) - 4).toFixed(1)}" class="val" text-anchor="middle">${esc(fmt(v))}</text>`);
        }
      });
    });
  } else {
    fig.series.forEach((s, si) => {
      const pts = s.values.map((v, i) => `${(left + band * (i + 0.5)).toFixed(1)},${y(v).toFixed(1)}`);
      parts.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${SERIES[si % SERIES.length]}" stroke-width="2.5"/>`);
      s.values.forEach((v, i) => {
        const cx = (left + band * (i + 0.5)).toFixed(1);
        parts.push(`<circle cx="${cx}" cy="${y(v).toFixed(1)}" r="3.5" fill="${SERIES[si % SERIES.length]}"/>`);
        if (fig.series.length <= 2) parts.push(`<text x="${cx}" y="${(y(v) - 8).toFixed(1)}" class="val" text-anchor="middle">${esc(fmt(v))}</text>`);
      });
    });
  }
  parts.push(`<line x1="${left}" x2="${W - right}" y1="${top + plotH}" y2="${top + plotH}" class="axis"/>`);
  const alt = `${fig.title ?? 'グラフ'}: ${fig.series.map((s) => `${s.name} ${s.values.map((v, i) => `${fig.labels[i]} ${v}`).join('、')}`).join('。')}`;
  return `<svg class="fig-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(alt)}">${parts.join('')}</svg>${legend(fig.series.map((s) => s.name))}`;
}

function pie(fig: PieFigure): string {
  const total = fig.values.reduce((a, b) => a + b, 0) || 1;
  const R = 90;
  const C = 110;
  let angle = -Math.PI / 2;
  const parts: string[] = [];
  fig.values.forEach((v, i) => {
    const a = (v / total) * Math.PI * 2;
    const x1 = C + R * Math.cos(angle);
    const y1 = C + R * Math.sin(angle);
    const x2 = C + R * Math.cos(angle + a);
    const y2 = C + R * Math.sin(angle + a);
    const large = a > Math.PI ? 1 : 0;
    parts.push(
      `<path d="M${C},${C} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${SERIES[i % SERIES.length]}" class="slice"/>`,
    );
    angle += a;
  });
  const alt = `${fig.title ?? '円グラフ'}: ${fig.labels.map((l, i) => `${l} ${fig.values[i]}`).join('、')}`;
  const list = `<ul class="pie-legend">${fig.labels
    .map((l, i) => `<li><i style="background:${SERIES[i % SERIES.length]}"></i><span>${esc(l)}</span><b>${esc(fmt(fig.values[i]))}</b></li>`)
    .join('')}</ul>`;
  return `<div class="fig-pie"><svg viewBox="0 0 220 220" role="img" aria-label="${esc(alt)}">${parts.join('')}</svg>${list}</div>`;
}

export function renderFigure(fig: Figure): string {
  let inner = '';
  if (fig.kind === 'table') inner = table(fig);
  else if (fig.kind === 'bar' || fig.kind === 'line') inner = chart(fig);
  else if (fig.kind === 'pie') inner = pie(fig);
  else if (fig.kind === 'svg') inner = `<div class="fig-svg" role="img" aria-label="${esc(fig.alt)}">${fig.svg}</div>`;
  return `<figure class="fig fig-${fig.kind}">${caption(fig)}${inner}${fig.note ? `<p class="fig-note">${esc(fig.note)}</p>` : ''}</figure>`;
}
