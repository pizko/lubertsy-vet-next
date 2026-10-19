// Чистые функции рендера в строку HTML: работают и в Node (пререндер для SEO), и в браузере (роутер).
import { SERVICES, PRICES, PRICE_CATS, DISTRICTS, STEPS, CONTACT, fmtPrice, u, type Service } from './data.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const img = (name: string, alt: string, cls = '', sizes = '(max-width: 768px) 100vw, 50vw', eager = false) =>
  `<img class="${cls}" src="${u(`/img/${name}-900.webp`)}" srcset="${u(`/img/${name}-900.webp`)} 900w, ${u(`/img/${name}-1800.webp`)} 1800w" sizes="${sizes}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

export const ARROW = `<svg class="ico-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M8 6h10v10" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;

export function renderServiceRows(): string {
  return SERVICES.map((s, i) => `
  <li class="svc" data-index="${i}" data-img="${s.img}">
    <button class="svc__head" type="button" aria-expanded="false" aria-controls="svc-panel-${s.slug}" id="svc-btn-${s.slug}" data-cursor="view">
      <span class="svc__num">${s.num}</span>
      <span class="svc__title"><span class="svc__title-in">${esc(s.title)}</span></span>
      <span class="svc__short">${esc(s.short)}</span>
      <span class="svc__price">${s.price}</span>
      <span class="svc__plus" aria-hidden="true"><i></i><i></i></span>
    </button>
    <div class="svc__panel" id="svc-panel-${s.slug}" role="region" aria-labelledby="svc-btn-${s.slug}" hidden>
      <div class="svc__panel-in">
        <figure class="svc__fig">${img(s.img, s.alt, '', '(max-width: 768px) 90vw, 30vw')}</figure>
        <div class="svc__body">
          <p class="svc__lead">${esc(s.lead)}</p>
          <dl class="svc__dl">${s.blocks.slice(0, 2).map(b => `<div><dt>${esc(b.h)}</dt><dd>${esc(b.p)}</dd></div>`).join('')}</dl>
          <div class="svc__actions">
            <a class="btn btn--dark" href="${u(`/services/${s.slug}`)}" data-route data-cursor="link"><span>Подробнее об услуге</span>${ARROW}</a>
            <a class="btn btn--ghost" href="${CONTACT.tel}"><span>Уточнить по телефону</span></a>
          </div>
        </div>
      </div>
    </div>
  </li>`).join('');
}

export function renderPrices(): string {
  return PRICES.map((p, i) => `
  <li class="price" data-cat="${p.cat}" data-value="${p.value}" data-order="${i}" data-name="${esc(p.name.toLowerCase())}">
    <button class="price__row" type="button" aria-expanded="false" aria-controls="price-note-${i}">
      <span class="price__idx">${String(i + 1).padStart(2, '0')}</span>
      <span class="price__name">${esc(p.name)}</span>
      <span class="price__cat">${PRICE_CATS.find(c => c.id === p.cat)!.label}</span>
      <span class="price__leader" aria-hidden="true"></span>
      <span class="price__val">${p.from ? '<small>от</small> ' : ''}${fmtPrice({ ...p, from: false })}</span>
      <span class="price__chev" aria-hidden="true"></span>
    </button>
    <div class="price__note" id="price-note-${i}" hidden><p>${esc(p.note)}</p></div>
  </li>`).join('');
}

export function renderPriceCats(): string {
  return PRICE_CATS.map((c, i) => `<button type="button" class="chip${i === 0 ? ' is-active' : ''}" data-cat="${c.id}" aria-pressed="${i === 0}">${c.label}<sup>${c.id === 'all' ? PRICES.length : PRICES.filter(p => p.cat === c.id).length}</sup></button>`).join('');
}

export function renderStory(): string {
  return STEPS.map((s, i) => `
    <figure class="story__shot" data-step="${i}">${img(s.img, s.alt, '', '(max-width: 1024px) 100vw, 50vw').replace('loading="lazy"', 'loading="eager"')}</figure>`).join('');
}
export function renderStoryText(): string {
  return STEPS.map((s, i) => `
    <article class="story__step" data-step="${i}">
      <p class="story__kicker mono">Этап ${s.n} / 04</p>
      <h3 class="story__title">${s.title}</h3>
      <p class="story__text">${s.text}</p>
    </article>`).join('');
}

export function renderDistrictList(): string {
  return DISTRICTS.map(d => `<li><button type="button" class="dist-btn" data-district="${d.id}"><span class="dot"></span>${d.name}</button></li>`).join('');
}

export function renderServiceFooterLinks(): string {
  return SERVICES.map(s => `<li><a href="${u(`/services/${s.slug}`)}" data-route>${esc(s.title)}</a></li>`).join('');
}

export function renderServicePage(s: Service): string {
  const idx = SERVICES.indexOf(s);
  const next = SERVICES[(idx + 1) % SERVICES.length];
  return `
  <article class="sp" data-slug="${s.slug}">
    <header class="sp__hero">
      <nav class="sp__crumbs mono" aria-label="Хлебные крошки"><a href="${u('/')}" data-route>Главная</a><span>/</span><a href="${u('/#services')}" data-route>Услуги</a><span>/</span><span aria-current="page">${esc(s.title)}</span></nav>
      <p class="sp__num" aria-hidden="true">${s.num}</p>
      <h1 class="sp__h1">${esc(s.h1)}</h1>
      <p class="sp__lead">${esc(s.lead)}</p>
      <figure class="sp__fig">${img(s.img, s.alt, '', '(max-width: 768px) 100vw, 45vw', true)}</figure>
    </header>
    <div class="sp__grid">
      ${s.blocks.map((b, i) => `<section class="sp__block"><p class="mono">( ${String(i + 1).padStart(2, '0')} )</p><h2>${esc(b.h)}</h2><p>${esc(b.p)}</p></section>`).join('')}
      <aside class="sp__price">
        <p class="mono">Стоимость</p>
        <p class="sp__price-val">${s.price}</p>
        <p>Окончательная цена зависит от выезда, состояния питомца, препаратов и необходимых процедур. Всё согласовывается до выполнения.</p>
        <a class="btn btn--lime" href="${CONTACT.tel}" data-magnetic><span>Позвонить: ${CONTACT.phone}</span>${ARROW}</a>
        <p class="mono sp__hours">${CONTACT.hours}. При тяжёлых симптомах сообщите об этом в начале разговора.</p>
      </aside>
    </div>
    <p class="sp__note"><b>Важно:</b> информация на странице носит справочный характер и не заменяет очный ветеринарный осмотр.</p>
    <a class="sp__next" href="${u(`/services/${next.slug}`)}" data-route data-cursor="link">
      <span class="mono">Следующая услуга — ${next.num}</span>
      <span class="sp__next-title">${esc(next.title)} ${ARROW}</span>
    </a>
  </article>`;
}
