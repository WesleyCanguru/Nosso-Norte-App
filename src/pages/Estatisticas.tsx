import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Flame, 
  Target, 
  Calendar,
  Zap,
  Trophy,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";

export function Estatisticas() {
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    adherence: 0,
    totalDone: 0,
    activeHabits: 0,
    mostConsistent: "---",
    streak: 0,
    mostExecuted: "---"
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch data for the last 7 days
      const { data: habits } = await supabase.from('habits').select('*').eq('user_name', user.name);
      const { data: logs } = await supabase.from('habit_logs').select('*').eq('user_name', user.name);

      // Process stats
      const activeHabits = habits?.length || 0;
      const totalDone = logs?.filter(l => l.completed).length || 0;
      
      // Weekly data for chart
      const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const weekData = days.map(day => ({ name: day, value: Math.floor(Math.random() * 80) + 20 })); // Mock for now, need real logic
      setChartData(weekData);

      setStats({
        adherence: activeHabits > 0 ? Math.round((totalDone / (activeHabits * 30)) * 100) : 0, // Mocked 30 days
        totalDone,
        activeHabits,
        mostConsistent: habits?.[0]?.name || "---",
        streak: 5,
        mostExecuted: habits?.[0]?.name || "---"
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
     return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 md:space-y-12 pb-20 px-4 md:px-0">
      <header className="space-y-4 md:space-y-6">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
          <TrendingUp className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">ARQUITETURA DE PERFORMANCE / 0&bull;6</span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-secondary leading-[0.9] tracking-[-0.04em] uppercase">
          MÉTRICAS DE<br />
          <span className="text-accent italic font-medium">EVOLUÇÃO.</span>
        </h1>
        <p className="text-text-muted text-lg md:text-xl max-w-lg font-light">“Os números não mentem, eles revelam a geometria oculta da sua disciplina.”</p>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <StatCard 
          label="ADERÊNCIA SEMANAL" 
          value={`${stats.adherence}%`} 
          icon={TrendingUp}
          color="text-primary"
          chartData={chartData}
        />
        <StatCard 
          label="TOTAL CONCLUÍDO" 
          value={stats.totalDone.toString()} 
          icon={Target}
          color="text-accent"
        />
        <StatCard 
          label="HÁBITOS ATIVOS" 
          value={stats.activeHabits.toString()} 
          icon={Trophy}
          color="text-secondary"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        <MiniStatCard label="MAIS CONSISTENTE" value={stats.mostConsistent} subtext="Eficiência máxima" />
        <MiniStatCard label="MAIOR STREAK" value={`${stats.streak}d`} subtext="Recorde atual" />
        <MiniStatCard label="MAIS EXECUTADO" value={stats.mostExecuted} subtext="Domínio absoluto" />
      </div>

      {/* Detailed Evolution Chart */}
      <section className="bg-surface border border-surface-border rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-12 shadow-2xl shadow-primary/5 card-3d">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-12 gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-secondary uppercase tracking-tight">Evolução de Hábito</h2>
            <p className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1 md:mt-2">DADOS DE PERFORMANCE CONSOLIDADA / 0&bull;1</p>
          </div>
          <div className="flex gap-2 bg-background p-1.5 md:p-2 rounded-2xl border border-surface-border shadow-inner w-full md:w-auto">
            <button className="flex-1 md:flex-none px-6 md:px-8 py-2 md:py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] bg-secondary text-white rounded-xl shadow-lg transition-all">7 DIAS</button>
            <button className="flex-1 md:flex-none px-6 md:px-8 py-2 md:py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted hover:bg-surface-hover rounded-xl transition-all">30 DIAS</button>
          </div>
        </div>

        <div className="h-[300px] md:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5A8D6E" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#5A8D6E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E2D9" strokeOpacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 900, fill: '#6B7280', letterSpacing: '0.1em' }}
                dy={20}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '24px', 
                  border: '1px solid #E5E2D9',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                  padding: '16px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#5A8D6E" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-surface border border-surface-border rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-primary/5 transition-all card-3d">
      <div className="relative z-10 space-y-6 md:space-y-8">
        <div className="flex justify-between items-start">
          <span className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] md:tracking-[0.4em]">{label}</span>
          <div className={cn("p-3 md:p-4 rounded-xl md:rounded-2xl bg-opacity-10", color.replace('text-', 'bg-'))}>
            <Icon className={cn("w-5 h-5 md:w-6 md:h-6", color)} />
          </div>
        </div>
        <div className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-secondary tracking-[-0.06em] md:tracking-[-0.1em]">{value}</div>
      </div>
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-40 transition-all transform translate-x-4 group-hover:translate-x-0">
         <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6 text-text-muted" />
      </div>
    </div>
  );
}

function MiniStatCard({ label, value, subtext }: any) {
  return (
    <div className="bg-surface border border-surface-border rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm group hover:border-primary/30 transition-all card-3d">
      <span className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] md:tracking-[0.3em]">{label}</span>
      <div className="text-2xl md:text-3xl font-display font-bold text-secondary mt-2 md:mt-3 uppercase tracking-tight truncate">{value}</div>
      <div className="text-[9px] md:text-[10px] font-bold text-primary/60 uppercase tracking-[0.1em] md:tracking-[0.2em] mt-1 md:mt-2 flex items-center gap-2">
        <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-primary/20" />
        {subtext}
      </div>
    </div>
  );
}
