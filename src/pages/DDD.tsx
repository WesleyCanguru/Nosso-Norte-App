import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  ArrowLeftRight,
  CheckCircle2,
  Circle,
  MoreVertical,
  Target
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

type TaskType = 'quero_fazer' | 'tem_que';

interface Task {
  id: string;
  title: string;
  type: TaskType;
  completed: boolean;
  created_at: string;
}

export function DDD() {
  const user = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState({ quero_fazer: '', tem_que: '' });

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_name', user.name)
        .eq('completed', false)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "tasks" does not exist')) {
          console.error("Table 'tasks' doesn't exist yet.");
          setTasks([]);
          return;
        }
        throw error;
      }
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (type: TaskType) => {
    const title = newTitle[type].trim();
    if (!title || !user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title,
          type,
          user_name: user.name,
          completed: false
        }])
        .select()
        .single();

      if (error) throw error;
      setTasks([data, ...tasks]);
      setNewTitle({ ...newTitle, [type]: '' });
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Erro ao adicionar tarefa. Verifique se a tabela 'tasks' existe no Supabase.");
    }
  };

  const toggleTask = async (id: string, currentlyCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !currentlyCompleted, completed_at: !currentlyCompleted ? new Date().toISOString() : null })
        .eq('id', id);

      if (error) throw error;
      if (!currentlyCompleted) {
        setTasks(tasks.filter(t => t.id !== id));
      } else {
        fetchTasks();
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const switchType = async (id: string, currentType: TaskType) => {
    const nextType = currentType === 'quero_fazer' ? 'tem_que' : 'quero_fazer';
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ type: nextType })
        .eq('id', id);

      if (error) throw error;
      setTasks(tasks.map(t => t.id === id ? { ...t, type: nextType } : t));
    } catch (error) {
      console.error("Error switching task type:", error);
    }
  };

  const renderColumn = (type: TaskType, title: string, subtitle: string, gradient: string) => {
    const filteredTasks = tasks.filter(t => t.type === type);
    
    return (
      <div className="flex-1 min-w-full lg:min-w-[340px] space-y-8 md:space-y-12">
        <div className={cn("p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white shadow-[0_40px_80px_-20px_rgba(74,53,47,0.2)] relative overflow-hidden group border border-white/5", gradient)}>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] md:tracking-[0.4em] opacity-40">{title}</span>
              <span className="bg-white/10 backdrop-blur-md px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] border border-white/10 group-hover:scale-105 transition-transform">{filteredTasks.length} ARQUIVOS</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight uppercase leading-none">{subtitle}</h2>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 group-hover:scale-125 transition-transform duration-1000" />
        </div>

        <div className="space-y-4 md:space-y-5 px-1 md:px-2">
          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-surface border border-surface-border rounded-[1.5rem] md:rounded-3xl group focus-within:border-primary focus-within:shadow-2xl focus-within:shadow-primary/5 transition-all card-3d">
            <input 
              type="text" 
              placeholder={`Lançar em "${subtitle}"...`}
              value={newTitle[type]}
              onChange={(e) => setNewTitle({ ...newTitle, [type]: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addTask(type)}
              className="flex-1 bg-transparent border-none outline-none px-3 md:px-6 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] placeholder:text-text-muted/40"
            />
            <button 
              onClick={() => addTask(type)}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-secondary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-secondary/30"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          <div className="space-y-3 md:space-y-4">
            <AnimatePresence initial={false}>
              {filteredTasks.map((task) => (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface border border-surface-border rounded-2xl md:rounded-3xl p-4 md:p-6 flex items-center gap-4 md:gap-6 group hover:border-primary/30 transition-all shadow-sm hover:shadow-2xl hover:shadow-primary/5 card-3d overflow-hidden"
                >
                  <button 
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="text-text-muted hover:text-primary transition-all flex-shrink-0 transform hover:scale-110 active:scale-90"
                  >
                    <Circle className="w-6 h-6 md:w-7 md:h-7" />
                  </button>
                  <span className="flex-1 text-[10px] md:text-[11px] font-bold text-secondary uppercase tracking-widest truncate group-hover:text-primary transition-colors">{task.title}</span>
                  
                  <div className="flex items-center gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                    <button 
                      onClick={() => switchType(task.id, task.type)}
                      title="Mover coluna"
                      className="p-2 md:p-3 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg md:rounded-xl transition-all"
                    >
                      <ArrowLeftRight className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-2 md:p-3 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg md:rounded-xl transition-all"
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredTasks.length === 0 && (
              <div className="py-16 md:py-24 text-center border-2 border-dashed border-surface-border/50 rounded-[2rem] md:rounded-[3rem] bg-surface/30">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-surface-border/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-5">
                   <Target className="w-5 h-5 md:w-6 md:h-6 text-text-muted opacity-20" />
                </div>
                <p className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.4em] md:tracking-[0.5em] italic opacity-30 px-4">Mente limpa, <br />vácuo criativo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 md:space-y-16 pb-20 px-4 md:px-0">
      <header className="space-y-4 md:space-y-6">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">ADMINISTRAÇÃO DE DEMANDAS / 0&bull;3</span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-secondary leading-[0.9] tracking-[-0.04em] uppercase">
          DEPÓSITO DE<br />
          <span className="text-accent italic font-medium">DEMANDAS.</span>
        </h1>
        <p className="text-text-muted text-lg md:text-xl max-w-xl font-light">“A mente é para criar, não para armazenar. Esvazie o supérfluo, valide o essencial.”</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
        {renderColumn(
          'quero_fazer', 
          'QUERO FAZER / 01', 
          'Ideário', 
          'bg-secondary shadow-secondary/40'
        )}
        
        {renderColumn(
          'tem_que', 
          'TEM QUE FAZER / 02', 
          'Imperativo', 
          'bg-primary shadow-primary/40'
        )}
      </div>
    </div>
  );
}
