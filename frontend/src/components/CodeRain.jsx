import React, { useEffect, useRef } from 'react';

// Subtle floating-letters background like Jarvis left side
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+&%$#@*-/?!.,';

export default function CodeRain({ density = 0.5 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    const cols = Math.floor(canvas.width / (24 * window.devicePixelRatio));
    const rows = Math.floor(canvas.height / (28 * window.devicePixelRatio));
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        c: CHARS[Math.floor(Math.random() * CHARS.length)],
        a: Math.random() * 0.25 + 0.05,
        t: Math.random() * 1000,
      }))
    );

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${14 * window.devicePixelRatio}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      for (let r = 0; r < rows; r++) {
        for (let cIdx = 0; cIdx < cols; cIdx++) {
          const cell = grid[r][cIdx];
          cell.t += 0.005;
          const flicker = (Math.sin(cell.t) + 1) / 2;
          const alpha = cell.a * (0.4 + flicker * 0.6) * density;
          ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
          ctx.fillText(
            cell.c,
            cIdx * 24 * window.devicePixelRatio + 6,
            r * 28 * window.devicePixelRatio + 22
          );
          if (Math.random() < 0.001) cell.c = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}
