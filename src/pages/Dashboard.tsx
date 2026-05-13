import { useNavigate } from "react-router-dom";
import { 
  Zap, 
  Flame, 
  ListTodo, 
  ChevronRight, 
  ArrowRight,
  TrendingUp,
  Target,
  Calendar,
  Clock,
  Sparkles
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useCycle } from "@/hooks/useCycle";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Modal } from "@/components/Modal";

export function Dashboard() {
  const navigate = useNavigate();
  const user = useUser();
  const { cycle } = useCycle();
  const [loading, setLoading] = useState(true);
  const [todayHabits, setTodayHabits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
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

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
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
        const { data: goals } = await supabase
          .from('cycle_outcomes')
          .select('*')
          .eq('cycle_id', cycle.id)
          .eq('user_name', user.name);
        outcomesData = goals || [];
      }

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

      setTodayHabits(mappedHabits);
      setTasks(dddTasks || []);
      setOutcomes(outcomesData);

      const totalExpectedPerWeek = habits?.reduce((acc, h) => acc + (h.frequency_per_week || 7), 0) || 0;
      const weeklyLogsCount = logs?.filter(l => l.completed).length || 0;
      const weeklyAdherence = totalExpectedPerWeek > 0 ? Math.min(100, Math.round((weeklyLogsCount / totalExpectedPerWeek) * 100)) : 0;

      setStats({
        habitsDone: mappedHabits.filter(h => h.done).length,
        totalHabits: mappedHabits.length,
        weeklyAdherence,
        activeTasks: dddTasks?.length || 0,
        urgentTasks: dddTasks?.filter(t => t.type === 'tem_que').length || 0,
        maxStreak: 0
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
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
        
        <div className="relative overflow-hidden rounded-[2rem] bg-secondary text-white p-6 md:p-8 lg:p-10 shadow-[0_30px_60px_-15px_rgba(74,53,47,0.3)]">
          {/* Animated Background Elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 lg:gap-12 relative z-10">
            <div className="space-y-6 md:space-y-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#5A8D6E]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/70">
                  {getGreeting()} • {user?.name.split(' ')[0]}
                </span>
              </div>
              
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-[0.9] tracking-[-0.04em] uppercase">
                  Rumo ao<br />
                  seu <span className="text-accent italic font-medium">norte.</span>
                </h1>

                {cycle && cycleInfo && (
                  <div className="pt-2 space-y-3 max-w-sm">
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span>DIA {cycleInfo.currentDay} / {cycleInfo.totalDays}</span>
                      </div>
                      <span>{Math.round(cycleInfo.progress)}% DO CICLO</span>
                    </div>
                    <div className="h-1 lg:h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${cycleInfo.progress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-primary shadow-[0_0_10px_rgba(45,79,60,0.5)]"
                      />
                    </div>
                    <div className="flex justify-between text-[7px] font-bold text-white/30 tracking-[0.2em] uppercase">
                      <span>Início: {format(parseISO(cycle.start_date), "dd/MM/yy")}</span>
                      <span>Fim: {format(parseISO(cycle.end_date || cycle.start_date), "dd/MM/yy")}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-white/60 text-sm md:text-base font-light leading-relaxed max-w-sm">
                “Um ciclo por vez, moldando a intenção em arquitetura de vida.”
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button 
                   onClick={() => navigate("/habitos")}
                  className="bg-primary text-white h-10 md:h-12 px-6 md:px-8 rounded-xl font-bold text-[9px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-2xl shadow-primary/30 group"
                >
                  Continuar jornada
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-2 transition-transform" />
                </button>
                
                <button 
                  onClick={() => navigate("/pomodoro")}
                  className="bg-white/5 backdrop-blur-md text-white border border-white/10 h-10 md:h-12 px-6 md:px-8 rounded-xl font-bold text-[9px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  Focar agora
                </button>
              </div>
            </div>

            {/* Massive Progress Circle */}
            <div className="relative group cursor-pointer flex justify-center lg:justify-end" onClick={() => navigate("/habitos")}>
              <div className="relative w-48 h-48 md:w-56 md:h-56 lg:w-72 lg:h-72 transition-transform duration-1000 group-hover:scale-105">
                <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_30px_rgba(45,79,60,0.3)]">
                  <circle cx="50%" cy="50%" r="42%" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="42%"
                    fill="transparent"
                    stroke="#5A8D6E"
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "264 264", strokeDashoffset: 264 }}
                    animate={{ strokeDashoffset: 264 - (264 * (stats.habitsDone / (stats.totalHabits || 1))) }}
                    transition={{ duration: 2.5, ease: "circOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[9px] font-bold text-accent uppercase tracking-[0.4em] mb-1 md:mb-2 opacity-70">Progresso</div>
                  <div className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white flex items-baseline gap-1.5">
                    <span className="tracking-[-0.08em]">{stats.totalHabits > 0 ? Math.round((stats.habitsDone / stats.totalHabits) * 100) : 0}</span>
                    <span className="text-lg md:text-2xl lg:text-3xl opacity-20 font-bold tracking-tight">%</span>
                  </div>
                  <div className="mt-2 md:mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
                    <Zap className="w-2.5 h-2.5 text-accent fill-accent" />
                    <span className="text-[8px] font-bold text-white/70 uppercase tracking-[0.2em] leading-none">
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
            <h2 className="text-xl md:text-2xl font-display font-bold text-secondary uppercase tracking-tight">Grandes Vitórias</h2>
            <p className="text-text-muted mt-1 font-medium text-[9px] md:text-[10px]">As metas inegociáveis do seu ciclo de 12 semanas.</p>
          </div>
          <button onClick={() => navigate("/metas")} className="text-[8px] md:text-[9px] font-bold text-primary uppercase tracking-[0.3em] hover:opacity-70 transition-opacity">Ver Todas</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {outcomes.length > 0 ? outcomes.map((goal, i) => (
            <motion.div 
              key={goal.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
              onClick={() => setSelectedGoal(goal)}
              className="group p-5 md:p-6 rounded-3xl border border-surface-border transition-all duration-700 flex flex-col justify-between h-36 md:h-40 card-3d bg-surface hover:border-primary/20 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-primary/10 bg-primary/5 flex items-center justify-center text-primary transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6">
                  <Target className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-base md:text-lg font-display font-bold text-secondary group-hover:text-primary transition-colors uppercase tracking-tight line-clamp-2 leading-tight">{goal.title}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                   <p className="text-[7px] md:text-[8px] font-bold text-text-muted uppercase tracking-widest">META INEGOCIÁVEL</p>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-4 py-8 md:py-12 bg-surface-hover/20 rounded-3xl border border-dashed border-surface-border flex flex-col items-center justify-center gap-3">
              <Target className="w-8 h-8 text-text-muted/30" />
              <p className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest text-center px-4">Nenhuma meta definida para este ciclo</p>
              <button onClick={() => navigate("/metas")} className="text-[8px] md:text-[9px] font-bold text-primary underline decoration-primary/30 underline-offset-4 uppercase tracking-widest mt-2 hover:opacity-80">Definir agora</button>
            </div>
          )}
        </div>
      </div>

      {/* Actions & Tasks Sections */}
      <div className="space-y-12">
        {/* Habits Section (Full Width) */}
        <div className="space-y-5">
          <div className="flex items-end justify-between px-2 md:px-0">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-secondary uppercase tracking-tight">Ações de hoje</h2>
              <p className="text-text-muted mt-1 font-medium text-[9px] md:text-[10px]">Sua rota diária rumo ao objetivo absoluto.</p>
            </div>
            <button 
              onClick={() => navigate("/habitos")}
              className="text-[8px] md:text-[9px] font-bold text-primary uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
            >
              Arquivos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {todayHabits.map((habit, i) => (
              <motion.div 
                key={habit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "bg-surface border border-surface-border p-3 md:p-4 rounded-2xl flex items-center gap-3 md:gap-4 group hover:border-primary/20 transition-all card-3d",
                  habit.done ? "opacity-60 bg-primary/5" : ""
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-transform group-hover:scale-105",
                  habit.done ? "grayscale contrast-125" : ""
                )} style={{ backgroundColor: habit.color || '#5E6E5A' }}>
                  <Zap className="w-4 h-4 md:w-5 md:h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn("text-[10px] md:text-xs font-bold uppercase truncate transition-colors", habit.done ? "text-text-muted" : "text-secondary")}>{habit.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 md:mt-1">
                    <span className="text-[7px] md:text-[8px] font-bold text-text-muted uppercase tracking-[0.2em]">{habit.area || "Geral"}</span>
                    <span className="w-1 h-1 rounded-full bg-surface-border" />
                    {habit.isTheoreticallyDone ? (
                      <span className="text-[7px] md:text-[8px] font-bold text-accent uppercase tracking-[0.2em]">Meta Semanal Cumprida</span>
                    ) : (
                      <span className="text-[7px] md:text-[8px] font-bold text-primary uppercase tracking-[0.2em]">{habit?.type === 'numeric' ? `${habit.daily_goal} ${habit.unit}` : 'Check'}</span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHabitStatus(habit.id);
                  }}
                  className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center transition-all duration-300 active:scale-95 flex-shrink-0",
                    habit.done 
                      ? habit.isTheoreticallyDone
                        ? "bg-accent/20 border-accent/20 text-accent cursor-not-allowed"
                        : "bg-primary border-primary text-white shadow-md shadow-primary/20"
                      : "border-surface-border hover:border-primary hover:bg-primary/5 text-primary"
                  )}
                >
                  {habit.done 
                   ? <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" /> 
                   : <div className="w-1.5 h-1.5 rounded-full bg-surface-border group-hover:bg-primary transition-colors" />}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Urgent DDD Column (Full Width) */}
        <div className="space-y-5">
          <div className="flex items-end justify-between px-2 md:px-0">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-secondary uppercase tracking-tight">Tem que</h2>
              <p className="text-text-muted mt-1 font-medium text-[9px] md:text-[10px]">As urgências do momento.</p>
            </div>
            <button 
              onClick={() => navigate("/ddd")}
              className="text-[8px] md:text-[9px] font-bold text-primary uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
            >
              Arquivar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {tasks.filter(t => t.type === 'tem_que').slice(0, 8).map((task, i) => (
              <motion.div 
                key={task.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate("/ddd")}
                className="p-3 md:p-4 bg-secondary rounded-2xl flex items-center justify-between group hover:bg-secondary/90 transition-all cursor-pointer shadow-lg shadow-secondary/5 border border-white/5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
                <span className="text-[9px] md:text-[10px] font-bold text-white/90 uppercase tracking-widest group-hover:text-white transition-colors truncate pr-4 relative z-10">{task.title}</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:translate-x-1 group-hover:text-primary transition-all relative z-10" />
              </motion.div>
            ))}
          </div>

          {tasks.filter(t => t.type === 'tem_que').length === 0 && (
            <div className="bg-secondary rounded-3xl p-6 md:p-10 shadow-xl shadow-secondary/10 border border-white/5 relative overflow-hidden flex flex-col items-center justify-center">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
               <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-4 relative z-10">
                 <Target className="w-5 h-5 text-white/30" />
               </div>
               <p className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] italic leading-tight text-center relative z-10">
                 Mente limpa, <br />vácuo criativo.
               </p>
               <div className="absolute bottom-4 left-0 right-0 pt-4 border-t border-white/5 mx-6">
                 <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.5em] block text-center">ARQUIVO DE DEMANDAS / 0&bull;2</span>
               </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedGoal && (
          <Modal 
            isOpen={!!selectedGoal} 
            onClose={() => setSelectedGoal(null)} 
            title={selectedGoal.title}
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.4em]">Hábitos Estratégicos</p>
                <div className="grid grid-cols-1 gap-2">
                  {todayHabits.filter(h => h.goal_id === selectedGoal.id).length > 0 ? (
                    todayHabits.filter(h => h.goal_id === selectedGoal.id).map((habit, i) => (
                      <motion.div 
                        key={habit.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          "bg-surface-hover/30 border border-surface-border p-4 rounded-2xl flex items-center gap-4 group transition-all",
                          habit.done ? "opacity-60" : ""
                        )}
                      >
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: habit.color || '#5E6E5A' }}
                        >
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold uppercase truncate text-secondary">{habit.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[8px] font-bold text-text-muted uppercase tracking-[0.2em]">{habit.area || "Geral"}</span>
                            <span className="w-1 h-1 rounded-full bg-surface-border" />
                            <span className="text-[8px] font-bold text-primary uppercase tracking-[0.2em]">{habit.frequency_per_week}x/Semana</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleHabitStatus(habit.id)}
                          disabled={habit.isTheoreticallyDone}
                          className={cn(
                            "w-8 h-8 rounded-full border flex items-center justify-center transition-all",
                            habit.done 
                              ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                              : "border-surface-border hover:border-primary text-primary"
                          )}
                        >
                          {habit.done ? <Zap className="w-3.5 h-3.5 fill-current" /> : <div className="w-1.5 h-1.5 rounded-full bg-surface-border" />}
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-10 flex flex-col items-center justify-center gap-3 bg-surface-hover/10 rounded-2xl border border-dashed border-surface-border">
                      <Sparkles className="w-6 h-6 text-text-muted/20" />
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-center px-6 leading-relaxed">Nenhum hábito vinculado a esta meta</p>
                      <button 
                        onClick={() => { setSelectedGoal(null); navigate("/metas"); }} 
                        className="text-[9px] font-bold text-primary uppercase tracking-widest underline underline-offset-4"
                      >
                        Configurar agora
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-surface-border">
                <button 
                  onClick={() => setSelectedGoal(null)}
                  className="w-full py-5 bg-secondary text-white rounded-xl font-bold uppercase text-[9px] tracking-[0.3em] hover:bg-secondary/90 transition-colors shadow-lg"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, subtext, icon: Icon, color }: any) {
  return (
    <div className="group bg-surface border border-surface-border rounded-3xl p-6 card-3d relative overflow-hidden">
      <div className={cn("absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 transform rotate-12 scale-125 unselectable")}>
        <Icon className="w-24 h-24" />
      </div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[8px] font-bold text-text-muted uppercase tracking-[0.4em]">{label}</span>
          <div className={cn("p-2.5 rounded-xl transition-all duration-700 shadow-sm", color.replace('text-', 'bg-').split(' ')[0].concat('/10'))}>
            <Icon className={cn("w-4 h-4", color)} />
          </div>
        </div>
        <div className="text-4xl md:text-5xl font-display font-bold text-secondary mb-1.5 tracking-[-0.05em]">{value}</div>
        <div className="text-[9px] font-bold text-text-muted uppercase tracking-[0.1em] flex items-center gap-1.5">
          {subtext}
          <div className="w-1 h-1 rounded-full bg-primary/40" />
        </div>
      </div>
    </div>
  );
}

