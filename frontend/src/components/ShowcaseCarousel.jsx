import React, { useState, useMemo } from 'react';
import { ASSISTANTS } from '../data/assistants';
import { ChevronLeft, ChevronRight, Mail, Briefcase, Plane } from 'lucide-react';

const SLIDES = [
  { id: 'team', kind: 'team', title1: 'One assistant', title2: 'Everything you need' },
  { id: 'connect', kind: 'connect', title1: 'Connected to', title2: 'everything you use' },
  { id: 'just', kind: 'just', title1: 'Just ask.', title2: 'Consider it done' },
  { id: 'pocket', kind: 'pocket', title1: 'Runs your business', title2: 'from your Pocket' },
  { id: 'dream', kind: 'team', title1: 'Build your', title2: 'Dream team' },
];

const BotAvatar = ({ size = 60, color = '#fff' }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <rect x="15" y="15" width="70" height="60" rx="18" fill="#0b0f17" />
    <rect x="45" y="75" width="10" height="10" fill="#0b0f17" />
    <circle cx="38" cy="45" r="6" fill={color} />
    <circle cx="62" cy="45" r="6" fill={color} />
  </svg>
);

const TeamSlide = () => (
  <div className="flex gap-5 px-10 mt-12 overflow-hidden">
    {ASSISTANTS.map((a) => (
      <div
        key={a.id}
        className="min-w-[260px] bg-white/95 backdrop-blur rounded-2xl p-5 shadow-xl flex-shrink-0"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: a.bg }}
        >
          <BotAvatar size={48} color="#7CFFB2" />
        </div>
        <div className="text-[22px] font-semibold text-slate-900">{a.name}</div>
        <div className="text-[15px] font-semibold mb-3" style={{ color: a.color }}>{a.role}</div>
        <div className="text-[13px] text-slate-600 leading-relaxed">{a.description}</div>
      </div>
    ))}
  </div>
);

const ConnectSlide = () => {
  const logos = [
    { src: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/gmail.svg', t: -130, l: 0, color: '#EA4335' },
    { src: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlecalendar.svg', t: -90, l: 150, color: '#4285F4' },
    { src: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg', t: 0, l: -180, color: '#E4405F' },
    { src: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/notion.svg', t: 30, l: -200, color: '#000000' },
    { src: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg', t: 70, l: -150, color: '#0A66C2' },
    { src: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/clickup.svg', t: 60, l: 200, color: '#7B68EE' },
    { src: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/slack.svg', t: 30, l: 220, color: '#4A154B' },
    { src: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googledrive.svg', t: 160, l: -120, color: '#1FA463' },
    { src: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg', t: 170, l: 30, color: '#000000' },
    { src: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/dropbox.svg', t: 160, l: 180, color: '#0061FF' },
  ];
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[280px] h-[280px] rounded-full border border-white/40" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[420px] h-[420px] rounded-full border border-white/30" />
      </div>
      <div className="relative z-10">
        <BotAvatar size={130} color="#7CFFB2" />
      </div>
      {logos.map((l, i) => (
        <div
          key={i}
          className="absolute w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center p-2.5"
          style={{ transform: `translate(${l.l}px, ${l.t}px)` }}
        >
          <img src={l.src} alt="" className="w-full h-full object-contain" style={{ filter: 'brightness(0)' }} />
        </div>
      ))}
    </div>
  );
};

const JustSlide = () => (
  <div className="absolute bottom-16 right-10 left-10 space-y-3">
    {[
      { icon: Mail, text: 'Summarize emails and draft replies daily at 8AM' },
      { icon: Plane, text: 'Check flight status and do my web-checkin' },
      { icon: Briefcase, text: 'Plan my work schedule, update on W...' },
    ].map((item, i) => (
      <div
        key={i}
        className="bg-white/95 backdrop-blur rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg"
        style={{ opacity: 1 - i * 0.25 }}
      >
        <item.icon className="w-5 h-5 text-slate-600" />
        <span className="text-slate-800 text-[15px]">{item.text}</span>
      </div>
    ))}
  </div>
);

const PocketSlide = () => (
  <div className="flex items-end justify-center h-full pt-10">
    <div className="w-[280px] h-[520px] bg-slate-900 rounded-[40px] border-[10px] border-slate-800 shadow-2xl overflow-hidden relative">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-full" />
      <div className="h-full bg-gradient-to-br from-cyan-100 to-cyan-300 p-4 pt-10 flex flex-col gap-3">
        <div className="bg-white/90 rounded-xl px-3 py-2 text-[12px] text-slate-800">
          <div className="font-medium">Daily summary</div>
          <div className="text-slate-500 text-[11px]">3 meetings, 12 emails handled</div>
        </div>
        <div className="bg-white/90 rounded-xl px-3 py-2 text-[12px] text-slate-800">
          <div className="font-medium">Pipeline updated</div>
          <div className="text-slate-500 text-[11px]">5 deals moved forward</div>
        </div>
        <div className="flex justify-center mt-6">
          <BotAvatar size={70} color="#7CFFB2" />
        </div>
      </div>
    </div>
  </div>
);

export default function ShowcaseCarousel() {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const next = () => setIdx((i) => (i + 1) % SLIDES.length);
  const prev = () => setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length);

  const bg = useMemo(
    () => 'linear-gradient(135deg, #f1eaff 0%, #cdeaff 25%, #5fc8ff 50%, #1d9aff 75%, #1453ff 100%)',
    []
  );

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[28px]" style={{ background: bg }}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/10" />
      <div className="relative z-10 h-full flex flex-col">
        <div className="pt-12 px-10 text-white">
          <h2 className="text-[40px] leading-[1.05] font-semibold tracking-tight">{slide.title1}</h2>
          <h2 className="text-[40px] leading-[1.05] font-semibold tracking-tight">{slide.title2}</h2>
        </div>
        <div className="flex-1 relative">
          {slide.kind === 'team' && <TeamSlide />}
          {slide.kind === 'connect' && <ConnectSlide />}
          {slide.kind === 'just' && <JustSlide />}
          {slide.kind === 'pocket' && <PocketSlide />}
        </div>
        <div className="flex items-center justify-center gap-3 pb-6">
          <button
            onClick={prev}
            className="w-9 h-9 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur flex items-center justify-center text-white transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? 'w-8 bg-white' : 'w-2 bg-white/50'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-9 h-9 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur flex items-center justify-center text-white transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
