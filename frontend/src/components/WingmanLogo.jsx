import React from 'react';

export const WingmanFace = ({ size = 80 }) => (
  <div
    style={{ width: size, height: size }}
    className="relative inline-flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="prismGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path 
        d="M50 15L85 75H15L50 15Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="8" 
        strokeLinejoin="round" 
        className="text-slate-900 dark:text-white"
      />
      <path 
        d="M50 35L70 70H30L50 35Z" 
        fill="url(#prismGrad)" 
      />
    </svg>
  </div>
);

export const WingmanWordmark = ({ dark = false }) => (
  <div className="flex items-baseline gap-2 select-none">
    <span className={`text-[16px] font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>Jarvis</span>
    <span className={`text-[12px] ${dark ? 'text-white/40' : 'text-slate-500'}`}>Autonomous AI</span>
  </div>
);
