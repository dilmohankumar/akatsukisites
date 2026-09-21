import { useEffect, useRef } from 'react';

/**
 * Full-page animated starfield. Drifts on its own and reacts to
 * mouse/touch movement with a small parallax offset.
 */
export default function Stars() {
  const starRef = useRef(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    function moveStars(clientX, clientY) {
      if (!starRef.current) return;
      const x = (clientX / window.innerWidth - 0.5) * 40;
      const y = (clientY / window.innerHeight - 0.5) * 40;
      starRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }

    const onMouseMove = (e) => moveStars(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches?.[0]) moveStars(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <>
      <div className="stars-bg" />
      <div className="stars" ref={starRef} />
    </>
  );
}
