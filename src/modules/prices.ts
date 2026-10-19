// 07 — Прайс как продуктовый интерфейс: живой поиск, категории, сортировка, FLIP-анимации, аккордеон.
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();

export function initPrices() {
  const sec = document.querySelector<HTMLElement>('.prices');
  if (!sec) return;
  const list = sec.querySelector<HTMLElement>('.price-list')!;
  const items = [...list.querySelectorAll<HTMLElement>('.price')];
  const input = sec.querySelector<HTMLInputElement>('.search input')!;
  const chips = [...sec.querySelectorAll<HTMLButtonElement>('.chip')];
  const sorts = [...sec.querySelectorAll<HTMLButtonElement>('.sort__btn')];
  const countWrap = sec.querySelector<HTMLElement>('.prices__count')!;
  const empty = sec.querySelector<HTMLElement>('.prices__empty')!;
  const names = new Map(items.map(it => [it, it.querySelector<HTMLElement>('.price__name')!.textContent!]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cat = 'all', sort = 'order', q = '';

  const plural = (n: number) => {
    const m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? 'позиция' : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 'позиции' : 'позиций';
  };

  const apply = () => {
    const state = Flip.getState(items);
    const qq = norm(q);
    let n = 0;
    items.forEach(it => {
      const name = names.get(it)!;
      const ok = (cat === 'all' || it.dataset.cat === cat) && (!qq || norm(name).includes(qq));
      it.hidden = !ok;
      if (ok) n++;
      // подсветка совпадения
      const el = it.querySelector<HTMLElement>('.price__name')!;
      if (qq && ok) {
        const i = norm(name).indexOf(qq);
        el.innerHTML = `${name.slice(0, i)}<mark>${name.slice(i, i + qq.length)}</mark>${name.slice(i + qq.length)}`;
      } else el.textContent = name;
    });
    const sorted = [...items].sort((a, b) =>
      sort === 'asc' ? +a.dataset.value! - +b.dataset.value! : sort === 'desc' ? +b.dataset.value! - +a.dataset.value! : +a.dataset.order! - +b.dataset.order!);
    sorted.forEach(it => list.appendChild(it));
    countWrap.innerHTML = `<b>${n}</b> ${plural(n)}`;
    empty.hidden = n > 0;
    if (!reduce) {
      Flip.from(state, {
        duration: .7, ease: 'expo.out', stagger: .02, absolute: false, nested: true,
        onEnter: els => gsap.fromTo(els, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .6, ease: 'expo.out', stagger: .03 }),
        onLeave: els => gsap.to(els, { opacity: 0, duration: .25 }),
        onComplete: () => ScrollTrigger.refresh(),
      });
    } else ScrollTrigger.refresh();
  };

  let to = 0;
  input.addEventListener('input', () => { clearTimeout(to); to = window.setTimeout(() => { q = input.value; apply(); }, 120); });
  chips.forEach(c => c.addEventListener('click', () => {
    cat = c.dataset.cat!;
    chips.forEach(x => { x.classList.toggle('is-active', x === c); x.setAttribute('aria-pressed', String(x === c)); });
    apply();
  }));
  sorts.forEach(s => s.addEventListener('click', () => {
    sort = s.dataset.sort!;
    sorts.forEach(x => { x.classList.toggle('is-active', x === s); x.setAttribute('aria-pressed', String(x === s)); });
    apply();
  }));
  sec.querySelector('[data-reset-prices]')!.addEventListener('click', () => {
    input.value = ''; q = ''; cat = 'all';
    chips.forEach((x, i) => { x.classList.toggle('is-active', i === 0); x.setAttribute('aria-pressed', String(i === 0)); });
    apply();
    input.focus();
  });

  // Аккордеон с пояснениями
  items.forEach(it => {
    const btn = it.querySelector<HTMLButtonElement>('.price__row')!;
    const note = it.querySelector<HTMLElement>('.price__note')!;
    btn.addEventListener('click', () => {
      const open = !it.classList.contains('is-open');
      it.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        note.hidden = false;
        gsap.fromTo(note, { height: 0 }, { height: 'auto', duration: .6, ease: 'expo.out', onComplete: () => ScrollTrigger.refresh() });
        gsap.fromTo(note.firstElementChild, { y: 12, opacity: 0 }, { y: 0, opacity: .72, duration: .6, ease: 'expo.out' });
      } else {
        gsap.to(note, { height: 0, duration: .45, ease: 'expo.inOut', onComplete: () => { note.hidden = true; note.style.height = ''; ScrollTrigger.refresh(); } });
      }
    });
  });
}
