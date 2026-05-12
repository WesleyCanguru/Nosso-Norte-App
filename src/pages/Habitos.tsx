import React, { useState, useEffect } from "react";
import { 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar,
  Zap,
  Loader2,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";

type Habit = {
  id: string;
  name: string;
  emoji: string;
  area: string;
  type: string;
  frequency_per_week: number;
  daily_goal?: number;
  unit?: string;
};

type HabitLog = {
  habit_id: string;
  date: string;
  completed: boolean;
};

export function Habitos() {
  const user = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<any[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(selectedWeekStart);
    day.setDate(selectedWeekStart.getDate() + i);
    return day;
  });

  useEffect(() => {
    if (user) {
      fetchHabitsAndLogs();
    }
  }, [user, selectedWeekStart]);

  const fetchHabitsAndLogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_name', user.name)
        .order('created_at', { ascending: true });

      setHabits(habitsData || []);

      const start = weekDays[0].toISOString().split('T')[0];
      const end = weekDays[6].toISOString().split('T')[0];

      const { data: logsData } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_name', user.name)
        .gte('date', start)
        .lte('date', end);

      setLogs(logsData || []);
    } catch (error) {
      console.error("Error fetching habit data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabitStatus = async (habitId: string, date: Date) => {
    if (!user) return;
    const dateStr = date.toISOString().split('T')[0];
    const existingLog = logs.find(l => l.habit_id === habitId && l.date === dateStr);
    
    let nextStatus: boolean | null = null;
    
    if (!existingLog) {
      nextStatus = true;
    } else if (existingLog.completed === true) {
      nextStatus = false;
    } else {
      nextStatus = null;
    }

    try {
      if (nextStatus === null) {
        await supabase
          .from('habit_logs')
          .delete()
          .eq('user_name', user.name)
          .eq('habit_id', habitId)
          .eq('date', dateStr);
        
        setLogs(prev => prev.filter(l => !(l.habit_id === habitId && l.date === dateStr)));
      } else {
        const { data: newLog } = await supabase
          .from('habit_logs')
          .upsert({
            user_name: user.name,
            habit_id: habitId,
            date: dateStr,
            completed: nextStatus,
            value: 1
          }, { onConflict: 'user_name,habit_id,date' })
          .select()
          .single();

        if (newLog) {
          setLogs(prev => {
            const filtered = prev.filter(l => !(l.habit_id === habitId && l.date === dateStr));
            return [...filtered, newLog];
          });
        }
      }
    } catch (error) {
      console.error("Error toggling habit status:", error);
    }
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const changeWeek = (direction: number) => {
    const next = new Date(selectedWeekStart);
    next.setDate(selectedWeekStart.getDate() + (direction * 7));
    setSelectedWeekStart(next);
  };

  if (loading && habits.length === 0) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-16 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-12 px-4 md:px-0">
        <div className="space-y-4 md:space-y-6">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
            <Calendar className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">ARQUITETURA DE ROTINA / 0&bull;2</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-secondary leading-[0.9] tracking-[-0.04em] uppercase">
            REGISTRO<br />
            <span className="text-accent italic font-medium">DIÁRIO.</span>
          </h1>
          <p className="text-text-muted text-lg md:text-xl font-light max-w-md">“Transforme a consistência em um monumento ao seu propósito.”</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6">
          <div className="flex items-center justify-between gap-3 bg-surface border border-surface-border rounded-2xl p-1.5 md:p-2 transition-all hover:shadow-2xl hover:shadow-primary/5 duration-700">
            <button 
              onClick={() => changeWeek(-1)}
              className="p-3 md:p-4 hover:bg-primary/5 rounded-xl transition-all text-text-muted hover:text-primary group"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="px-4 md:px-8 py-2 md:py-3 text-[9px] md:text-[11px] font-bold text-secondary uppercase tracking-[0.2em] md:tracking-[0.4em] min-w-[120px] md:min-w-[200px] text-center border-l border-r border-surface-border">
              {formatMonth(selectedWeekStart)}
            </div>
            <button 
              onClick={() => changeWeek(1)}
              className="p-3 md:p-4 hover:bg-primary/5 rounded-xl transition-all text-text-muted hover:text-primary group"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <button 
            onClick={() => navigate('/metas')}
            className="h-14 md:h-16 bg-secondary text-white px-8 md:px-10 rounded-2xl font-bold text-[10px] md:text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-secondary/30 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-700" />
            <span>Arquitetar Hábito</span>
          </button>
        </div>
      </header>

      <div className="bg-surface border border-surface-border rounded-[2rem] md:rounded-[3.5rem] shadow-2xl shadow-primary/5 overflow-hidden card-3d mx-2 md:mx-0">
        <div className="overflow-x-auto overflow-y-visible scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[800px] md:min-w-[1000px]">
            <thead>
              <tr className="border-b border-surface-border bg-surface-hover/30">
                <th className="p-8 md:p-12 font-bold text-[9px] md:text-[10px] text-text-muted uppercase tracking-[0.2em] md:tracking-[0.4em] w-[300px] md:w-[400px]">IDENTIDADE / HÁBITO</th>
                {weekDays.map((date, i) => (
                  <th key={i} className="p-2 md:p-4 text-center">
                    <div className={cn(
                      "inline-flex flex-col items-center justify-center w-14 h-16 md:w-20 md:h-24 rounded-xl md:rounded-2xl transition-all duration-1000",
                      date.toDateString() === new Date().toDateString() ? "bg-secondary text-white shadow-[0_20px_40px_rgba(74,53,47,0.3)] scale-110" : "text-text-muted"
                    )}>
                      <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.3em] opacity-60 mb-1 md:mb-3">
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-lg md:text-2xl font-display font-bold leading-none tracking-tight">{date.getDate()}</span>
                    </div>
                  </th>
                ))}
                <th className="p-4 md:p-8 w-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {habits.map((habit) => (
                <tr key={habit.id} className="group hover:bg-primary/[0.02] transition-all duration-500">
                  <td className="p-8 md:p-12">
                    <div className="flex items-center gap-4 md:gap-8">
                      <div 
                        className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-sm transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 border border-black/5"
                        style={{ backgroundColor: habit.color || '#5E6E5A' }}
                      >
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-secondary text-xl md:text-3xl group-hover:text-primary transition-colors tracking-tight uppercase leading-tight">{habit.name}</h3>
                        <p className="text-[8px] md:text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 md:gap-3 mt-1 md:mt-2">
                           <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />
                           {habit.area || "Geral"}
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  {weekDays.map((date, i) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const log = logs.find(l => l.habit_id === habit.id && l.date === dateStr);
                    const isDone = log?.completed === true;
                    const isFailed = log?.completed === false;

                    return (
                      <td key={i} className="p-2 md:p-4 text-center">
                        <button 
                          onClick={() => toggleHabitStatus(habit.id, date)}
                          className={cn(
                            "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center transition-all duration-700 transform active:scale-90",
                            isDone ? "bg-primary text-white shadow-2xl shadow-primary/30 scale-110" :
                            isFailed ? "bg-accent/10 border border-accent/20 text-accent" :
                            "bg-background border border-surface-border text-transparent hover:border-primary hover:bg-primary/5 group-hover:border-surface-border/80"
                          )}
                        >
                          {isDone && <Check className="w-6 h-6 md:w-8 md:h-8 stroke-[3]" />}
                          {isFailed && <X className="w-6 h-6 md:w-8 md:h-8 stroke-[3]" />}
                        </button>
                      </td>
                    );
                  })}

                  <td className="p-4 md:p-8 w-1"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

