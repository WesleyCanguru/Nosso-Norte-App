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

const HABIT_TYPES = [
  { id: 'check', name: 'Check-in', description: 'Simples concluir' },
  { id: 'numeric', name: 'Numérico', description: 'Metas como km, litros...' }
];

const UNITS = ["vezes", "km", "minutos", "litros", "kcal", "páginas", "horas"];
const COLOR_OPTIONS = ["#5E6E5A", "#A66E6E", "#B38E5D", "#5D6D7E", "#A18E78", "#4A352F"];
const CATEGORIES = ["Saúde", "Trabalho", "Mental", "Espiritual", "Social", "Lazer", "Finanças"];

export function Metas() {
  const user = useUser();
  const { goals, updateGoals, loading: goalsLoading } = useUserGoals();
  const { cycle, startNewCycle, loading: cycleLoading } = useCycle();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [activeTab, setActiveTab] = useState<'pessoal' | 'foco'>('pessoal');
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [newCycleStartDate, setNewCycleStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Form State
  const [formData, setFormData] = useState<Partial<Habit>>({
    name: '',
    emoji: '💪',
    area: 'corpo',
    type: 'check',
    frequency_per_week: 7,
    daily_goal: 1,
    unit: 'vezes',
    category: 'Saúde',
    color: '#FF6B2C'
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

    try {
      if (editingHabit) {
        const { error } = await supabase
          .from('habits')
          .update({
            ...formData,
            user_name: user.name
          })
          .eq('id', editingHabit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('habits')
          .insert([{
            ...formData,
            user_name: user.name
          }]);
        if (error) throw error;
      }

      fetchHabits();
      setIsModalOpen(false);
      setEditingHabit(null);
      resetForm();
    } catch (error) {
      console.error("Error saving habit:", error);
    }
  };

  const [outcomes, setOutcomes] = useState<{id: string, title: string}[]>([]);
  const [newOutcome, setNewOutcome] = useState('');

  const fetchOutcomes = async () => {
    if (!user || !cycle) return;
    const { data } = await supabase
      .from('cycle_outcomes')
      .select('id, title')
      .eq('cycle_id', cycle.id);
    setOutcomes(data || []);
  };

  useEffect(() => {
    if (cycle) fetchOutcomes();
  }, [cycle]);

  const addOutcome = async () => {
    if (!user || !cycle || !newOutcome) return;
    const { error } = await supabase.from('cycle_outcomes').insert({
      user_name: user.name,
      cycle_id: cycle.id,
      title: newOutcome
    });
    if (!error) {
      setNewOutcome('');
      fetchOutcomes();
    }
  };

  const deleteHabit = async (id: string) => {
    if (!confirm("Excluir este hábito irreparavelmente?")) return;
    try {
      await supabase.from('habit_logs').delete().eq('habit_id', id);
      const { error } = await supabase.from('habits').delete().eq('id', id);
      if (error) throw error;
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
      emoji: '✨',
      area: 'corpo',
      type: 'check',
      frequency_per_week: 7,
      daily_goal: 1,
      unit: 'vezes',
      time: '',
      motivation: '',
      description: '',
      category: 'Saúde',
      color: '#5E6E5A'
    });
  };

  const filteredHabits = habits.filter(h => {
    if (activeTab === 'pessoal') {
      return h.area === 'alma' || h.area === 'corpo';
    }
    return h.area === 'foco';
  });

  if (goalsLoading || loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 md:space-y-20 pb-32 px-4 md:px-0">
      {/* Header Section */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full border border-primary/10 w-fit">
          <Target className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">A Arqueologia do Futuro</span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-secondary tracking-[-0.04em] leading-[0.9] uppercase">
          Nossas<br/>Metas.
        </h1>
        <p className="text-text-muted text-lg md:text-xl max-w-lg font-light leading-relaxed pt-2 md:pt-4">
          Onde a intenção se torna arquitetura. Defina o seu destino e mapeie o caminho com precisão absoluta.
        </p>
      </motion.header>

      {/* Year in 12 Weeks Cycle Section */}
      <section className="bg-secondary rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-14 text-white relative overflow-hidden shadow-3xl">
        {/* Background Decals */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-3 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full w-fit">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.4em]">Configurar Jornada</span>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight tracking-tight uppercase">
                O Ano em <span className="text-primary italic">12 Semanas.</span>
              </h2>
              <p className="text-white/60 text-lg md:text-xl font-light leading-relaxed max-w-2xl italic">
                “Um ano não tem 12 meses. Tem 12 semanas. O tempo é curto, a execução deve ser implacável.”
              </p>
            </div>

            {cycle ? (
              <div className="flex flex-wrap gap-8 items-center pt-4">
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.4em]">Início do Ciclo</p>
                  <p className="text-2xl font-bold font-display">{format(parseISO(cycle.start_date), "dd 'de' MMMM", { locale: ptBR })}</p>
                </div>
                <div className="w-px h-12 bg-white/10 hidden md:block" />
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.4em]">Horizonte Final</p>
                  <p className="text-2xl font-bold font-display text-primary">{format(parseISO(cycle.end_date), "dd 'de' MMMM", { locale: ptBR })}</p>
                </div>
                <button 
                  onClick={() => setIsCycleModalOpen(true)}
                  className="ml-auto bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Redefinir Ciclo
                </button>
              </div>
            ) : (
              <div className="pt-4">
                <Button 
                  onClick={() => setIsCycleModalOpen(true)}
                  className="bg-primary text-white h-16 px-10 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-2xl shadow-primary/30"
                >
                  Iniciar Ciclo de 12 Semanas
                </Button>
              </div>
            )}
            {cycle && (
              <div className="space-y-6 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.4em]">Grandes Metas do Ciclo</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      placeholder="Nova meta..."
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] outline-none focus:border-primary"
                    />
                    <button onClick={addOutcome} className="p-1 bg-primary rounded-lg"><Plus className="w-4 h-4 text-white" /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {outcomes.map(o => (
                    <span key={o.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium text-white/60">
                      {o.title}
                    </span>
                  ))}
                  {outcomes.length === 0 && <p className="text-[10px] text-white/20 italic">Nenhuma meta definida para as 12 semanas</p>}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 relative">
            <div className="aspect-square bg-white/5 rounded-[3rem] border border-white/5 p-8 flex items-center justify-center relative overflow-hidden group">
                <Calendar className="w-32 h-32 text-primary opacity-20 group-hover:scale-110 transition-transform duration-1000" />
                {cycle && (
                  <div className="absolute inset-0 flex items-center justify-center">
                     {/* Dynamic Progress indicator could go here */}
                  </div>
                )}
            </div>
          </div>
        </div>
      </section>

      {/* Cycle Configuration Modal */}
      <Modal 
        isOpen={isCycleModalOpen} 
        onClose={() => setIsCycleModalOpen(false)}
        title="Arquitetar Ciclo"
      >
        <div className="space-y-10 p-2">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.4em]">Marco Zero (Início)</label>
              <div className="flex items-center gap-2 text-primary">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold font-display uppercase">{format(parseISO(newCycleStartDate), "dd 'de' MMMM", { locale: ptBR })}</span>
              </div>
            </div>
            
            <div className="bg-surface-hover/30 border border-surface-border rounded-[2.5rem] p-8">
              <input 
                type="date" 
                value={newCycleStartDate}
                onChange={(e) => setNewCycleStartDate(e.target.value)}
                className="w-full bg-transparent border-none text-4xl md:text-5xl font-display font-bold text-secondary outline-none text-center cursor-pointer hover:text-primary transition-colors"
              />
              <p className="text-center text-[10px] text-text-muted font-bold uppercase tracking-widest mt-4">Toque para alterar a data</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-surface border border-surface-border rounded-3xl space-y-2">
              <p className="text-[8px] font-bold text-text-muted uppercase tracking-[0.2em]">Duração</p>
              <p className="text-xl font-bold text-secondary font-display italic">12 Semanas</p>
            </div>
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-2">
              <p className="text-[8px] font-bold text-primary/60 uppercase tracking-[0.2em]">Horizonte Final</p>
              <p className="text-xl font-bold text-primary font-display">
                {format(addDays(parseISO(newCycleStartDate), 84), "dd/MM/yy")}
              </p>
            </div>
          </div>

          <div className="p-8 bg-surface-hover/20 border border-dashed border-surface-border rounded-3xl">
             <p className="text-sm text-secondary font-light leading-relaxed italic text-center">
               “O planejamento sem execução é alucinação. Ao selar este ciclo, você assume o compromisso de 84 dias de foco implacável.”
             </p>
          </div>

          <Button 
            onClick={async () => {
              await startNewCycle(newCycleStartDate);
              setIsCycleModalOpen(false);
            }}
            className="w-full py-10 text-lg font-bold rounded-[2rem] bg-secondary text-white shadow-3xl shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em]"
          >
            Sincronizar Cronograma
          </Button>
        </div>
      </Modal>

      {/* Numerical Goals Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        {/* Corpo Block */}
        <div className="space-y-8 md:space-y-10">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center">
              <Heart className="w-6 h-6 md:w-7 md:h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-secondary uppercase tracking-tight">Vigor & Templo</h2>
              <p className="text-[9px] text-text-muted uppercase font-bold tracking-[0.2em] md:tracking-[0.3em]">CONDIÇÃO FÍSICA</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <GoalInput 
              label="Peso Alvo" 
              value={goals?.targetWeight || 0} 
              unit="kg" 
              icon={Scale}
              onChange={(v) => updateGoals({ targetWeight: v })}
            />
            <GoalInput 
              label="Gordura Alvo" 
              value={goals?.targetBf || 0} 
              unit="%" 
              icon={Droplets}
              onChange={(v) => updateGoals({ targetBf: v })}
            />
            <GoalInput 
              label="Calorias Diárias" 
              value={goals?.targetCalories || 0} 
              unit="kcal" 
              icon={Zap}
              onChange={(v) => updateGoals({ targetCalories: v })}
            />
            <GoalInput 
              label="Proteína Diária" 
              value={goals?.targetProtein || 0} 
              unit="g" 
              icon={Zap}
              onChange={(v) => updateGoals({ targetProtein: v })}
            />
          </div>
        </div>

        {/* Alma Block */}
        <div className="space-y-8 md:space-y-10 mt-4 lg:mt-0">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-accent/10 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center">
              <Brain className="w-6 h-6 md:w-7 md:h-7 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-secondary uppercase tracking-tight">Mental & Espírito</h2>
              <p className="text-[9px] text-text-muted uppercase font-bold tracking-[0.2em] md:tracking-[0.3em]">ESTADO DE SER</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-6">
            <GoalInput 
              label="Energia Diária Alvo" 
              value={goals?.targetEnergy || 0} 
              unit="/ 5" 
              icon={Zap}
              onChange={(v) => updateGoals({ targetEnergy: v })}
            />
            <div className="p-6 md:p-10 bg-surface border border-surface-border rounded-[2rem] md:rounded-[3rem] flex items-center justify-between group hover:shadow-2xl hover:shadow-primary/5 transition-all card-3d">
               <div className="space-y-2 md:space-y-3">
                 <p className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] md:tracking-[0.3em]">Status do Ciclo</p>
                 <p className="text-xl md:text-2xl font-bold text-secondary uppercase font-display">Busca da Excelência</p>
               </div>
               <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </section>

      {/* Habits Management Section */}
      <section className="space-y-10 md:space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 border-b border-surface-border pb-8 md:pb-10">
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-secondary uppercase tracking-tighter">Gestão de Hábitos</h2>
            <div className="flex gap-2 md:gap-4">
              <TabButton 
                active={activeTab === 'pessoal'} 
                onClick={() => setActiveTab('pessoal')}
                label="Pessoal"
              />
              <TabButton 
                active={activeTab === 'foco'} 
                onClick={() => setActiveTab('foco')}
                label="Profissional"
              />
            </div>
          </div>
          
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-secondary text-white h-14 md:h-16 px-8 md:px-10 rounded-2xl font-bold flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-secondary/20 group uppercase text-[10px] md:text-xs tracking-widest"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>Novo Hábito</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredHabits.map((habit) => (
              <motion.div 
                key={habit.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-surface border border-surface-border rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 space-y-6 md:space-y-8 group hover:shadow-2xl hover:shadow-primary/5 transition-all card-3d"
              >
                <div className="flex justify-between items-start">
                    <div 
                      className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-black/5"
                      style={{ backgroundColor: habit.color || '#5E6E5A' }}
                    >
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                  <div className="flex gap-1 md:gap-3">
                    <button 
                      onClick={() => handleEdit(habit)}
                      className="p-2 md:p-3 text-text-muted hover:text-primary hover:bg-primary/5 rounded-xl md:rounded-2xl transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteHabit(habit.id)}
                      className="p-2 md:p-3 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl md:rounded-2xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl md:text-2xl font-display font-bold text-secondary group-hover:text-primary transition-colors tracking-tight uppercase leading-tight">{habit.name}</h3>
                  <div className="flex items-center flex-wrap gap-2 md:gap-3">
                    <span className={cn(
                      "text-[9px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] px-2 md:px-3 py-1 rounded-full border",
                      AREAS.find(a => a.id === habit.area)?.color.replace('text-', 'bg-').split(' ')[0].concat('/10'),
                      AREAS.find(a => a.id === habit.area)?.color.replace('text-', 'border-').split(' ')[0].concat('/20'),
                      AREAS.find(a => a.id === habit.area)?.color
                    )}>
                      {AREAS.find(a => a.id === habit.area)?.name}
                    </span>
                    <span className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] md:tracking-[0.2em]">
                      {habit.frequency_per_week}x / semana
                    </span>
                  </div>
                </div>

                <div className="pt-6 md:pt-8 border-t border-surface-border flex items-center justify-between">
                   <div className="space-y-1">
                     <p className="text-[8px] md:text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] md:tracking-[0.3em]">Meta Diária</p>
                     <p className="text-sm md:text-base font-bold text-secondary uppercase font-display">{habit.daily_goal} {habit.unit}</p>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className={cn("w-2 h-2 rounded-full", habit.area === 'corpo' ? 'bg-primary' : 'bg-accent')} />
                     <span className="text-[8px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] md:tracking-[0.2em]">{habit.type === 'check' ? 'CHECK' : 'VALOR'}</span>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Habit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingHabit(null); }} 
        title={editingHabit ? "Ajustar Arquivo" : "Novo Registro"}
      >
        <div className="space-y-8 p-1 overflow-y-auto max-h-[85vh] scrollbar-hide">
          {/* Main Identifier */}
          <div className="space-y-3">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em] text-center block">Qual a natureza deste hábito?</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface-hover/30 border border-surface-border rounded-3xl px-8 py-10 text-3xl font-display font-bold text-secondary outline-none focus:border-primary transition-all text-center placeholder:opacity-20 uppercase tracking-tighter"
              placeholder="EX: MEDITAÇÃO PROFUNDA"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Area Select */}
            <div className="space-y-3">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em]">Esfera</label>
              <div className="flex flex-col gap-2">
                {AREAS.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => setFormData({ ...formData, area: area.id as any })}
                    className={cn(
                      "p-4 rounded-2xl flex items-center gap-3 border transition-all text-[10px] font-bold uppercase tracking-widest",
                      formData.area === area.id 
                        ? "bg-secondary text-white border-secondary shadow-lg" 
                        : "bg-surface-hover/20 border-surface-border text-text-muted opacity-60 hover:opacity-100"
                    )}
                  >
                    <span>{area.emoji}</span>
                    <span>{area.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Motivation - Why it matters */}
            <div className="space-y-3">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em]">Propósito / Motivação</label>
              <textarea 
                value={formData.motivation}
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                placeholder="Por que isso é inegociável?"
                className="w-full h-[148px] bg-surface-hover/20 border border-surface-border rounded-2xl px-5 py-4 text-xs font-light text-secondary outline-none focus:border-primary transition-all resize-none italic"
              />
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
                <Clock className="w-3 h-3" /> Horário
              </label>
              <input 
                type="time" 
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full bg-surface-hover/20 border border-surface-border rounded-xl px-4 py-3 text-xs font-bold text-secondary outline-none focus:border-primary transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
                <Tag className="w-3 h-3" /> Categoria
              </label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-surface-hover/20 border border-surface-border rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-secondary outline-none focus:border-primary transition-all appearance-none cursor-pointer"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em]">Cromatismo (Cor)</label>
              <div className="flex gap-2 justify-between bg-surface-hover/20 border border-surface-border rounded-xl p-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      "w-6 h-6 rounded-full border transition-all transform hover:scale-110",
                      formData.color === color ? "border-primary ring-2 ring-primary/20 scale-110" : "border-transparent opacity-60"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Goal Linkage */}
          <div className="space-y-3">
            <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
              <Target className="w-3 h-3" /> Arquitetura do Ciclo (Conectar à Meta)
            </label>
            <select 
              value={formData.goal_id}
              onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
              className="w-full bg-surface-hover/20 border border-surface-border rounded-xl px-5 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary outline-none focus:border-primary transition-all appearance-none cursor-pointer"
            >
              <option value="">Nenhuma meta de longo prazo vinculada</option>
              {outcomes.map(o => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
          </div>

          {/* Execution Strategy */}
          <div className="bg-surface-hover/10 rounded-[2.5rem] p-8 space-y-8 border border-surface-border">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em]">Recorrência Semanal</label>
                <span className="text-[10px] font-bold text-primary">{formData.frequency_per_week} dias por semana</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <button 
                    key={num}
                    onClick={() => setFormData({ ...formData, frequency_per_week: num })}
                    className={cn(
                      "flex-1 py-4 rounded-xl text-[10px] font-bold transition-all border",
                      formData.frequency_per_week === num 
                        ? "bg-secondary text-white border-secondary shadow-xl scale-105" 
                        : "bg-background border-surface-border text-text-muted hover:border-primary/40"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em]">Meta de Intensidade</label>
                <div className="flex gap-3">
                  <input 
                    type="number" 
                    value={formData.daily_goal}
                    onChange={(e) => setFormData({ ...formData, daily_goal: Number(e.target.value) })}
                    className="flex-1 bg-background border border-surface-border rounded-2xl px-6 py-4 text-xl font-display font-bold text-secondary outline-none focus:border-primary"
                  />
                  <select 
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="flex-1 bg-background border border-surface-border rounded-2xl px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-secondary cursor-pointer"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={saveHabit} 
            className="w-full py-10 text-xs font-bold rounded-[2rem] shadow-3xl transition-all bg-secondary text-white uppercase tracking-[0.3em] hover:scale-[1.01] active:scale-95"
          >
            Consolidar Arquitetura
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function GoalInput({ label, value, unit, icon: Icon, onChange }: any) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(Number(localValue));
    }
  };

  return (
    <div className="bg-surface border border-surface-border rounded-[3rem] p-10 space-y-6 card-3d group">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.4em]">{label}</span>
        <div className="p-4 bg-background border border-surface-border rounded-2xl group-hover:bg-primary group-hover:text-background transition-all duration-700">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="flex items-baseline gap-3">
        <input 
          type="number" 
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          className="bg-transparent border-none outline-none text-6xl md:text-7xl font-display font-bold text-secondary w-full tracking-tighter"
        />
        <span className="text-2xl font-bold text-text-muted uppercase tracking-tighter">{unit}</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-10 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-700",
        active ? "bg-secondary text-white shadow-2xl shadow-secondary/20" : "text-text-muted hover:bg-surface-hover hover:text-secondary"
      )}
    >
      {label}
    </button>
  );
}

