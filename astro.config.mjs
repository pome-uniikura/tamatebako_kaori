// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages: https://pome-uniikura.github.io/tamatebako_kaori/
export default defineConfig({
  site: 'https://pome-uniikura.github.io',
  base: '/tamatebako_kaori',
  trailingSlash: 'always',
  markdown: {
    // ```mermaid のコードブロックは図としてブラウザで描画する
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
  },
});
