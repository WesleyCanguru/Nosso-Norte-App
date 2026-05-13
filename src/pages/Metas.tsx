import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Target, 
  Heart, 
  Zap, 
  Check,
  ChevronRight,
  TrendingUp,
  Scale,
  Brain,
  Droplets,
  Loader2,
  Calendar,
  Sparkles,
  Clock,
  MapPin,
  MessageSquare,
  Tag
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useUserGoals } from "@/hooks/useUserGoals";
import { useCycle } from "@/hooks/useCycle";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type Habit = {
  id: string;
  name: string;
  emoji: string;
  area: 'alma' | 'corpo' | 'foco';
  type: 'check' | 'numeric';
  frequency_per_week: number;
  daily_goal: number;
  unit: string;
  time?: string;
  location?: string;
  motivation?: string;
  description?: string;
  category?: string;
  color?: string;
  goal_id?: string;
};

const AREAS = [
  { id: 'alma', name: 'Alma', emoji: '🤎', color: 'text-secondary', bg: 'bg-secondary/5' },
  { id: 'corpo', name: 'Corpo', emoji: '🌿', color: 'text-primary', bg: 'bg-primary/5' },
  { id: 'foco', name: 'Trabalho', emoji: '🪵', color: 'text-accent', bg: 'bg-accent/5' }
];

const UNITS = ["vezes", "km", "minutos", "litros", "kcal", "páginas", "horas"];
const COLOR_OPTIONS = [
  "#5A8D6E", // Lightened North Green
  "#4A352F", // Brown
  "#A66E6E", // Muted Red
  "#B38E5D", // Gold/Ocher
  "#5D6D7E", // Slate Blue
  "#A18E78", // Taupe
  "#353535", // Deep Gray
  "#5E6E5A"  // Leaf Green
];
const CATEGORIES = ["Saúde", "Trabalho", "Mental", "Espiritual", "Social", "Lazer", "Finanças"];

export function Metas() {
  const user = useUser();
  const { goals, updateGoals, loading: goalsLoading } = useUserGoals();
  const { cycle, startNewCycle, loading: cycleLoading } = useCycle();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [newCycleStartDate, setNewCycleStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Form State
  const [formData, setFormData] = useState<Partial<Habit>>({
    name: '',
    area: 'corpo',
    type: 'check',
    frequency_per_week: 7,
    daily_goal: 1,
    unit: 'vezes',
    category: 'Saúde',
    color: '#5A8D6E'
  });

  useEffect(() => {
    if (user) {
      fetchHabits();
    }
  }, [user]);

  const fetchHabits = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_name', user.name)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error("Error fetching habits:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveHabit = async () => {
    if (!user || !formData.name) return;
    
    // Preparar dados para inserção/update
    const cleanData = { ...formData, user_name: user.name };
    
    // Se goal_id for string vazia, deve ser null para o Supabase (UUID)
    if (cleanData.goal_id === "") {
      delete cleanData.goal_id;
    }

    try {
      if (editingHabit) {
        const { error } = await supabase
          .from('habits')
          .update(cleanData)
          .eq('id', editingHabit.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('habits')
          .insert([cleanData]);
          
        if (error) throw error;
      }
      
      fetchHabits();
      setIsModalOpen(false);
      setEditingHabit(null);
      resetForm();
    } catch (error: any) {
      console.error("Error saving habit:", error);
      alert(`Erro ao salvar hábito: ${error.message || 'Erro de conexão ou no banco de dados'}. Se você vinculou a uma meta, verifique se a coluna goal_id existe na tabela habits.`);
    }
  };

  const [outcomes, setOutcomes] = useState<{id: string, title: string}[]>([]);
  const [newOutcome, setNewOutcome] = useState('');

  const fetchOutcomes = async () => {
    if (!user || !cycle) return;
    try {
      const { data, error } = await supabase
        .from('cycle_outcomes')
        .select('id, title')
        .eq('cycle_id', cycle.id)
        .eq('user_name', user.name);
      
      if (error) throw error;
      setOutcomes(data || []);
    } catch (e) {
      console.error("Erro ao buscar metas:", e);
    }
  };

  useEffect(() => {
    if (cycle) fetchOutcomes();
  }, [cycle]);

  const getCycleProgress = () => {
    if (!cycle) return null;
    try {
      const start = parseISO(cycle.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const totalDays = 84; 
      const progress = Math.min(Math.max((diffDays / totalDays) * 100, 0), 100);
      const currentDay = Math.min(Math.max(diffDays, 0), totalDays);
      return { currentDay, totalDays, progress };
    } catch (e) {
      return null;
    }
  };

  const cycleInfo = getCycleProgress();

  const addOutcome = async () => {
    if (!user || !cycle || !newOutcome) {
      if (!cycle) alert("Você precisa iniciar um ciclo antes de adicionar metas.");
      return;
    }
    try {
      const { error } = await supabase.from('cycle_outcomes').insert({
        user_name: user.name,
        cycle_id: cycle.id,
        title: newOutcome
      });
      if (error) throw error;
      setNewOutcome('');
      fetchOutcomes();
    } catch (error: any) {
      console.error("Erro ao adicionar meta:", error);
      alert(`Houve um erro ao salvar a meta: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      await supabase.from('habit_logs').delete().eq('habit_id', id);
      await supabase.from('habits').delete().eq('id', id);
      setHabits(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      console.error("Error deleting habit:", error);
    }
  };

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData(habit);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      area: 'corpo',
      type: 'check',
      frequency_per_week: 7,
      daily_goal: 1,
      unit: 'vezes',
      time: '',
      motivation: '',
      description: '',
      category: 'Saúde',
      color: '#5A8D6E'
    });
  };

  const filteredHabits = habits;

  if (goalsLoading || loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-24 px-4 md:px-0">
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 rounded-full border border-primary/10 w-fit">
          <Target className="w-3 h-3 text-primary" />
          <span className="text-[8px] font-bold text-primary uppercase tracking-[0.3em]">A Arqueologia do Futuro</span>
        </div>
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold text-secondary tracking-[-0.04em] leading-[0.9] uppercase">Nossas<br/>Metas.</h1>
        <p className="text-text-muted text-sm md:text-base max-w-lg font-light leading-relaxed pt-1">Onde a intenção se torna arquitetura. Defina o seu destino e mapeie o caminho com precisão absoluta.</p>
      </motion.header>

      <section className="bg-secondary rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5 md:space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 bg-primary animate-pulse rounded-full" />
                <span className="text-[8px] font-bold uppercase tracking-[0.3em]">Configurar Jornada</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-display font-bold leading-[1.1] uppercase tracking-tighter">O Ano em <span className="text-primary italic">12 Semanas.</span></h2>
              <p className="text-white/60 text-sm md:text-base max-w-lg font-light italic">“Um ano não tem 12 meses. Tem {cycle ? "12 semanas" : "o quanto você desejar"}. O tempo é curto, a execução deve ser implacável.”</p>
            </div>
            {cycle && cycleInfo && (
              <div className="space-y-5 pt-3 max-w-sm">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.4em]">Dia {cycleInfo.currentDay} de {cycleInfo.totalDays}</p>
                    <p className="text-lg font-bold font-display uppercase italic text-primary">{Math.round((cycleInfo.currentDay / cycleInfo.totalDays) * 100)}% Concluído</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.4em]">Fase do Ciclo</p>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Semana {Math.ceil(cycleInfo.currentDay / 7)} / 12</p>
                  </div>
                </div>
                <div className="h-1 lg:h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${cycleInfo.progress}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            )}
            {cycle ? (
              <div className="flex flex-wrap items-center gap-6 md:gap-8 pt-2">
                <div className="space-y-1">
                  <p className="text-[7px] font-bold text-white/30 uppercase tracking-[0.4em]">Início do Ciclo</p>
                  <p className="text-lg md:text-xl font-display font-bold">{format(parseISO(cycle.start_date), "dd 'de' MMMM", { locale: ptBR })}</p>
                </div>
                <div className="w-px h-8 bg-white/10 hidden md:block" />
                <div className="space-y-1">
                  <p className="text-[7px] font-bold text-white/30 uppercase tracking-[0.4em]">Horizonte Final</p>
                  <p className="text-lg md:text-xl font-display font-bold text-primary">{format(addDays(parseISO(cycle.start_date), 84), "dd 'de' MMMM", { locale: ptBR })}</p>
                </div>
                <Button onClick={() => { setNewCycleStartDate(cycle.start_date); setIsCycleModalOpen(true); }} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl px-5 py-2.5 font-bold uppercase tracking-[0.2em] text-[9px]">Redefinir Ciclo</Button>
              </div>
            ) : (
              <Button onClick={() => setIsCycleModalOpen(true)} className="bg-primary text-secondary hover:scale-105 px-6 py-3 rounded-xl font-bold uppercase tracking-widest transition-all">Iniciar Ciclo de 12 Semanas</Button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-surface-border pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-xl md:text-3xl font-display font-bold text-secondary uppercase tracking-tight">Arquitetura de Sucesso</h2>
            </div>
            <p className="text-text-muted text-[10px] md:text-xs max-w-xl font-light">Mapeie seus hábitos diretamente às suas grandes metas. Cada ação deve servir ao seu propósito maior.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-surface border border-surface-border p-1.5 rounded-xl md:min-w-[300px]">
              <input 
                type="text" 
                value={newOutcome} 
                onChange={(e) => setNewOutcome(e.target.value)} 
                placeholder="Nova Grande Vitória..." 
                className="flex-1 bg-transparent px-3 py-1.5 text-[10px] font-bold text-secondary outline-none uppercase tracking-widest placeholder:text-text-muted/50"
              />
              <button onClick={addOutcome} className="bg-primary text-white p-2 rounded-lg hover:scale-105 transition-transform"><Plus className="w-3.5 h-3.5"/></button>
            </div>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-secondary text-white h-11 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl uppercase text-[9px] tracking-widest"><Plus className="w-3.5 h-3.5"/><span>Novo Hábito</span></button>
          </div>
        </header>

        <div className="space-y-16">
          {/* Metas Principais e seus Hábitos */}
          {outcomes.map((goal, idx) => (
            <div key={goal.id} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-4 sticky top-24">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="bg-surface border border-surface-border rounded-[2rem] p-8 space-y-4 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><span className="text-7xl font-display font-bold italic">{idx + 1}</span></div>
                  <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/10 shadow-inner group-hover:scale-110 transition-transform">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <p className="text-[8px] font-bold text-primary uppercase tracking-[0.4em]">Meta Inegociável</p>
                    <h3 className="text-xl md:text-2xl font-display font-bold text-secondary uppercase leading-none tracking-tight">{goal.title}</h3>
                  </div>
                  <div className="pt-4 flex items-center justify-between border-t border-surface-border/50">
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">
                      {habits.filter(h => h.goal_id === goal.id).length} Hábitos Vinculados
                    </span>
                    <button 
                      onClick={async () => { 
                        if(confirm("Tem certeza que deseja excluir esta meta?")) {
                          await supabase.from('cycle_outcomes').delete().eq('id', goal.id).eq('user_name', user.name); 
                          fetchOutcomes(); 
                        }
                      }} 
                      className="p-2 text-text-muted hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </motion.div>
              </div>

              <div className="lg:col-span-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {habits.filter(h => h.goal_id === goal.id).map((habit) => (
                    <motion.div 
                      key={habit.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-white/40 backdrop-blur-sm border border-surface-border rounded-3xl p-6 space-y-4 group hover:shadow-xl hover:bg-white transition-all border-dashed"
                    >
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-black/5 shadow-sm" style={{ backgroundColor: habit.color || '#5E6E5A' }}>
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(habit)} className="p-2 bg-surface border border-surface-border rounded-lg text-text-muted hover:text-primary transition-all"><Pencil className="w-3 h-3"/></button>
                          <button onClick={() => deleteHabit(habit.id)} className="p-2 bg-surface border border-surface-border rounded-lg text-text-muted hover:text-red-500 transition-all"><Trash2 className="w-3 h-3"/></button>
                        </div>
                      </div>
                      <h3 className="text-base font-display font-bold text-secondary uppercase tracking-tight truncate">{habit.name}</h3>
                      <div className="flex items-center justify-between pt-3 border-t border-surface-border/30">
                        <span className="text-[8px] font-bold text-text-muted uppercase tracking-[0.2em]">{habit.category}</span>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary"><Zap className="w-3 h-3" /> {habit.frequency_per_week}x/Semana</div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Botão de adicionar hábito rápido já vinculado à meta */}
                  <button 
                    onClick={() => { resetForm(); setFormData(prev => ({ ...prev, goal_id: goal.id })); setIsModalOpen(true); }}
                    className="border-2 border-dashed border-surface-border rounded-3xl flex flex-col items-center justify-center gap-3 p-8 opacity-40 hover:opacity-100 hover:border-primary/50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-border flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Plus className="w-5 h-5 text-text-muted group-hover:text-primary" />
                    </div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Adicionar hábito à meta</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Hábitos Independentes */}
          {habits.filter(h => !h.goal_id).length > 0 && (
             <div className="space-y-8 pt-8 border-t border-surface-border/50">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 md:w-10 md:h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                   <Zap className="w-4 h-4 text-accent" />
                 </div>
                 <h2 className="text-xl md:text-2xl font-display font-bold text-secondary uppercase tracking-tight">Hábitos de Manutenção</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {habits.filter(h => !h.goal_id).map((habit) => (
                   <motion.div 
                     key={habit.id}
                     initial={{ opacity: 0, scale: 0.95 }}
                     whileInView={{ opacity: 1, scale: 1 }}
                     viewport={{ once: true }}
                     className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 group hover:shadow-xl transition-all shadow-sm"
                   >
                     <div className="flex justify-between items-start">
                       <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-black/5" style={{ backgroundColor: habit.color || '#5E6E5A' }}>
                         <Sparkles className="w-4 h-4 text-white" />
                       </div>
                       <div className="flex gap-1.5">
                         <button onClick={() => handleEdit(habit)} className="p-1.5 text-text-muted hover:text-primary transition-all"><Pencil className="w-3 h-3"/></button>
                         <button onClick={() => deleteHabit(habit.id)} className="p-1.5 text-text-muted hover:text-red-500 transition-all"><Trash2 className="w-3 h-3"/></button>
                       </div>
                     </div>
                     <h3 className="text-base font-display font-bold text-secondary uppercase tracking-tight truncate">{habit.name}</h3>
                     <div className="flex items-center justify-between pt-2 border-t border-surface-border/50">
                       <span className="text-[8px] font-bold text-text-muted uppercase tracking-[0.2em]">{habit.category}</span>
                       <div className="flex items-center gap-1 text-[8px] font-bold text-primary"><Zap className="w-2.5 h-2.5" /> {habit.frequency_per_week}x/Semana</div>
                     </div>
                   </motion.div>
                 ))}
               </div>
             </div>
          )}
        </div>
      </section>

      <Modal isOpen={isCycleModalOpen} onClose={() => setIsCycleModalOpen(false)} title="Arquitetar Ciclo">
        <div className="space-y-10 p-2">
          <div className="space-y-6">
            <div className="flex items-center justify-between"><label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.4em]">Marco Zero (Início)</label><div className="flex items-center gap-2 text-primary"><Calendar className="w-4 h-4" /><span className="text-xs font-bold uppercase">{format(parseISO(newCycleStartDate), "dd 'de' MMMM", { locale: ptBR })}</span></div></div>
            <div className="bg-surface-hover/30 border border-surface-border rounded-[2.5rem] p-8"><input type="date" value={newCycleStartDate} onChange={(e) => setNewCycleStartDate(e.target.value)} className="w-full bg-transparent border-none text-4xl font-display font-bold text-secondary outline-none text-center cursor-pointer hover:text-primary transition-colors"/><p className="text-center text-[10px] text-text-muted font-bold uppercase tracking-widest mt-4">Toque para alterar a data</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-surface border border-surface-border rounded-3xl space-y-2"><p className="text-[8px] font-bold text-text-muted uppercase tracking-[0.2em]">Duração</p><p className="text-xl font-bold text-secondary italic">12 Semanas</p></div>
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-2"><p className="text-[8px] font-bold text-primary/60 uppercase tracking-[0.2em]">Horizonte Final</p><p className="text-xl font-bold text-primary">{format(addDays(parseISO(newCycleStartDate), 84), "dd/MM/yy")}</p></div>
          </div>
          <Button onClick={async () => { await startNewCycle(newCycleStartDate); setIsCycleModalOpen(false); }} className="w-full py-10 text-lg font-bold rounded-[2rem] bg-secondary text-white uppercase tracking-[0.2em]">Sincronizar Cronograma</Button>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingHabit(null); }} title={editingHabit ? "Ajustar Hábito" : "Novo Hábito"}>
        <div className="space-y-6 md:space-y-8 p-1 overflow-y-auto max-h-[85vh] scrollbar-hide">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em] block pl-1">Nome do Hábito</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              className="w-full bg-surface-hover/30 border border-surface-border rounded-xl px-6 py-8 text-2xl font-display font-bold text-secondary outline-none focus:border-primary transition-all placeholder:opacity-20 uppercase" 
              placeholder="EX: MEDITAÇÃO PROFUNDA"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em] block pl-1">Esfera de Atuação</label>
              <div className="grid grid-cols-1 gap-2">
                {AREAS.map((area) => (
                  <button 
                    key={area.id} 
                    onClick={() => setFormData({ ...formData, area: area.id as any })} 
                    className={cn(
                      "p-3 rounded-xl flex items-center justify-between px-5 border transition-all text-[10px] font-bold uppercase tracking-widest", 
                      formData.area === area.id 
                        ? "bg-secondary text-white border-secondary shadow-lg" 
                        : "bg-surface-hover/20 border-surface-border text-text-muted opacity-60 hover:opacity-100"
                    )}
                  >
                    <span>{area.name}</span>
                    <div className={cn("w-1.5 h-1.5 rounded-full", formData.area === area.id ? "bg-primary" : "bg-surface-border")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em] block pl-1">Por que isso é inegociável?</label>
              <textarea 
                value={formData.motivation} 
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })} 
                placeholder="Defina o propósito..." 
                className="w-full h-[126px] bg-surface-hover/20 border border-surface-border rounded-xl px-5 py-4 text-xs font-light text-secondary outline-none focus:border-primary transition-all resize-none italic"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-2 pl-1"><Clock className="w-3 h-3" /> Horário</label>
              <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full bg-surface-hover/20 border border-surface-border rounded-xl px-4 py-3 text-xs font-bold text-secondary outline-none focus:border-primary transition-all"/>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-2 pl-1"><Tag className="w-3 h-3" /> Categoria</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-surface-hover/20 border border-surface-border rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-secondary outline-none focus:border-primary transition-all appearance-none cursor-pointer">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] pl-1">Arquitetura (Cor)</label>
              <div className="flex gap-2 justify-between bg-surface-hover/20 border border-surface-border rounded-xl p-2">
                {COLOR_OPTIONS.map(color => (
                  <button key={color} onClick={() => setFormData({ ...formData, color })} className={cn("w-6 h-6 rounded-full border transition-all transform hover:scale-110", formData.color === color ? "border-primary ring-2 ring-primary/20 scale-110" : "border-transparent")} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-2 pl-1"><Target className="w-3 h-3" /> Conectar à Meta Maior</label>
            <select value={formData.goal_id} onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })} className="w-full bg-surface-hover/20 border border-surface-border rounded-xl px-5 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary outline-none focus:border-primary transition-all appearance-none cursor-pointer">
              <option value="">Nenhuma meta vinculada</option>
              {outcomes.map(o => (<option key={o.id} value={o.id}>{o.title}</option>))}
            </select>
          </div>

          <div className="bg-surface-hover/10 rounded-3xl p-6 md:p-8 space-y-6 border border-surface-border">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em]">Recorrência Semanal</label>
                <span className="text-[10px] font-bold text-primary">{formData.frequency_per_week} dias</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <button key={num} onClick={() => setFormData({ ...formData, frequency_per_week: num })} className={cn("flex-1 py-3 rounded-lg text-[10px] font-bold transition-all border", formData.frequency_per_week === num ? "bg-secondary text-white border-secondary shadow-lg scale-105" : "bg-background border-surface-border text-text-muted")}>
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em] pl-1">Meta Diária</label>
                <div className="flex gap-3">
                  <input type="number" value={formData.daily_goal} onChange={(e) => setFormData({ ...formData, daily_goal: Number(e.target.value) })} className="flex-1 bg-background border border-surface-border rounded-xl px-5 py-3 text-lg font-display font-bold text-secondary outline-none focus:border-primary"/>
                  <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="flex-1 bg-background border border-surface-border rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-secondary">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <Button onClick={saveHabit} className="w-full py-8 text-[10px] font-bold rounded-2xl shadow-xl transition-all bg-secondary text-white uppercase tracking-[0.3em] hover:scale-[1.01] active:scale-95">Consolidar Hábito</Button>
        </div>
      </Modal>
    </div>
  );
}
