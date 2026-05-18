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
  Sparkles,
  GripVertical
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { format } from "date-fns";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type Habit = {
  id: string;
  name: string;
  emoji: string;
  area: string;
  type: string;
  frequency_per_week: number;
  daily_goal?: number;
  unit?: string;
  position?: number;
  color?: string;
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
  const [goals, setGoals] = useState<any[]>([]);
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

  const weeklyProgress = React.useMemo(() => {
    if (habits.length === 0) return 0;
    const totalRequired = habits.reduce((acc, h) => acc + (h.frequency_per_week || 0), 0);
    const completed = logs.filter(l => l.completed).length;
    return totalRequired > 0 ? Math.min(100, Math.round((completed / totalRequired) * 100)) : 0;
  }, [habits, logs]);

  useEffect(() => {
    if (user) {
      fetchHabitsAndLogs();
    }
  }, [user, selectedWeekStart]);

  const fetchHabitsAndLogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [habitsRes, goalsRes] = await Promise.all([
        supabase
          .from('habits')
          .select('*')
          .eq('user_name', user.name)
          .order('position', { ascending: true }),
        supabase
          .from('cycle_outcomes')
          .select('*')
          .eq('user_name', user.name)
          .order('created_at', { ascending: true })
      ]);

      setHabits(habitsRes.data || []);
      setGoals(goalsRes.data || []);

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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceGoalId = source.droppableId === 'unlinked' ? null : source.droppableId;
    const destGoalId = destination.droppableId === 'unlinked' ? null : destination.droppableId;

    const newHabits = [...habits];

    const sourceHabits = newHabits.filter(h => h.goal_id === sourceGoalId);
    const destHabits = sourceGoalId === destGoalId ? sourceHabits : newHabits.filter(h => h.goal_id === destGoalId);

    const [movedHabit] = sourceHabits.splice(source.index, 1);
    
    if (sourceGoalId !== destGoalId) {
      movedHabit.goal_id = destGoalId;
    }

    destHabits.splice(destination.index, 0, movedHabit);

    const updatedHabitsToSave: typeof habits = [];

    const updateGroupPositions = (groupArray: typeof habits) => {
      groupArray.forEach((h, idx) => {
        const globalRef = newHabits.find(item => item.id === h.id);
        if (globalRef && (globalRef.position !== idx || globalRef.goal_id !== h.goal_id)) {
           globalRef.position = idx;
           updatedHabitsToSave.push(globalRef);
        }
      });
    };

    if (sourceGoalId === destGoalId) {
       updateGroupPositions(destHabits);
    } else {
       updateGroupPositions(sourceHabits);
       updateGroupPositions(destHabits);
    }

    // Assign positions to all habits to be sure
    const finalHabits = [...habits].map(h => {
       const found = updatedHabitsToSave.find(u => u.id === h.id);
       return found ? { ...h, position: found.position, goal_id: found.goal_id } : h;
    });
    
    // Actually, it's better to just reconstruct newHabits to match visually immediately
    const reorderedHabits: typeof habits = [];
    [...goals, { id: null, title: '' }].forEach(g => {
        const goalId = g.id;
        const group = finalHabits.filter(h => h.goal_id === goalId).sort((a,b) => (a.position || 0) - (b.position || 0));
        reorderedHabits.push(...group);
    });

    setHabits(reorderedHabits);

    for (const h of updatedHabitsToSave) {
        supabase.from('habits').update({ position: h.position, goal_id: h.goal_id }).eq('id', h.id).then();
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
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 px-2 md:px-0">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10">
            <Calendar className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] font-bold text-primary uppercase tracking-[0.4em]">ARQUITETURA DE ROTINA / 0&bull;2</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-secondary leading-[0.9] tracking-[-0.04em] uppercase">
            REGISTRO<br />
            <span className="text-accent italic font-medium">DIÁRIO.</span>
          </h1>
          <p className="text-text-muted text-sm md:text-base font-light max-w-sm">“Transforme a consistência em um monumento ao seu propósito.”</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm border border-primary/10 px-5 py-3 rounded-2xl shadow-sm">
            <div className="space-y-1">
              <p className="text-[8px] font-bold text-text-muted uppercase tracking-[0.2em]">Score da Semana</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-display font-bold text-primary">{weeklyProgress}%</span>
                <div className="w-24 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${weeklyProgress}%` }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center justify-between gap-2 bg-surface border border-surface-border rounded-xl p-1 md:p-1.5 transition-all hover:shadow-xl hover:shadow-primary/5">
              <button 
                onClick={() => changeWeek(-1)}
                className="p-2 md:p-2.5 hover:bg-primary/5 rounded-lg transition-all text-text-muted hover:text-primary group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="px-3 md:px-4 py-2 text-[8px] md:text-[9px] font-bold text-secondary uppercase tracking-[0.2em] md:tracking-[0.3em] min-w-[100px] md:min-w-[140px] text-center border-l border-r border-surface-border">
                {formatMonth(selectedWeekStart)}
              </div>
              <button 
                onClick={() => changeWeek(1)}
                className="p-2 md:p-2.5 hover:bg-primary/5 rounded-lg transition-all text-text-muted hover:text-primary group"
              >
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <button 
              onClick={() => navigate('/metas')}
              className="h-10 md:h-12 bg-secondary text-white px-6 md:px-8 rounded-xl font-bold text-[8px] md:text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-secondary/20 group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-700" />
              <span>Novo Hábito</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-surface border border-surface-border rounded-2xl md:rounded-3xl shadow-xl shadow-primary/5 overflow-hidden card-3d mx-2 md:mx-0 relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #4A352F 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        <div className="overflow-x-auto overflow-y-visible scrollbar-hide relative z-10">
          <table className="w-full text-left border-collapse min-w-[600px] md:min-w-[800px]">
            <thead>
              <tr className="border-b border-surface-border bg-surface-hover/30 backdrop-blur-md">
                <th className="p-4 md:p-6 font-bold text-[8px] text-text-muted uppercase tracking-[0.2em] md:tracking-[0.4em] w-[200px] md:w-[280px] pl-6 md:pl-8">IDENTIDADE / HÁBITO</th>
                {weekDays.map((date, i) => (
                  <th key={i} className="p-1 md:p-2 text-center">
                    <div className={cn(
                      "inline-flex flex-col items-center justify-center w-10 h-12 md:w-14 md:h-16 rounded-xl transition-all duration-1000",
                      date.toDateString() === new Date().toDateString() ? "bg-secondary text-white shadow-lg scale-110" : "text-text-muted"
                    )}>
                      <span className="text-[6px] md:text-[8px] font-bold uppercase tracking-[0.1em] opacity-60 mb-0.5 md:mb-1">
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-sm md:text-lg font-display font-bold leading-none tracking-tight">{date.getDate()}</span>
                    </div>
                  </th>
                ))}
                <th className="p-4 md:p-6 font-bold text-[8px] text-text-muted uppercase tracking-[0.4em] text-center">%</th>
                <th className="p-2 md:p-4 w-1"></th>
              </tr>
            </thead>
            <DragDropContext onDragEnd={handleDragEnd}>
              {[...goals, { id: null, title: 'Hábitos de Manutenção' }].map((group) => {
                const groupHabits = habits.filter(h => h.goal_id === group.id || (!h.goal_id && group.id === null));
                if (groupHabits.length === 0) return null;
                const groupId = group.id || 'unlinked';

                return (
                  <React.Fragment key={groupId}>
                    <tbody className="divide-y divide-surface-border">
                      <tr className="bg-surface-hover/20">
                        <td colSpan={10} className="px-6 py-3 border-y border-surface-border/50">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              group.id ? "bg-primary" : "bg-accent"
                            )} />
                            <span className="text-[9px] font-bold text-secondary uppercase tracking-[0.3em] font-display">
                              {group.title}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                    <Droppable droppableId={groupId} direction="vertical" type="habit">
                      {(provided) => (
                        <tbody 
                          className="divide-y divide-surface-border"
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                        >
                          {groupHabits.map((habit, index) => {
                            const habitLogs = logs.filter(l => l.habit_id === habit.id && l.completed);
                            const completionRate = habit.frequency_per_week > 0 
                              ? Math.min(100, Math.round((habitLogs.length / habit.frequency_per_week) * 100))
                              : 0;

                            return (
                              <React.Fragment key={habit.id}>
                                {/* @ts-ignore */}
                                <Draggable draggableId={habit.id} index={index}>
                                {(provided, snapshot) => (
                                  <tr 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={cn(
                                      "group transition-all duration-500",
                                      snapshot.isDragging ? "bg-background shadow-2xl z-50 scale-[1.01]" : "hover:bg-primary/[0.02]"
                                    )}
                                    style={{ display: snapshot.isDragging ? 'table' : '', ...provided.draggableProps.style }}
                                  >
                                    <td className="p-4 md:p-6 pl-2 md:pl-4 relative">
                                      <div className="flex items-center gap-2 relative">
                                        <div 
                                          {...provided.dragHandleProps} 
                                          className="text-surface-border hover:text-text-muted cursor-grab active:cursor-grabbing p-1 opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
                                        >
                                          <GripVertical className="w-4 h-4" />
                                        </div>
                                        <div 
                                          className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-sm transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 border border-black/5 flex-shrink-0"
                                          style={{ backgroundColor: habit.color || '#5E6E5A' }}
                                        >
                                          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                          <h3 className="font-display font-bold text-secondary text-sm md:text-lg group-hover:text-primary transition-colors tracking-tight uppercase leading-tight truncate">{habit.name}</h3>
                                          <p className="text-[6px] md:text-[8px] text-text-muted font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 mt-0.5 md:mt-1">
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
                                        <td key={i} className="p-1 md:p-2 text-center">
                                          <button 
                                            onClick={() => toggleHabitStatus(habit.id, date)}
                                            className={cn(
                                              "w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-all duration-700 mx-auto",
                                              isDone ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110" :
                                              isFailed ? "bg-accent/10 border border-accent/20 text-accent" :
                                              "bg-background border border-surface-border text-transparent hover:border-primary hover:bg-primary/5 group-hover:border-surface-border/80"
                                            )}
                                          >
                                            {isDone && <Check className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3]" />}
                                            {isFailed && <X className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3]" />}
                                          </button>
                                        </td>
                                      );
                                    })}
  
                                    <td className="p-4 md:p-6 text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <span className={cn(
                                          "text-[10px] font-display font-bold",
                                          completionRate >= 100 ? "text-primary" : "text-secondary"
                                        )}>
                                          {completionRate}%
                                        </span>
                                        <div className="w-10 h-1 bg-surface-border rounded-full overflow-hidden">
                                          <div className="h-full bg-primary transition-all duration-700" style={{ width: `${completionRate}%` }} />
                                        </div>
                                      </div>
                                    </td>
        
                                    <td className="p-2 md:p-4 w-1"></td>
                                  </tr>
                                )}
                              </Draggable>
                              </React.Fragment>
                            );
                          })}
                          {provided.placeholder}
                        </tbody>
                      )}
                    </Droppable>
                  </React.Fragment>
                );
              })}
            </DragDropContext>
          </table>
        </div>
      </div>

    </div>
  );
}

