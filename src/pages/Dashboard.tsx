import { useNavigate } from "react-router-dom";
import { 
  Zap, 
  Flame, 
  ListTodo, 
  ChevronRight, 
  ArrowRight,
  TrendingUp,
  Target
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCycleInfo } from "@/lib/cycle";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export function Dashboard() {
  const navigate = useNavigate();
  const user = useUser();
  const { currentDay, totalDays, cycleProgress } = getCycleInfo();
  const [loading, setLoading] = useState(true);
  const [todayHabits, setTodayHabits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({
    habitsDone: 0,
    totalHabits: 0,
    weeklyAdherence: 0,
    activeTasks: 0,
    urgentTasks: 0,
    maxStreak: 0
  });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: habits } = await supabase.from('habits').select('*').eq('user_name', user.name);
      const { data: logs } = await supabase.from('habit_logs').select('*').eq('user_name', user.name).eq('date', todayStr);
      const { data: dddTasks } = await supabase.from('tasks').select('*').eq('user_name', user.name).eq('completed', false);

      const totalHabits = habits?.length || 0;
      const habitsDone = logs?.filter(l => l.completed).length || 0;

      setTodayHabits(habits?.map(h => ({
        ...h,
        done: logs?.find(l => l.habit_id === h.id)?.completed || false
      })) || []);

      setTasks(dddTasks || []);

      setStats({
        habitsDone,
        totalHabits,
        weeklyAdherence: 0,
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section - The "Foda" Look */}
      <section className="relative overflow-visible group">
        <div className="absolute -inset-4 bg-primary/5 rounded-[2rem] md:rounded-[3rem] blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="relative overflow-hidden rounded-[2rem] md:rounded-[3rem] bg-secondary text-white p-8 md:p-12 lg:p-14 shadow-[0_50px_100px_-20px_rgba(74,53,47,0.3)]">
          {/* Animated Background Elements */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 lg:gap-16 relative z-10">
            <div className="space-y-6 md:space-y-8 max-w-2xl">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#2D4F3C]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/70">
                  {getGreeting()} • {user?.name.split(' ')[0]}
                </span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-[0.9] tracking-[-0.04em] uppercase">
                Rumo ao<br />
                seu <span className="text-accent italic font-medium">norte.</span>
              </h1>
              
              <p className="text-white/60 text-lg md:text-xl font-light leading-relaxed max-w-md">
                “Um ciclo por vez, moldando a intenção em arquitetura de vida.”
              </p>

              <div className="flex flex-wrap gap-4 md:gap-6 pt-4 md:pt-6">
                <button 
                   onClick={() => navigate("/habitos")}
                  className="bg-primary text-white h-14 md:h-16 px-8 md:px-12 rounded-2xl font-bold text-[10px] md:text-[11px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 shadow-2xl shadow-primary/40 group"
                >
                  Continuar jornada
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-2 transition-transform" />
                </button>
                
                <button 
                  onClick={() => navigate("/pomodoro")}
                  className="bg-white/5 backdrop-blur-md text-white border border-white/10 h-14 md:h-16 px-8 md:px-12 rounded-2xl font-bold text-[10px] md:text-[11px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  Focar agora
                </button>
              </div>
            </div>

            {/* Massive Progress Circle */}
            <div className="relative group cursor-pointer flex justify-center lg:justify-end" onClick={() => navigate("/habitos")}>
              <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-[380px] lg:h-[380px] transition-transform duration-1000 group-hover:scale-105">
                <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_40px_rgba(45,79,60,0.3)]">
                  <circle cx="50%" cy="50%" r="42%" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="42%"
                    fill="transparent"
                    stroke="#2D4F3C"
                    strokeWidth="12"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "264 264", strokeDashoffset: 264 }}
                    animate={{ strokeDashoffset: 264 - (264 * (stats.habitsDone / (stats.totalHabits || 1))) }}
                    transition={{ duration: 2.5, ease: "circOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[10px] md:text-[12px] font-bold text-accent uppercase tracking-[0.5em] mb-2 md:mb-4 opacity-70">Progresso</div>
                  <div className="text-6xl md:text-8xl lg:text-[8rem] font-display font-bold text-white flex items-baseline gap-2">
                    <span className="tracking-[-0.08em]">{stats.totalHabits > 0 ? Math.round((stats.habitsDone / stats.totalHabits) * 100) : 0}</span>
                    <span className="text-2xl md:text-4xl lg:text-5xl opacity-20 font-bold tracking-tight">%</span>
                  </div>
                  <div className="mt-4 md:mt-8 flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
                    <Zap className="w-3 h-3 md:w-4 md:h-4 text-accent fill-accent" />
                    <span className="text-[9px] md:text-[10px] font-bold text-white/70 uppercase tracking-[0.2em] leading-none">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
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

      {/* Habits & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Habits Bento Box */}
        <div className="lg:col-span-8 space-y-8 md:space-y-10">
          <div className="flex items-end justify-between px-2 md:px-0">
            <div>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-secondary uppercase tracking-tight">Ações de hoje</h2>
              <p className="text-text-muted mt-1 md:mt-2 font-medium text-xs md:text-base">Sua rota diária rumo ao objetivo absoluto.</p>
            </div>
            <button 
              onClick={() => navigate("/habitos")}
              className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
            >
              Arquivos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 gap-y-4">
            {todayHabits.map((habit, i) => (
              <motion.div 
                key={habit.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className={cn(
                  "group p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border transition-all duration-700 flex flex-col justify-between h-48 md:h-56 card-3d",
                  habit.done 
                    ? "bg-primary/5 border-primary/10 opacity-60" 
                    : "bg-surface border-surface-border"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-background border border-surface-border flex items-center justify-center text-3xl md:text-4xl shadow-sm transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6",
                    habit.done ? "grayscale contrast-125" : ""
                  )}>
                    {habit.emoji || "✨"}
                  </div>
                  <div className={cn(
                    "w-10 h-10 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-700",
                    habit.done 
                      ? "bg-primary border-primary text-white shadow-2xl shadow-primary/30" 
                      : "border-surface-border group-hover:border-primary group-hover:bg-primary/5"
                  )}>
                    {habit.done ? <Zap className="w-5 h-5 md:w-6 md:h-6 fill-current" /> : <div className="w-2 h-2 rounded-full bg-surface-border group-hover:scale-150 transition-all group-hover:bg-primary" />}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl md:text-2xl font-display font-bold text-secondary group-hover:text-primary transition-colors uppercase tracking-tight">{habit.name}</h3>
                  <div className="flex items-center gap-3 mt-1 md:mt-2">
                    <span className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">{habit.area || "Geral"}</span>
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-surface-border" />
                    <span className="text-[9px] md:text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{habit?.type === 'numeric' ? `${habit.daily_goal} ${habit.unit}` : 'Check'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Urgent DDD Column */}
        <div className="lg:col-span-4 space-y-8 lg:space-y-10">
          <div className="flex items-end justify-between px-2 md:px-0">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-secondary uppercase">Tem que</h2>
            <button 
              onClick={() => navigate("/ddd")}
              className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
            >
              Arquivar
            </button>
          </div>

          <div className="bg-secondary rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-secondary/30 relative overflow-hidden h-[450px] md:h-[500px] border border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-4 md:space-y-5">
              {tasks.filter(t => t.type === 'tem_que').slice(0, 6).map((task) => (
                <div 
                  key={task.id}
                  className="p-4 md:p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer backdrop-blur-sm"
                >
                  <span className="text-[10px] md:text-[11px] font-bold text-white/70 uppercase tracking-widest group-hover:text-white transition-colors truncate pr-4">{task.title}</span>
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </div>
              ))}

              {tasks.filter(t => t.type === 'tem_que').length === 0 && (
                <div className="py-20 md:py-24 text-center flex flex-col items-center gap-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <Target className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.4em] italic">Mente limpa, <br />vácuo criativo.</p>
                </div>
              )}
            </div>
            
            <div className="absolute bottom-8 left-8 right-8 pt-6 border-t border-white/5">
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.5em] block text-center">ARQUIVO DE DEMANDAS / 0&bull;2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, icon: Icon, color }: any) {
  return (
    <div className="group bg-surface border border-surface-border rounded-[3rem] p-10 card-3d relative overflow-hidden">
      <div className={cn("absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 transform rotate-12 scale-150 unselectable")}>
        <Icon className="w-40 h-40" />
      </div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-8">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.4em]">{label}</span>
          <div className={cn("p-4 rounded-2xl transition-all duration-700 shadow-sm", color.replace('text-', 'bg-').split(' ')[0].concat('/10'))}>
            <Icon className={cn("w-6 h-6", color)} />
          </div>
        </div>
        <div className="text-7xl font-display font-bold text-secondary mb-3 tracking-[-0.1em]">{value}</div>
        <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.1em] flex items-center gap-3">
          {subtext}
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
        </div>
      </div>
    </div>
  );
}

