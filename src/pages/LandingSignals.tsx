import { useEffect, useRef } from 'react';
import { ChartNoAxesColumnIncreasing, ClipboardList, Package, Tags } from 'lucide-react';
import './LandingSignals.css';

type Point = { x: number; y: number };

export function LandingSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const light = ref.current;
    const main = light?.parentElement;
    if (!light || !main) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cursor: Point | null = null;
    let position: Point | null = null;
    let frame = 0;
    let previousTime = 0;

    const draw = (time: number) => {
      frame = 0;
      if (!cursor || motion.matches) return;

      const bounds = main.getBoundingClientRect();
      const delta = previousTime ? Math.min(time - previousTime, 32) : 0;
      const response = 1 - Math.exp(-delta / 85);
      previousTime = time;
      position ??= { ...cursor };
      position.x += (cursor.x - position.x) * response;
      position.y += (cursor.y - position.y) * response;
      light.style.translate = `${position.x - bounds.left}px ${position.y - bounds.top}px`;
      light.dataset.active = 'true';

      if (Math.hypot(position.x - cursor.x, position.y - cursor.y) > .5) schedule();
    };

    function schedule() {
      if (!frame && cursor) frame = requestAnimationFrame(draw);
    }

    function hide() {
      cursor = null;
      position = null;
      previousTime = 0;
      light?.removeAttribute('data-active');
    }

    function move(event: PointerEvent) {
      if (event.pointerType === 'touch' || motion.matches) return;
      cursor = { x: event.clientX, y: event.clientY };
      schedule();
    }

    function scroll() {
      if (!cursor || !main) return;
      const bounds = main.getBoundingClientRect();
      if (cursor.y < bounds.top || cursor.y > bounds.bottom) hide();
      else schedule();
    }

    main.addEventListener('pointermove', move, { passive: true });
    main.addEventListener('pointerleave', hide);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    window.addEventListener('blur', hide);
    motion.addEventListener('change', hide);

    return () => {
      main.removeEventListener('pointermove', move);
      main.removeEventListener('pointerleave', hide);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', scroll);
      window.removeEventListener('blur', hide);
      motion.removeEventListener('change', hide);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="landing-spotlight" ref={ref} aria-hidden="true" />;
}

export function ProcurementTrace({ workflow = false }: { workflow?: boolean }) {
  return (
    <svg className="landing-trace" viewBox="0 0 330 190" fill="none" aria-hidden="true" focusable="false">
      <path className="landing-trace-route" d="M5 152h60a21 21 0 0 0 21-21v-17a21 21 0 0 1 21-21h71a21 21 0 0 0 21-21V55a21 21 0 0 1 21-21h105" />
      <path className="landing-trace-guide" d="M42 34h283M42 93h283M42 152h283M65 15v162M145 15v162M225 15v162M305 15v162" />
      <circle cx="65" cy="152" r="4" />
      <circle cx="145" cy="93" r="4" />
      <circle cx="225" cy="34" r="4" />
      {workflow ? <Package x="43" y="115" size={19} /> : <ClipboardList x="43" y="115" size={19} />}
      {workflow ? <ClipboardList x="123" y="57" size={19} /> : <Tags x="123" y="57" size={19} />}
      <ChartNoAxesColumnIncreasing x="241" y="44" size={19} />
    </svg>
  );
}
