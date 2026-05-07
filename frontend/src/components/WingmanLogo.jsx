import React from 'react';

export const WingmanFace = ({ size = 80 }) => (
  <div
    style={{ width: size, height: size }}
    className="relative inline-flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="botGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#0b0f17" />
        </linearGradient>
      </defs>
      <rect x="15" y="15" width="70" height="60" rx="18" fill="url(#botGrad)" />
      <rect x="45" y="75" width="10" height="10" fill="url(#botGrad)" />
      <circle cx="38" cy="45" r="6" fill="#7CFFB2" />
      <circle cx="62" cy="45" r="6" fill="#7CFFB2" />
    </svg>
  </div>
);

export const WingmanWordmark = () => (
  <div className="flex items-baseline gap-2 select-none">
    <span className="text-[16px] font-bold tracking-tight text-slate-900">Jarvis</span>
    <span className="text-[12px] text-slate-500">Autonomous AI</span>
  </div>
);
