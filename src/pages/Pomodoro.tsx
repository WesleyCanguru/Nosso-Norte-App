import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Coffee, 
  Brain,
  Timer,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";

type Mode = 'foco' | 'curto' | 'longo';

const MODE_CONFIG = {
  foco: { title: 'Foco', icon: Brain, color: 'bg-primary' },
  curto: { title: 'Pausa curta', icon: Coffee, color: 'bg-secondary' },
  longo: { title: 'Pausa longa', icon: Timer, color: 'bg-secondary' }
};

export function Pomodoro() {
  const [mode, setMode] = useState<Mode>('foco');
  const [durations, setDurations] = useState({
    foco: 25,
    curto: 5,
    longo: 15
  });
  const [timeLeft, setTimeLeft] = useState(durations.foco * 60);
  const [isActive, setIsActive] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempDurations, setTempDurations] = useState(durations);
  
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
      if (mode === 'foco') {
        setCompletedSessions(prev => prev + 1);
      }
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  // Update timeLeft when durations change if the timer is not active or if we reset
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(durations[mode] * 60);
    }
  }, [durations, mode, isActive]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(durations[mode] * 60);
  };

  const changeMode = (newMode: Mode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(durations[newMode] * 60);
  };

  const handleSaveSettings = () => {
    setDurations(tempDurations);
    setIsSettingsOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 px-4">
      <header className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-secondary tracking-tight">Pomodoro</h1>
          <p className="text-text-muted text-sm md:text-base font-medium">
            {completedSessions} sessões de foco concluídas
          </p>
        </div>
        <button 
          onClick={() => {
            setTempDurations(durations);
            setIsSettingsOpen(true);
          }}
          className="w-10 h-10 md:w-12 md:h-12 bg-surface hover:bg-surface-hover rounded-xl border border-surface-border flex items-center justify-center text-text-muted hover:text-primary transition-all"
        >
          <Settings className="w-5 h-5 md:w-5 md:h-5" />
        </button>
      </header>

      <div className="relative bg-surface border border-surface-border rounded-2xl md:rounded-[2rem] p-4 md:p-12 lg:p-16 shadow-2xl overflow-hidden group min-h-[400px] flex flex-col items-center justify-between card-3d">
        {/* Top Accent Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Mode Selector */}
        <div className="relative z-10 flex flex-wrap justify-center gap-1.5 md:gap-3">
          {(Object.keys(MODE_CONFIG) as Mode[]).map((m) => {
            const Icon = MODE_CONFIG[m].icon;
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => changeMode(m)}
                className={cn(
                  "flex items-center gap-1.5 md:gap-3 px-3 md:px-6 py-2 md:py-3 rounded-xl text-[8px] md:text-[10px] font-bold uppercase tracking-widest transition-all duration-500",
                  active 
                    ? "bg-primary text-white shadow-2xl shadow-primary/30 scale-105" 
                    : "bg-background text-text-muted hover:bg-surface-hover border border-surface-border"
                )}
              >
                <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="whitespace-nowrap">{MODE_CONFIG[m].title}</span>
              </button>
            );
          })}
        </div>

        {/* Timer Display */}
        <div className="relative my-8 md:my-12">
          {/* Circular Container */}
          <div className="relative w-56 h-56 md:w-72 md:h-72 lg:w-[340px] lg:h-[340px] rounded-full border-[12px] md:border-[20px] border-background flex flex-col items-center justify-center shadow-inner overflow-hidden">
            <span className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-secondary tracking-[-0.04em] leading-none">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="mt-4 text-xs md:text-sm font-bold text-primary/40 uppercase tracking-[0.3em]">
              {mode === 'foco' ? 'FOCO' : mode === 'curto' ? 'PAUSA' : 'PAUSA LONGA'}
            </span>
            
            {/* Background progress fill if active */}
            <motion.div 
              className="absolute inset-0 bg-primary/5 -z-10 origin-bottom"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: isActive ? 1 : 0 }}
              transition={{ duration: 1 }}
            />
          </div>
          
          {/* Center Glow */}
          <div className={cn(
            "absolute inset-0 bg-primary/10 rounded-full blur-[100px] -z-10 transition-opacity duration-1000",
            isActive ? "opacity-100" : "opacity-0"
          )} />
        </div>

        {/* Controls */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full sm:w-auto px-4 sm:px-0">
          <button 
            onClick={toggleTimer}
            className={cn(
              "h-14 md:h-16 w-full sm:w-auto px-8 md:px-12 rounded-2xl flex items-center justify-center gap-3 text-white font-bold text-sm uppercase tracking-widest transition-all duration-500 transform active:scale-95 shadow-xl",
              isActive 
                ? "bg-secondary hover:bg-secondary/90 shadow-secondary/20" 
                : "bg-primary shadow-primary/30 hover:scale-105"
            )}
          >
            {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isActive ? 'Pausar' : 'Iniciar'}</span>
          </button>
          
          <button 
            onClick={resetTimer}
            className="h-14 md:h-16 w-full sm:w-auto px-8 md:px-12 rounded-2xl bg-background border border-surface-border text-text-muted flex items-center justify-center gap-3 font-bold text-sm uppercase tracking-widest hover:text-primary hover:bg-surface-hover transition-all active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      <Modal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        title="Configurações do Pomodoro"
      >
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tempo de Foco (min)</label>
              <input 
                type="number" 
                className="w-full bg-background border border-surface-border rounded-xl h-12 px-4 text-secondary font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={tempDurations.foco}
                onChange={(e) => setTempDurations({...tempDurations, foco: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Pausa Curta (min)</label>
              <input 
                type="number" 
                className="w-full bg-background border border-surface-border rounded-xl h-12 px-4 text-secondary font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={tempDurations.curto}
                onChange={(e) => setTempDurations({...tempDurations, curto: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Pausa Longa (min)</label>
              <input 
                type="number" 
                className="w-full bg-background border border-surface-border rounded-xl h-12 px-4 text-secondary font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={tempDurations.longo}
                onChange={(e) => setTempDurations({...tempDurations, longo: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleSaveSettings}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </Modal>
    </div>
  );
}

