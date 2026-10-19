import { defineConfig, type Plugin } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SERVICES } from './src/data.ts';
import {
  renderServiceRows, renderPrices, renderPriceCats, renderStory, renderStoryText,
  renderDistrictList, renderServiceFooterLinks, renderServicePage,
} from './src/render.ts';

// Пререндер контента из src/data.ts прямо в HTML: поисковики видят полноценную разметку без JS.
function prerender(): Plugin {
  let outDir = 'dist';
  return {
    name: 'vet-prerender',
    configResolved(c) { outDir = c.build.outDir; },
    transformIndexHtml(html) {
      return html
        .replace('<!--@SERVICES-->', renderServiceRows())
        .replace('<!--@PRICES-->', renderPrices())
        .replace('<!--@PRICE_CATS-->', renderPriceCats())
        .replace('<!--@STORY_MEDIA-->', renderStory())
        .replace('<!--@STORY_TEXT-->', renderStoryText())
        .replace('<!--@DISTRICTS-->', renderDistrictList())
        .replace('<!--@FOOTER_SERVICES-->', renderServiceFooterLinks());
    },
    // Отдельные посадочные страницы услуг: /services/<slug>/index.html — как на действующем сайте.
    closeBundle() {
      const base = readFileSync(resolve(outDir, 'index.html'), 'utf8');
      for (const s of SERVICES) {
        const page = base
          .replace(/<title>.*?<\/title>/, `<title>${s.h1} — «Люберцы Вет»</title>`)
          .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${s.lead}"`)
          .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="https://люберцы-вет.рф/services/${s.slug}"`)
          .replace('<html lang="ru">', '<html lang="ru" data-route="page">')
          .replace('<div id="page-view" class="page-view" hidden><!--@PAGE--></div>', `<div id="page-view" class="page-view">${renderServicePage(s)}</div>`)
          .replace(/<main id="main" class="home-view">[\s\S]*?<\/main>/, '<main id="main" class="home-view" data-stub></main>');
        const dir = resolve(outDir, 'services', s.slug);
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, 'index.html'), page);
      }
    },
  };
}

export default defineConfig({
  plugins: [prerender()],
  server: { port: 5199 },
  preview: { port: 5199 },
});
