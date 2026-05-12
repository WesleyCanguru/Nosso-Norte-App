import { useNavigate } from "react-router-dom";
import { 
  Zap, 
  Flame, 
  ListTodo, 
  ChevronRight, 
  ArrowRight,
  TrendingUp,
  Target,
  Calendar
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useCycle } from "@/hooks/useCycle";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Dashboard() {
  const navigate = useNavigate();
  const user = useUser();
  const { cycle } = useCycle();
  const [loading, setLoading] = useState(true);
  const [todayHabits, setTodayHabits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [stats, setStats] = useState({
    habitsDone: 0,
    totalHabits: 0,
    weeklyAdherence: 0,
    activeTasks: 0,
    urgentTasks: 0,
    maxStreak: 0
  });

  const getCycleProgress = () => {
    if (!cycle) return null;
    const start = parseISO(cycle.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const totalDays = 84; 
    const progress = Math.min(Math.max((diffDays / totalDays) * 100, 0), 100);
    const currentDay = Math.min(Math.max(diffDays, 0), totalDays);
    return { currentDay, totalDays, progress };
  };

  const cycleInfo = getCycleProgress();

  const todayDate = new Date();
  const todayStr = format(todayDate, 'yyyy-MM-dd');

  const startOfWeekDate = new Date(todayDate);
  const day = startOfWeekDate.getDay();
  const diff = startOfWeekDate.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeekDate.setDate(diff);
  const startOfWeekStr = format(startOfWeekDate, 'yyyy-MM-dd');

  const endOfWeekDate = new Date(startOfWeekDate);
  endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
  const endOfWeekStr = format(endOfWeekDate, 'yyyy-MM-dd');

  useEffect(() => {
    let isValid = true;
    
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      console.log("Fetching dashboard data for user:", user.name, "Cycle:", cycle?.id);
      
      try {
        const { data: habits } = await supabase.from('habits').select('*').eq('user_name', user.name);
        const { data: logs } = await supabase.from('habit_logs')
          .select('*')
          .eq('user_name', user.name)
          .gte('date', startOfWeekStr)
          .lte('date', endOfWeekStr);
        const { data: dddTasks } = await supabase.from('tasks').select('*').eq('user_name', user.name).eq('completed', false);
        
        let outcomesData: any[] = [];
        if (cycle) {
          console.log("Fetching outcomes for cycle:", cycle.id);
          const { data: goals, error: goalsError } = await supabase
            .from('cycle_outcomes')
            .select('*')
            .eq('cycle_id', cycle.id)
            .eq('user_name', user.name);
          
          if (goalsError) {
            console.error("Error fetching outcomes:", goalsError);
          } else {
            outcomesData = goals || [];
            console.log("Outcomes found:", outcomesData.length);
          }
        } else {
          console.warn("No active cycle found for user, skipping outcomes fetch.");
        }

        if (!isValid) return;

        const mappedHabits = habits?.map(h => {
          const weeklyCompletions = logs?.filter(l => l.habit_id === h.id && l.completed === true).length || 0;
          const isDoneToday = logs?.find(l => l.habit_id === h.id && l.date === todayStr && l.completed === true);
          const isTheoreticallyDone = weeklyCompletions >= (h.frequency_per_week || 7);
          return {
            ...h,
            done: !!isDoneToday || isTheoreticallyDone,
            isTheoreticallyDone: !isDoneToday && isTheoreticallyDone
          };
        }) || [];

        const totalHabits = mappedHabits.length;
        const habitsDone = mappedHabits.filter(h => h.done).length;

        setTodayHabits(mappedHabits);
        setTasks(dddTasks || []);
        setOutcomes(outcomesData);

        setStats({
          habitsDone,
          totalHabits,
          weeklyAdherence: 0,
          activeTasks: dddTasks?.length || 0,
          urgentTasks: dddTasks?.filter(t => t.type === 'tem_que').length || 0,
          maxStreak: 0
        });

      } catch (error) {
        if (!isValid) return;
        console.error("Error fetching dashboard data:", error);
      } finally {
        if (isValid) setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }

    return () => {
      isValid = false;
    };
  }, [user, cycle]);

  const toggleHabitStatus = async (habitId: string) => {
    if (!user) return;
    
    const habit = todayHabits.find(h => h.id === habitId);
    if (!habit || habit.isTheoreticallyDone) return;

    const nextStatus = !habit.done;

    try {
      // Otimistic update
      setTodayHabits(prev => prev.map(h => 
        h.id === habitId ? { ...h, done: nextStatus } : h
      ));
      
      setStats(prev => ({
        ...prev,
        habitsDone: nextStatus ? prev.habitsDone + 1 : prev.habitsDone - 1
      }));

      // Find existing log to avoid upsert
      const { data: existingLog } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_name', user.name)
        .eq('habit_id', habitId)
        .eq('date', todayStr)
        .maybeSingle();

      if (nextStatus) {
        if (existingLog) {
          await supabase
            .from('habit_logs')
            .update({ completed: true, value: 1 })
            .eq('id', existingLog.id);
        } else {
          await supabase
            .from('habit_logs')
            .insert({
              user_name: user.name,
              habit_id: habitId,
              date: todayStr,
              completed: true,
              value: 1
            });
        }
      } else {
        if (existingLog) {
          await supabase
            .from('habit_logs')
            .delete()
            .eq('id', existingLog.id);
        }
      }
    } catch (error) {
      console.error("Error toggling habit status:", error);
      // Revert if error
      fetchDashboardData();
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section - The "Foda" Look */}
      <section className="relative overflow-visible group text-white">
        <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="relative overflow-hidden rounded-[2.5rem] bg-secondary text-white p-8 md:p-10 lg:p-12 shadow-[0_40px_80px_-20px_rgba(74,53,47,0.3)]">
          {/* Animated Background Elements */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 lg:gap-16 relative z-10">
            <div className="space-y-6 md:space-y-8 max-w-2xl">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#5A8D6E]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/70">
                  {getGreeting()} • {user?.name.split(' ')[0]}
                </span>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold leading-[0.9] tracking-[-0.04em] uppercase">
                  Rumo ao<br />
                  seu <span className="text-accent italic font-medium">norte.</span>
                </h1>

                {cycle && cycleInfo && (
                  <div className="pt-2 space-y-4 max-w-sm">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span>DIA {cycleInfo.currentDay} / {cycleInfo.totalDays}</span>
                      </div>
                      <span>{Math.round(cycleInfo.progress)}% DO CICLO</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${cycleInfo.progress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-primary shadow-[0_0_10px_rgba(45,79,60,0.5)]"
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-white/30 tracking-[0.2em] uppercase">
                      <span>Início: {format(parseISO(cycle.start_date), "dd/MM/yy")}</span>
                      <span>Fim: {format(parseISO(cycle.end_date || cycle.start_date), "dd/MM/yy")}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-white/60 text-base md:text-lg font-light leading-relaxed max-w-md">
                “Um ciclo por vez, moldando a intenção em arquitetura de vida.”
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <button 
                   onClick={() => navigate("/habitos")}
                  className="bg-primary text-white h-12 md:h-14 px-8 md:px-10 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 shadow-2xl shadow-primary/30 group"
                >
                  Continuar jornada
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </button>
                
                <button 
                  onClick={() => navigate("/pomodoro")}
                  className="bg-white/5 backdrop-blur-md text-white border border-white/10 h-12 md:h-14 px-8 md:px-10 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  Focar agora
                </button>
              </div>
            </div>

            {/* Massive Progress Circle */}
            <div className="relative group cursor-pointer flex justify-center lg:justify-end" onClick={() => navigate("/habitos")}>
              <div className="relative w-56 h-56 md:w-64 md:h-64 lg:w-[320px] lg:h-[320px] transition-transform duration-1000 group-hover:scale-105">
                <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_40px_rgba(45,79,60,0.3)]">
                  <circle cx="50%" cy="50%" r="42%" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="42%"
                    fill="transparent"
                    stroke="#5A8D6E"
                    strokeWidth="10"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "264 264", strokeDashoffset: 264 }}
                    animate={{ strokeDashoffset: 264 - (264 * (stats.habitsDone / (stats.totalHabits || 1))) }}
                    transition={{ duration: 2.5, ease: "circOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[10px] font-bold text-accent uppercase tracking-[0.5em] mb-2 md:mb-3 opacity-70">Progresso</div>
                  <div className="text-5xl md:text-7xl lg:text-[6.5rem] font-display font-bold text-white flex items-baseline gap-2">
                    <span className="tracking-[-0.08em]">{stats.totalHabits > 0 ? Math.round((stats.habitsDone / stats.totalHabits) * 100) : 0}</span>
                    <span className="text-xl md:text-3xl lg:text-4xl opacity-20 font-bold tracking-tight">%</span>
                  </div>
                  <div className="mt-3 md:mt-6 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
                    <Zap className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-[9px] font-bold text-white/70 uppercase tracking-[0.2em] leading-none">
                      {stats.habitsDone}/{stats.totalHabits} COMPLETOS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards - 3D Floating Effect */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="ADERÊNCIA" 
          value={`${stats.weeklyAdherence}%`} 
          subtext="Semana atual" 
          icon={TrendingUp}
          color="text-primary"
        />
        <StatCard 
          label="MAIOR STREAK" 
          value={`${stats.maxStreak}d`} 
          subtext="Recorde absoluto" 
          icon={Flame}
          color="text-accent"
        />
        <StatCard 
          label="DDD" 
          value={stats.activeTasks.toString()} 
          subtext={`${stats.urgentTasks} urgentes`} 
          icon={ListTodo}
          color="text-secondary"
        />
      </div>

      {/* Goals Section (Full Width) */}
      <div className="space-y-6 mb-12">
        <div className="flex items-end justify-between px-2 md:px-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-secondary uppercase tracking-tight">Grandes Vitórias</h2>
            <p className="text-text-muted mt-1 font-medium text-[10px] md:text-xs">As metas inegociáveis do seu ciclo de 12 semanas.</p>
          </div>
          <button onClick={() => navigate("/metas")} className="text-[9px] font-bold text-primary uppercase tracking-[0.3em] hover:opacity-70 transition-opacity">Ver Todas</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {outcomes.length > 0 ? outcomes.map((goal, i) => (
            <motion.div 
              key={goal.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
              className="group p-6 md:p-8 rounded-3xl border border-surface-border transition-all duration-700 flex flex-col justify-between h-40 md:h-48 card-3d bg-surface hover:border-primary/20"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl border border-primary/10 bg-primary/5 flex items-center justify-center text-primary transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6">
                  <Target className="w-5 h-5 md:w-6 md:h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-display font-bold text-secondary group-hover:text-primary transition-colors uppercase tracking-tight line-clamp-2 leading-tight">{goal.title}</h3>
                <div className="flex items-center gap-3 mt-1.5 md:mt-2">
                   <p className="text-[8px] md:text-[9px] font-bold text-text-muted uppercase tracking-widest">META INEGOCIÁVEL</p>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-4 py-8 md:py-16 bg-surface-hover/20 rounded-3xl border border-dashed border-surface-border flex flex-col items-center justify-center gap-3">
              <Target className="w-8 h-8 text-text-muted/30" />
              <p className="text-[10px] md:text-xs font-bold text-text-muted uppercase tracking-widest text-center px-4">Nenhuma meta definida para este ciclo</p>
              <button onClick={() => navigate("/metas")} className="text-[9px] font-bold text-primary underline decoration-primary/30 underline-offset-4 uppercase tracking-widest mt-2 hover:opacity-80">Definir agora</button>
            </div>
          )}
        </div>
      </div>

      {/* Habits & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          {/* Habits Section */}
          <div className="flex items-end justify-between px-2 md:px-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-secondary uppercase tracking-tight">Ações de hoje</h2>
              <p className="text-text-muted mt-1 font-medium text-[10px] md:text-xs">Sua rota diária rumo ao objetivo absoluto.</p>
            </div>
            <button 
              onClick={() => navigate("/habitos")}
              className="text-[9px] font-bold text-primary uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
            >
              Arquivos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayHabits.map((habit, i) => (
              <motion.div 
                key={habit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "bg-surface border border-surface-border p-4 md:p-5 rounded-2xl flex items-center gap-4 group hover:border-primary/20 transition-all card-3d",
                  habit.done ? "opacity-60 bg-primary/5" : ""
                )}
              >
                <div className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-transform group-hover:scale-105",
                  habit.done ? "grayscale contrast-125" : ""
                )} style={{ backgroundColor: habit.color || '#5E6E5A' }}>
                  <Zap className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs md:text-sm font-bold uppercase truncate transition-colors", habit.done ? "text-text-muted" : "text-secondary")}>{habit.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                    <span className="text-[8px] md:text-[9px] font-bold text-text-muted uppercase tracking-[0.2em]">{habit.area || "Geral"}</span>
                    <span className="w-1 h-1 rounded-full bg-surface-border" />
                    {habit.isTheoreticallyDone ? (
                      <span className="text-[8px] md:text-[9px] font-bold text-accent uppercase tracking-[0.2em]">Meta Semanal Cumprida</span>
                    ) : (
                      <span className="text-[8px] md:text-[9px] font-bold text-primary uppercase tracking-[0.2em]">{habit?.type === 'numeric' ? `${habit.daily_goal} ${habit.unit}` : 'Check'}</span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHabitStatus(habit.id);
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 active:scale-95 flex-shrink-0",
                    habit.done 
                      ? habit.isTheoreticallyDone
                        ? "bg-accent/20 border-accent/20 text-accent cursor-not-allowed"
                        : "bg-primary border-primary text-white shadow-md shadow-primary/20"
                      : "border-surface-border hover:border-primary hover:bg-primary/5 text-primary"
                  )}
                >
                  {habit.done 
                   ? <Zap className="w-4 h-4 md:w-5 md:h-5 fill-current" /> 
                   : <div className="w-1.5 h-1.5 rounded-full bg-surface-border group-hover:bg-primary transition-colors" />}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Urgent DDD Column */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8 pt-2">
          <div className="flex items-end justify-between px-2 md:px-0">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-secondary uppercase tracking-tight">Tem que</h2>
            <button 
              onClick={() => navigate("/ddd")}
              className="text-[9px] font-bold text-primary uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
            >
              Arquivar
            </button>
          </div>

          <div className="bg-secondary rounded-3xl p-6 md:p-8 shadow-xl shadow-secondary/20 relative overflow-hidden h-[380px] md:h-[420px] border border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-2">
              {tasks.filter(t => t.type === 'tem_que').slice(0, 8).map((task) => (
                <div 
                  key={task.id}
                  className="p-2.5 md:p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer backdrop-blur-sm"
                >
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest group-hover:text-white transition-colors truncate pr-4">{task.title}</span>
                  <ArrowRight className="w-3 h-3 text-white/20 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </div>
              ))}

              {tasks.filter(t => t.type === 'tem_que').length === 0 && (
                <div className="py-16 md:py-20 text-center flex flex-col items-center gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <Target className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.4em] italic leading-tight">Mente limpa, <br />vácuo criativo.</p>
                </div>
              )}
            </div>
            
            <div className="absolute bottom-6 left-6 right-6 pt-4 border-t border-white/5">
              <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.5em] block text-center">ARQUIVO DE DEMANDAS / 0&bull;2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, icon: Icon, color }: any) {
  return (
    <div className="group bg-surface border border-surface-border rounded-[2rem] p-8 card-3d relative overflow-hidden">
      <div className={cn("absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 transform rotate-12 scale-125 unselectable")}>
        <Icon className="w-32 h-32" />
      </div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em]">{label}</span>
          <div className={cn("p-3 rounded-xl transition-all duration-700 shadow-sm", color.replace('text-', 'bg-').split(' ')[0].concat('/10'))}>
            <Icon className={cn("w-5 h-5", color)} />
          </div>
        </div>
        <div className="text-5xl md:text-6xl font-display font-bold text-secondary mb-2 tracking-[-0.1em]">{value}</div>
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] flex items-center gap-2">
          {subtext}
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
        </div>
      </div>
    </div>
  );
}

