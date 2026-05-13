import React, { useState, useEffect } from "react";
import { 
  Archive, 
  Search, 
  Trash2,
  History,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";

type SortOrder = 'desc' | 'asc';
type TypeFilter = 'todas' | 'quero_fazer' | 'tem_que';

export function Bau() {
  const user = useUser();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todas');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_name', user.name)
        .eq('completed', true)
        .order('completed_at', { ascending: false });
      
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (id: string, currentlyCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !currentlyCompleted, completed_at: null })
        .eq('id', id);

      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error restoring task:", error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  let filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  
  if (typeFilter !== 'todas') {
    filteredTasks = filteredTasks.filter(t => t.type === typeFilter);
  }

  filteredTasks.sort((a, b) => {
    const timeA = new Date(a.completed_at || a.created_at).getTime();
    const timeB = new Date(b.completed_at || b.created_at).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const getTypeLabel = (type: string) => {
    if (type === 'quero_fazer') return 'To-do';
    if (type === 'tem_que') return 'Tem que';
    return type;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-10 pb-16 px-4 md:px-0">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-secondary tracking-tight">
          Baú de tarefas
        </h1>
        <p className="text-text-muted text-sm md:text-base font-medium">
          {tasks.length} tarefas concluídas.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-3 md:gap-4 bg-surface border border-surface-border p-2 md:p-3 rounded-2xl md:rounded-3xl shadow-sm">
        <div className="flex-1 flex items-center gap-2 md:gap-3 px-2">
          <Search className="w-4 h-4 md:w-5 md:h-5 text-text-muted opacity-40 ml-1" />
          <input 
            type="text" 
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-text-muted/40 py-2"
          />
        </div>
        
        <div className="flex gap-2">
           <select 
             value={typeFilter}
             onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
             className="bg-background border border-surface-border rounded-xl px-4 py-2 text-sm font-medium text-secondary outline-none focus:border-primary transition-colors cursor-pointer appearance-none min-w-[120px]"
           >
             <option value="todas">Todas</option>
             <option value="quero_fazer">To-do</option>
             <option value="tem_que">Tem que</option>
           </select>
           
           <select
             value={sortOrder}
             onChange={(e) => setSortOrder(e.target.value as SortOrder)}
             className="bg-background border border-surface-border rounded-xl px-4 py-2 text-sm font-medium text-secondary outline-none focus:border-primary transition-colors cursor-pointer appearance-none min-w-[140px]"
           >
             <option value="desc">Mais recentes</option>
             <option value="asc">Mais antigas</option>
           </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div key={task.id} className="bg-surface border border-surface-border rounded-xl md:rounded-2xl p-4 md:p-5 flex items-center justify-between hover:border-primary/20 transition-colors group">
            <div className="min-w-0 pr-4">
              <h3 className="font-medium text-secondary text-base truncate mb-1">{task.title}</h3>
              <p className="text-xs text-text-muted">
                {getTypeLabel(task.type)} &middot; {new Date(task.completed_at || task.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => toggleTask(task.id, task.completed)}
                 title="Restaurar tarefa"
                 className="p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
               >
                 <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
               </button>
               <button 
                 onClick={() => deleteTask(task.id)}
                 title="Excluir definitivamente"
                 className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
               >
                 <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
               </button>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && !loading && (
          <div className="py-24 text-center flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-surface border border-surface-border rounded-full flex items-center justify-center grayscale opacity-20">
              <Archive className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-text-muted opacity-50 px-4">
              Nenhuma tarefa encontrada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
