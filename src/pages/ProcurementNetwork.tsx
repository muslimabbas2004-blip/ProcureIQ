import { useEffect, useRef } from 'react';
import { Boxes, Building2, ChartNoAxesColumnIncreasing, ClipboardList, Package, ScanLine, Sparkles, Tags } from 'lucide-react';
import './ProcurementNetwork.css';

// Each node represents a record type or insight in the procurement workspace.
const nodes = [
  { icon: Building2, x: .12, y: .15, turn: -16 },
  { icon: Package, x: .30, y: .09, turn: 18 },
  { icon: ClipboardList, x: .48, y: .29, turn: -24 },
  { icon: Tags, x: .72, y: .07, turn: 20 },
  { icon: ChartNoAxesColumnIncreasing, x: .90, y: .08, turn: 25 },
  { icon: Boxes, x: .045, y: .69, turn: -20 },
  { icon: ScanLine, x: .37, y: .84, turn: 24 },
  { icon: Sparkles, x: .58, y: .92, turn: -22 },
  { icon: Building2, x: .91, y: .93, turn: 26 }
];

const links = [[0, 1], [0, 5], [1, 2], [1, 3], [2, 3], [2, 6], [2, 7], [3, 4], [4, 8], [5, 6], [6, 7], [7, 8]];

export default function ProcurementNetwork() {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const graphic = svg.current;
    const hero = graphic?.parentElement;
    if (!graphic || !hero) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pieces = graphic.querySelectorAll<SVGGElement>('.procurement-node');
    const lines = graphic.querySelectorAll<SVGLineElement>('line');
    let pointer: { x: number; y: number } | null = null;
    const offsets = nodes.map(() => ({ x: 0, y: 0 }));
    let frame = 0;
    let visible = false;
    let previousTime = 0;
    let elapsed = 0;

    const draw = (time: number) => {
      frame = 0;
      const bounds = hero.getBoundingClientRect();
      const { width, height } = bounds;
      if (!width || !height) return;
      graphic.setAttribute('viewBox', `0 0 ${width} ${height}`);

      const animate = !motion.matches;
      const delta = previousTime ? Math.min(40, time - previousTime) : 0;
      previousTime = time;
      if (animate && visible) elapsed += delta / 1000;
      const scroll = animate ? Math.min(1, Math.max(0, -bounds.top / (height * .8))) : 0;
      const spread = scroll * scroll * (3 - 2 * scroll);
      const response = 1 - Math.exp(-delta / 95);
      const scale = width < 600 ? .8 : 1;

      const positions = nodes.map((node, index) => {
        const phase = index * 1.83;
        const orbit = elapsed * (.29 + index * .017);
        const drift = animate ? scale * (15 + index % 3 * 5 + spread * 10) : 0;
        const x = node.x * width + Math.sin(orbit + phase) * drift;
        const y = node.y * height + Math.cos(orbit * .83 + phase) * drift * .8;
        let targetX = 0;
        let targetY = 0;
        if (pointer && animate) {
          const dx = x - (pointer.x - bounds.left);
          const dy = y - (pointer.y - bounds.top);
          const distance = Math.hypot(dx, dy);
          const influence = Math.max(0, 1 - distance / 210) ** 2;
          const strength = 58 * influence * (1 - spread * .55) / Math.max(24, distance);
          targetX = dx * strength;
          targetY = dy * strength;
        }

        const offset = offsets[index];
        offset.x = animate ? offset.x + (targetX - offset.x) * response : 0;
        offset.y = animate ? offset.y + (targetY - offset.y) * response : 0;
        const px = x + offset.x + (node.x - .5) * Math.min(width, 850) * spread * .48;
        const py = y + offset.y + (node.y - .43) * height * spread * .50;
        const rotation = node.turn * spread + (animate ? Math.sin(orbit + phase) * 5 : 0);
        pieces[index].setAttribute('transform', `translate(${px} ${py}) rotate(${rotation}) scale(${scale * (1 - .18 * spread)})`);
        pieces[index].setAttribute('opacity', String(1 - .82 * spread));
        return { x: px, y: py };
      });

      links.forEach(([from, to], index) => {
        const start = positions[from];
        const end = positions[to];
        const line = lines[index];
        line.setAttribute('x1', String(start.x));
        line.setAttribute('y1', String(start.y));
        line.setAttribute('x2', String(end.x));
        line.setAttribute('y2', String(end.y));
        line.setAttribute('opacity', String((1 - spread) ** 3));
      });
      graphic.style.visibility = 'visible';
      if (visible && animate) scheduleDraw();
    };

    function scheduleDraw() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    function move(event: PointerEvent) {
      if (event.pointerType === 'touch' || motion.matches) return;
      pointer = { x: event.clientX, y: event.clientY };
      scheduleDraw();
    }

    function resetPointer() {
      pointer = null;
      scheduleDraw();
    }

    const observer = new ResizeObserver(scheduleDraw);
    observer.observe(hero);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      previousTime = 0;
      if (visible) scheduleDraw();
    });
    intersection.observe(hero);
    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', resetPointer);
    motion.addEventListener('change', resetPointer);
    scheduleDraw();

    return () => {
      observer.disconnect();
      intersection.disconnect();
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', resetPointer);
      motion.removeEventListener('change', resetPointer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg ref={svg} className="procurement-network" aria-hidden="true" focusable="false">
      <g className="procurement-network-links">
        {links.map(([from, to]) => <line key={`${from}-${to}`} />)}
      </g>
      {nodes.map(({ icon: Icon, x }, index) => (
        <g key={index} className="procurement-node">
          <rect className="procurement-node-outline" x="-26" y="-26" width="52" height="52" rx="12" />
          <rect x="-20" y="-20" width="40" height="40" rx="9" />
          <Icon x={-10} y={-10} size={20} strokeWidth={1.5} />
          <circle cx={x > .5 ? 26 : -26} cy="0" r="2" />
        </g>
      ))}
    </svg>
  );
}
