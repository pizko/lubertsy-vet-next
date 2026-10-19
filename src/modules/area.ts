// 06 — «Мы рядом»: шейдерная топография (изолинии из fbm-шума) + условная схема районов
// как диаграмма Вороного. Никаких координат, расстояний и времени прибытия.
import gsap from 'gsap';
import { DISTRICTS } from '../data';
import { createGL, makeProgram, resize, visibleLoop, NOISE, lowPower } from '../gl/gl';

const FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 res, mouse;
uniform float time;
${NOISE}
void main(){
  vec2 uv = vUv; vec2 p = uv * vec2(res.x / res.y, 1.) * 1.6;
  float h = fbm(p + vec2(time * .015, time * .01));
  float d = distance(uv, mouse);
  h += .12 * exp(-d * d * 18.);                         // курсор «приподнимает» рельеф
  float lines = abs(fract(h * 9.) - .5);
  float w = fwidth(h * 9.);
  float iso = 1. - smoothstep(0., w * 1.4, lines);
  float major = 1. - smoothstep(0., w * 1.6, abs(fract(h * 1.8) - .5));
  float glow = exp(-d * d * 14.);
  vec3 col = vec3(.957, .945, .914) * iso * (.06 + .1 * glow) + vec3(.8, .95, .42) * major * .05 * (1. + glow * 2.);
  col += vec3(.8, .95, .42) * iso * glow * .14;
  gl_FragColor = vec4(col, 1.);
}`;

type Pt = [number, number];
// Ячейка Вороного: прямоугольник, последовательно обрезанный серединными перпендикулярами
function voronoiCell(i: number, pts: Pt[], box: [number, number, number, number]): Pt[] {
  let poly: Pt[] = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
  const [px, py] = pts[i];
  pts.forEach(([qx, qy], j) => {
    if (j === i) return;
    const mx = (px + qx) / 2, my = (py + qy) / 2, nx = qx - px, ny = qy - py;
    const side = (x: number, y: number) => (x - mx) * nx + (y - my) * ny; // <0 — сторона точки i
    const out: Pt[] = [];
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const sa = side(...a), sb = side(...b);
      if (sa <= 0) out.push(a);
      if (sa * sb < 0) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    poly = out;
  });
  return poly;
}
// Сжатие полигона к центру — тонкие «улицы» между районами
const shrink = (poly: Pt[], c: Pt, k: number) => poly.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k] as Pt);

export function initArea() {
  const sec = document.querySelector<HTMLElement>('.area');
  if (!sec) return;
  const svg = sec.querySelector<SVGSVGElement>('.area__svg')!;
  const nameEl = sec.querySelector<HTMLElement>('.area__panel-name')!;
  const textEl = sec.querySelector<HTMLElement>('.area__panel-text')!;
  const listBtns = [...sec.querySelectorAll<HTMLButtonElement>('.dist-btn')];
  const NS = 'http://www.w3.org/2000/svg';
  const pts = DISTRICTS.map(d => [d.x, d.y] as Pt);
  const box: [number, number, number, number] = [10, 10, 790, 670];

  const cells: SVGPolygonElement[] = [];
  const marks: SVGGElement[] = [];
  const gCells = document.createElementNS(NS, 'g');
  const gMarks = document.createElementNS(NS, 'g');
  svg.append(gCells, gMarks);

  DISTRICTS.forEach((d, i) => {
    const poly = shrink(voronoiCell(i, pts, box), [d.x, d.y], .965);
    const el = document.createElementNS(NS, 'polygon');
    el.setAttribute('points', poly.map(p => p.join(',')).join(' '));
    el.setAttribute('class', 'cell' + (d.id === 'other' ? ' is-other' : ''));
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', d.name);
    el.dataset.district = d.id;
    gCells.append(el);
    cells.push(el);

    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'mk');
    g.dataset.district = d.id;
    const s = d.x > 600 ? -1 : 1, anchor = s < 0 ? 'end' : 'start';
    g.innerHTML = `<circle class="mk-ring" cx="${d.x}" cy="${d.y}" r="14"/><circle class="mk-dot" cx="${d.x}" cy="${d.y}" r="4.5"/>
      <line class="mk-line" x1="${d.x + 8 * s}" y1="${d.y}" x2="${d.x + 30 * s}" y2="${d.y}"/>
      <text class="mk-label" text-anchor="${anchor}" x="${d.x + 36 * s}" y="${d.y + 5}">${d.name}</text>
      <text class="mk-id" text-anchor="${anchor}" x="${d.x + 36 * s}" y="${d.y + 22}">${String(i + 1).padStart(2, '0')} / ${d.id === 'other' ? 'по согласованию' : 'зона выезда'}</text>`;
    gMarks.append(g);
    marks.push(g);
  });

  let active = '';
  const activate = (id: string) => {
    if (id === active) return;
    active = id;
    const d = DISTRICTS.find(x => x.id === id)!;
    cells.forEach(c => c.classList.toggle('is-active', c.dataset.district === id));
    marks.forEach(m => m.classList.toggle('is-active', m.dataset.district === id));
    listBtns.forEach(b => b.classList.toggle('is-active', b.dataset.district === id));
    const text = id === 'other'
      ? 'Выезд за пределы основной зоны обсуждается индивидуально. Позвоните и назовите адрес — специалист скажет, возможен ли выезд.'
      : id === 'lyubertsy'
        ? 'Основная зона выезда. Возможность выезда по конкретному адресу уточняйте по телефону.'
        : `Выезд ${d.loc} входит в основную зону обслуживания. Возможность и время выезда по адресу уточняйте по телефону.`;
    const tl = gsap.timeline();
    tl.to([nameEl, textEl], { y: -12, opacity: 0, duration: .2, ease: 'power2.in' })
      .add(() => { nameEl.textContent = d.name; textEl.textContent = text; })
      .fromTo(nameEl, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'expo.out' })
      .fromTo(textEl, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'expo.out' }, '<.06');
  };
  cells.forEach(c => {
    c.addEventListener('pointerenter', () => activate(c.dataset.district!));
    c.addEventListener('focus', () => activate(c.dataset.district!));
    c.addEventListener('click', () => activate(c.dataset.district!));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(c.dataset.district!); } });
  });
  listBtns.forEach(b => b.addEventListener('click', () => activate(b.dataset.district!)));
  activate('lyubertsy');

  // Появление схемы: ячейки «прорисовываются»
  gsap.from(cells, { opacity: 0, scale: .9, transformOrigin: 'center', duration: 1.4, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: svg, start: 'top 75%' } });
  gsap.from(marks, { opacity: 0, y: 14, duration: 1, stagger: .08, delay: .3, ease: 'expo.out', scrollTrigger: { trigger: svg, start: 'top 75%' } });

  // Топография
  const canvas = sec.querySelector<HTMLCanvasElement>('.area__topo')!;
  const ctx = createGL(canvas, lowPower() ? 1 : 1.5);
  if (!ctx) return;
  const { gl } = ctx;
  gl.getExtension('OES_standard_derivatives');
  let prog: ReturnType<typeof makeProgram>;
  try { prog = makeProgram(gl, '#extension GL_OES_standard_derivatives : enable\n' + FS); } catch (e) { console.warn(e); return; }
  const { u } = prog;
  const m = { x: .7, y: .5, tx: .7, ty: .5 };
  sec.addEventListener('pointermove', e => {
    const r = sec.getBoundingClientRect();
    m.tx = (e.clientX - r.left) / r.width; m.ty = 1 - (e.clientY - r.top) / r.height;
  });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  visibleLoop(sec, t => {
    const [w, h] = resize(ctx);
    m.x += (m.tx - m.x) * .05; m.y += (m.ty - m.y) * .05;
    gl.uniform2f(u('res'), w, h);
    gl.uniform2f(u('mouse'), m.x, m.y);
    gl.uniform1f(u('time'), reduce ? 0 : t / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (reduce) return false;
  });
}
