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
  MoreVertical
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useUserGoals } from "@/hooks/useUserGoals";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";

type Habit = {
  id: string;
  name: string;
  emoji: string;
  area: 'alma' | 'corpo' | 'foco';
  type: 'check' | 'numeric';
  frequency_per_week: number;
  daily_goal: number;
  unit: string;
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

const EMOJI_OPTIONS = ["💪", "💧", "🧘", "📖", "🥦", "🏃", "⚡", "🔋", "🌙", "💻", "🧠", "🎯", "🍎", "🚶", "🔇"];

const UNITS = ["vezes", "km", "minutos", "litros", "kcal", "páginas", "horas"];

export function Metas() {
  const user = useUser();
  const { goals, updateGoals, loading: goalsLoading } = useUserGoals();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [activeTab, setActiveTab] = useState<'pessoal' | 'foco'>('pessoal');

  // Form State
  const [formData, setFormData] = useState<Partial<Habit>>({
    name: '',
    emoji: '💪',
    area: 'corpo',
    type: 'check',
    frequency_per_week: 7,
    daily_goal: 1,
    unit: 'vezes'
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
      emoji: '💪',
      area: 'corpo',
      type: 'check',
      frequency_per_week: 7,
      daily_goal: 1,
      unit: 'vezes'
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
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-background border border-surface-border rounded-xl md:rounded-2xl flex items-center justify-center text-3xl md:text-4xl group-hover:scale-110 transition-transform shadow-sm">
                    {habit.emoji}
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
        title={editingHabit ? "Editar Hábito" : "Conceber Novo Hábito"}
      >
        <div className="space-y-10 p-2 overflow-y-auto max-h-[80vh] scrollbar-hide">
          {/* Main Name */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Nomenclatura</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-background border border-surface-border rounded-3xl px-8 py-6 text-2xl font-serif font-bold text-secondary outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
              placeholder="Ex: Domínio Matinal"
            />
          </div>

          {/* Emoji Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Símbolo Atávico</label>
            <div className="flex flex-wrap gap-3">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setFormData({ ...formData, emoji })}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95",
                    formData.emoji === emoji ? "bg-primary text-white shadow-xl shadow-primary/20 scale-110" : "bg-background border border-surface-border text-secondary hover:border-primary/40"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Area Select (Modern Style) */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Esfera de Atuação</label>
            <div className="grid grid-cols-3 gap-4">
              {AREAS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setFormData({ ...formData, area: area.id as any })}
                  className={cn(
                    "p-4 rounded-2xl flex flex-col items-center gap-2 border transition-all hover:shadow-lg",
                    formData.area === area.id 
                      ? "bg-surface border-primary shadow-xl shadow-primary/5" 
                      : "bg-background border-surface-border opacity-50 hover:opacity-100"
                  )}
                >
                  <span className="text-2xl">{area.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{area.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Type Selection (Modern) */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Mecânica de Medição</label>
            <div className="grid grid-cols-2 gap-4">
              {HABIT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFormData({ ...formData, type: type.id as any })}
                  className={cn(
                    "p-6 rounded-[2rem] text-left border transition-all h-full flex flex-col justify-between group",
                    formData.type === type.id 
                      ? "bg-secondary text-white border-secondary shadow-2xl" 
                      : "bg-background border-surface-border text-secondary hover:border-primary/40"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center mb-4 transition-all",
                    formData.type === type.id ? "bg-primary text-white" : "bg-primary/10 text-primary group-hover:scale-110"
                  )}>
                    {type.id === 'check' ? <Check className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm tracking-tight">{type.name}</p>
                    <p className={cn(
                      "text-[10px] uppercase tracking-widest mt-1",
                      formData.type === type.id ? "text-white/40" : "text-text-muted"
                    )}>{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Frequency */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Recorrência Semanal</label>
              <div className="flex items-center gap-4 bg-background border border-surface-border rounded-3xl p-2 h-16">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <button 
                    key={num}
                    onClick={() => setFormData({ ...formData, frequency_per_week: num })}
                    className={cn(
                      "flex-1 h-full rounded-2xl flex items-center justify-center text-xs font-bold transition-all",
                      formData.frequency_per_week === num ? "bg-primary text-white shadow-lg" : "text-text-muted hover:bg-surface-hover"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Goal */}
            {formData.type === 'numeric' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Meta Diária</label>
                  <input 
                    type="number" 
                    value={formData.daily_goal}
                    onChange={(e) => setFormData({ ...formData, daily_goal: Number(e.target.value) })}
                    className="w-full h-16 bg-background border border-surface-border rounded-3xl px-6 text-xl font-bold text-secondary outline-none focus:border-primary transition-all text-center"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Unidade</label>
                  <select 
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full h-16 bg-background border border-surface-border rounded-3xl px-4 font-bold text-xs text-secondary outline-none focus:border-primary transition-all"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={saveHabit} 
            className="w-full py-8 text-lg font-bold rounded-3xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary"
          >
            {editingHabit ? "Atualizar Diretriz" : "Selar Destino"}
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

