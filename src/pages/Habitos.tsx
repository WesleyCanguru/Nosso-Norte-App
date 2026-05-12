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
import { format } from "date-fns";

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

      const start = format(weekDays[0], 'yyyy-MM-dd');
      const end = format(weekDays[6], 'yyyy-MM-dd');

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
    const dateStr = format(date, 'yyyy-MM-dd');
    console.log("Toggling habit", habitId, "on date", dateStr);
    
    const existingLog = logs.find(l => l.habit_id === habitId && l.date === dateStr);
    console.log("Existing log:", existingLog);
    
    let nextStatus: boolean | null = null;
    
    if (!existingLog) {
      nextStatus = true; // No log -> DONE
    } else if (existingLog.completed === true) {
      nextStatus = false; // DONE -> FAILED (X)
    } else {
      nextStatus = null; // FAILED (X) -> CLEAR (Delete)
    }

    console.log("Next status will be:", nextStatus);

    try {
      if (nextStatus === null) {
        console.log("Deleting log for", habitId, "on", dateStr);
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('user_name', user.name)
          .eq('habit_id', habitId)
          .eq('date', dateStr);
        
        if (error) throw error;
        setLogs(prev => prev.filter(l => !(l.habit_id === habitId && l.date === dateStr)));
      } else {
        console.log("Updating log for", habitId, "with completed=", nextStatus);
        
        // Use select/insert/update to avoid upsert 409 conflict
        let logResult;
        
        if (existingLog) {
          const { data, error } = await supabase
            .from('habit_logs')
            .update({
              completed: nextStatus,
              value: nextStatus ? 1 : 0
            })
            .eq('id', existingLog.id)
            .select()
            .maybeSingle();
            
          if (error) throw error;
          logResult = data;
        } else {
          const { data, error } = await supabase
            .from('habit_logs')
            .insert({
              user_name: user.name,
              habit_id: habitId,
              date: dateStr,
              completed: nextStatus,
              value: nextStatus ? 1 : 0
            })
            .select()
            .maybeSingle();
            
          if (error) throw error;
          logResult = data;
        }

        if (logResult) {
          console.log("Update successful, updating local state");
          setLogs(prev => {
            const filtered = prev.filter(l => !(l.habit_id === habitId && l.date === dateStr));
            return [...filtered, logResult];
          });
        } else {
          console.warn("Operation returned no data, refetching...");
          fetchHabitsAndLogs();
        }
      }
    } catch (error) {
      console.error("Error toggling habit status:", error);
      fetchHabitsAndLogs();
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-12 px-2 md:px-0">
        <div className="space-y-3 md:space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
            <Calendar className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-bold text-primary uppercase tracking-[0.4em]">ARQUITETURA DE ROTINA / 0&bull;2</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-secondary leading-[0.9] tracking-[-0.04em] uppercase">
            REGISTRO<br />
            <span className="text-accent italic font-medium">DIÁRIO.</span>
          </h1>
          <p className="text-text-muted text-base md:text-lg font-light max-w-md">“Transforme a consistência em um monumento ao seu propósito.”</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center justify-between gap-3 bg-surface border border-surface-border rounded-xl p-1 md:p-1.5 transition-all hover:shadow-xl hover:shadow-primary/5">
            <button 
              onClick={() => changeWeek(-1)}
              className="p-2 md:p-3 hover:bg-primary/5 rounded-lg transition-all text-text-muted hover:text-primary group"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-bold text-secondary uppercase tracking-[0.2em] md:tracking-[0.3em] min-w-[120px] md:min-w-[180px] text-center border-l border-r border-surface-border">
              {formatMonth(selectedWeekStart)}
            </div>
            <button 
              onClick={() => changeWeek(1)}
              className="p-2 md:p-3 hover:bg-primary/5 rounded-lg transition-all text-text-muted hover:text-primary group"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <button 
            onClick={() => navigate('/metas')}
            className="h-12 md:h-14 bg-secondary text-white px-8 md:px-10 rounded-xl font-bold text-[9px] md:text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-secondary/20 group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-700" />
            <span>Novo Hábito</span>
          </button>
        </div>
      </header>

      <div className="bg-surface border border-surface-border rounded-3xl shadow-xl shadow-primary/5 overflow-hidden card-3d mx-2 md:mx-0 relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #4A352F 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        <div className="overflow-x-auto overflow-y-visible scrollbar-hide relative z-10">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-surface-border bg-surface-hover/30 backdrop-blur-md">
                <th className="p-6 md:p-10 font-bold text-[9px] text-text-muted uppercase tracking-[0.2em] md:tracking-[0.4em] w-[260px] md:w-[340px]">IDENTIDADE / HÁBITO</th>
                {weekDays.map((date, i) => (
                  <th key={i} className="p-2 md:p-4 text-center">
                    <div className={cn(
                      "inline-flex flex-col items-center justify-center w-12 h-14 md:w-16 md:h-20 rounded-xl md:rounded-2xl transition-all duration-1000",
                      date.toDateString() === new Date().toDateString() ? "bg-secondary text-white shadow-lg scale-110" : "text-text-muted"
                    )}>
                      <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-[0.1em] opacity-60 mb-1 md:mb-2">
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-base md:text-xl font-display font-bold leading-none tracking-tight">{date.getDate()}</span>
                    </div>
                  </th>
                ))}
                <th className="p-4 md:p-8 w-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {habits.map((habit) => (
                <tr key={habit.id} className="group hover:bg-primary/[0.02] transition-all duration-500">
                  <td className="p-6 md:p-10">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div 
                        className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shadow-sm transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 border border-black/5"
                        style={{ backgroundColor: habit.color || '#5E6E5A' }}
                      >
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-secondary text-lg md:text-xl group-hover:text-primary transition-colors tracking-tight uppercase leading-tight">{habit.name}</h3>
                        <p className="text-[7px] md:text-[9px] text-text-muted font-bold uppercase tracking-[0.2em] flex items-center gap-2 mt-1 md:mt-1.5">
                           <span className="w-1 h-1 rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />
                           {habit.area || "Geral"}
                           <span className="w-1 h-1 rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />
                           <span className="text-primary">{habit.frequency_per_week}x/SEMANA</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  {weekDays.map((date, i) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const log = logs.find(l => l.habit_id === habit.id && l.date === dateStr);
                    const isDone = log?.completed === true;
                    const isFailed = log?.completed === false;

                    return (
                      <td key={i} className="p-2 md:p-4 text-center">
                        <button 
                          onClick={() => toggleHabitStatus(habit.id, date)}
                          className={cn(
                            "w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-700 transform active:scale-90",
                            isDone ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110" :
                            isFailed ? "bg-accent/10 border border-accent/20 text-accent" :
                            "bg-background border border-surface-border text-transparent hover:border-primary hover:bg-primary/5 group-hover:border-surface-border/80"
                          )}
                        >
                          {isDone && <Check className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />}
                          {isFailed && <X className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />}
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

