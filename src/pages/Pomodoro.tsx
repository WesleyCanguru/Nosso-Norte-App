import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Coffee, 
  Brain,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

type Mode = 'foco' | 'curto' | 'longo';

const MODES = {
  foco: { title: 'Foco Absoluto', minutes: 25, icon: Brain, color: 'bg-primary' },
  curto: { title: 'Pausa Curta', minutes: 5, icon: Coffee, color: 'bg-accent' },
  longo: { title: 'Pausa Longa', minutes: 15, icon: Timer, color: 'bg-secondary' }
};

export function Pomodoro() {
  const [mode, setMode] = useState<Mode>('foco');
  const [timeLeft, setTimeLeft] = useState(MODES.foco.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].minutes * 60);
  };

  const changeMode = (newMode: Mode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(MODES[newMode].minutes * 60);
  };

  const currentModeInfo = MODES[mode];

  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-20">
      <header className="text-center space-y-6">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-full border border-primary/10 mx-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">ARQUITETURA DE FOCO / 0&bull;4</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-display font-bold text-secondary leading-[0.85] tracking-[-0.06em] uppercase">
          TEMPO DE<br />
          <span className="text-accent italic font-medium">CONSTRUÇÃO.</span>
        </h1>
        <p className="text-text-muted text-xl font-light italic max-w-lg mx-auto">“O tempo não é um recurso, é o material com o qual esculpimos o destino.”</p>
      </header>

      <div className="bg-surface border border-surface-border rounded-[4.5rem] p-12 md:p-24 shadow-[0_60px_120px_-30px_rgba(74,53,47,0.2)] relative overflow-hidden group card-3d">
        <div className="absolute top-0 right-0 p-12">
          <button className="w-16 h-16 bg-background rounded-3xl border border-surface-border text-text-muted hover:text-primary transition-all hover:shadow-2xl hover:border-primary/20 flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col items-center space-y-20">
          {/* Mode Selector */}
          <div className="bg-background/80 backdrop-blur-xl p-4 rounded-[3rem] flex gap-4 border border-surface-border shadow-inner">
            {(Object.keys(MODES) as Mode[]).map((m) => {
              const Icon = MODES[m].icon;
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => changeMode(m)}
                  className={cn(
                    "flex items-center gap-4 px-10 py-5 rounded-[2rem] text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-700",
                    active 
                      ? `${MODES[m].color} text-white shadow-2xl shadow-primary/30 scale-105` 
                      : "text-text-muted hover:bg-surface-hover hover:text-secondary opacity-60 hover:opacity-100"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {MODES[m].title}
                </button>
              );
            })}
          </div>

          {/* Timer Display */}
          <div className="relative">
            <div className="relative w-80 h-80 md:w-[500px] md:h-[500px] flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_40px_rgba(45,79,60,0.1)]">
                <circle cx="50%" cy="50%" r="44%" fill="transparent" stroke="rgba(45,79,60,0.04)" strokeWidth="16" />
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="44%"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="16"
                  strokeLinecap="round"
                  className={cn("transition-colors duration-1000", mode === 'foco' ? 'text-primary' : mode === 'curto' ? 'text-accent' : 'text-secondary')}
                  initial={{ strokeDasharray: "283 283", strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 - (283 * (timeLeft / (MODES[mode].minutes * 60))) }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-9xl md:text-[14rem] font-display font-bold text-secondary tracking-[-0.08em] leading-none">
                  {String(minutes).padStart(2, '0')}<span className="text-primary/10 animate-pulse">:</span>{String(seconds).padStart(2, '0')}
                </span>
                <div className="mt-12 px-10 py-4 bg-secondary shadow-2xl shadow-secondary/40 rounded-[2rem] border border-white/5">
                   <span className="text-[11px] font-bold text-white uppercase tracking-[0.5em] opacity-80">
                    {isActive ? 'STATUS: CONSTRUÇÃO' : 'STATUS: LATÊNCIA'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Massive Glow effect */}
            <div className={cn(
               "absolute inset-0 bg-primary/10 rounded-full blur-[150px] -z-10 transition-opacity duration-1000",
               isActive ? "opacity-100" : "opacity-0"
            )} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-14">
            <button 
              onClick={toggleTimer}
              className={cn(
                "w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-white transition-all duration-700 transform active:scale-90 hover:scale-110 shadow-2xl",
                isActive ? "bg-secondary shadow-secondary/30 scale-95" : "bg-primary shadow-primary/40"
              )}
            >
              {isActive ? <Pause className="w-14 h-14 fill-current" /> : <Play className="w-14 h-14 fill-current ml-2" />}
            </button>
            <button 
              onClick={resetTimer}
              className="w-24 h-24 rounded-[2rem] bg-background border border-surface-border flex items-center justify-center text-text-muted hover:text-primary transition-all hover:bg-surface-hover hover:rotate-180 duration-1000 shadow-sm"
            >
              <RotateCcw className="w-10 h-10" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
