import { useEffect, useRef, useState } from 'react';
import './CustomCursor.css';

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, [data-cursor="hover"]';

/**
 * Desktop-only pointer accent. Disabled for touch devices, coarse pointers and
 * users who prefer reduced motion — in those cases the native cursor is used.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wide = window.matchMedia('(min-width: 900px)').matches;
    setEnabled(fine && !reduced && wide);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    document.body.classList.add('has-custom-cursor');

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let raf;

    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    // The ring trails the dot with simple easing — cheap and smooth.
    const tick = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onOver = (e) => {
      const hit = e.target.closest?.(INTERACTIVE);
      ringRef.current?.classList.toggle('is-hover', Boolean(hit));
    };
    const onDown = () => ringRef.current?.classList.add('is-down');
    const onUp = () => ringRef.current?.classList.remove('is-down');
    const onLeave = () => ringRef.current?.classList.add('is-hidden');
    const onEnter = () => ringRef.current?.classList.remove('is-hidden');

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
