// Маршрутизация с переходами-шторками: главная ⇄ страницы услуг (/services/<slug>).
// История браузера работает (pushState/popstate), прямые ссылки отдают пререндеренный HTML.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';
import { SERVICES } from '../data';
import { renderServicePage } from '../render';

const HOME_TITLE = document.title;
const HOME_DESC = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';

type Hooks = { onPage: (root: HTMLElement) => void; onHome: () => void };

export function initRouter(lenis: Lenis | null, reduce: boolean, hooks: Hooks) {
  const home = document.querySelector<HTMLElement>('.home-view')!;
  const page = document.querySelector<HTMLElement>('#page-view')!;
  const curtain = document.querySelector<HTMLElement>('.curtain')!;
  const panel = curtain.querySelector<HTMLElement>('.curtain__panel')!;
  const lime = curtain.querySelector<HTMLElement>('.curtain__lime')!;
  const label = curtain.querySelector<HTMLElement>('.curtain__label')!;
  const homeIsStub = () => home.hasAttribute('data-stub');
  let homeScroll = 0;
  let busy = false;

  const slugOf = (path: string) => path.match(/^\/services\/([\w-]+)\/?$/)?.[1];
  const scrollTo = (target: string | number, immediate = false) => {
    if (lenis) lenis.scrollTo(target as never, { immediate, offset: 0, duration: 1.6 });
    else if (typeof target === 'number') window.scrollTo(0, target);
    else document.querySelector(target)?.scrollIntoView({ behavior: immediate || reduce ? 'auto' : 'smooth' });
  };

  const setMeta = (title: string, desc: string, path: string) => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://люберцы-вет.рф' + path);
  };

  const curtainIn = (text: string) => new Promise<void>(res => {
    if (reduce) return res();
    curtain.style.visibility = 'visible';
    label.textContent = text;
    gsap.timeline({ onComplete: res })
      .fromTo(lime, { yPercent: 100 }, { yPercent: 0, duration: .6, ease: 'expo.inOut' }, 0)
      .fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: .6, ease: 'expo.inOut' }, .1)
      .fromTo(label, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .4 }, .45);
  });
  const curtainOut = () => {
    if (reduce) return;
    gsap.timeline({ onComplete: () => { curtain.style.visibility = 'hidden'; } })
      .to(label, { opacity: 0, duration: .2 }, 0)
      .to(panel, { yPercent: -100, duration: .8, ease: 'expo.inOut' }, .1)
      .to(lime, { yPercent: -100, duration: .8, ease: 'expo.inOut' }, .18);
  };

  const showPage = (slug: string) => {
    const s = SERVICES.find(x => x.slug === slug);
    if (!s) return false;
    page.innerHTML = renderServicePage(s);
    page.hidden = false;
    home.hidden = true;
    document.documentElement.dataset.route = 'page';
    setMeta(`${s.h1} — «Люберцы Вет»`, s.lead, `/services/${slug}`);
    scrollTo(0, true);
    ScrollTrigger.refresh();
    hooks.onPage(page);
    if (!reduce) {
      gsap.from(page.querySelectorAll('.sp__crumbs, .sp__num, .sp__h1, .sp__lead'), { y: 60, opacity: 0, duration: 1.3, stagger: .08, delay: .25, ease: 'expo.out' });
      gsap.fromTo(page.querySelector('.sp__fig'), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, delay: .3, ease: 'expo.inOut' });
      gsap.fromTo(page.querySelector('.sp__fig img'), { scale: 1.3 }, { scale: 1, duration: 1.8, delay: .3, ease: 'expo.out' });
    }
    return true;
  };

  const showHome = (hash: string) => {
    page.hidden = true;
    page.innerHTML = '';
    home.hidden = false;
    delete document.documentElement.dataset.route;
    setMeta(HOME_TITLE, HOME_DESC, '/');
    ScrollTrigger.refresh();
    hooks.onHome();
    if (hash && document.querySelector(hash)) scrollTo(hash, true);
    else scrollTo(homeScroll, true);
  };

  const go = async (url: URL, push: boolean) => {
    if (busy) return;
    const slug = slugOf(url.pathname);
    const onHome = !home.hidden && document.documentElement.dataset.route !== 'page';
    // Главная → якорь на главной: плавный скролл без шторки
    if (!slug && onHome) {
      if (push) history.pushState({}, '', url.pathname + url.search + url.hash);
      if (url.hash) scrollTo(url.hash); else scrollTo(0);
      return;
    }
    if (!slug && homeIsStub()) { location.href = url.href; return; }
    if (slug && !SERVICES.some(s => s.slug === slug)) { location.href = url.href; return; }
    busy = true;
    if (onHome) homeScroll = window.scrollY;
    const title = slug ? SERVICES.find(s => s.slug === slug)!.title : 'Главная';
    await curtainIn(title);
    if (push) history.pushState({}, '', url.pathname + url.search + url.hash);
    if (slug) showPage(slug); else showHome(url.hash);
    curtainOut();
    busy = false;
  };

  document.addEventListener('click', e => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-route]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    go(url, true);
  });
  window.addEventListener('popstate', () => go(new URL(location.href), false));

  // Первичная загрузка по прямой ссылке на услугу (в dev-режиме HTML общий)
  const initial = slugOf(location.pathname);
  if (initial && page.hidden) showPage(initial);
  else if (initial) hooks.onPage(page);
  return { go };
}
