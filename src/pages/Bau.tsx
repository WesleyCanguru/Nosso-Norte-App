import React, { useState, useEffect } from "react";
import { 
  Archive, 
  Search, 
  CheckCircle2, 
  Filter,
  History,
  Trash2,
  MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";

export function Bau() {
  const user = useUser();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 pb-16 px-4 md:px-0">
      <header className="space-y-3 md:space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10">
          <History className="w-3 h-3 text-primary" />
          <span className="text-[8px] md:text-[9px] font-bold text-primary uppercase tracking-[0.4em]">ARQUIVO HISTÓRICO / 0&bull;5</span>
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-secondary leading-[0.9] tracking-[-0.04em] uppercase">
          BAÚ DE<br />
          <span className="text-accent italic font-medium">CONQUISTAS.</span>
        </h1>
        <p className="text-text-muted text-base md:text-lg max-w-lg font-light">“Onde o esforço de ontem se torna a fundação inabalável do amanhã.”</p>
      </header>

      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        <div className="flex-1 bg-surface border border-surface-border rounded-xl md:rounded-2xl p-1.5 md:p-2 flex items-center gap-2 md:gap-3 shadow-sm focus-within:border-primary focus-within:shadow-2xl focus-within:shadow-primary/5 transition-all">
          <Search className="w-4 h-4 md:w-5 md:h-5 text-text-muted ml-3 opacity-40" />
          <input 
            type="text" 
            placeholder="Buscar no histórico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] placeholder:text-text-muted/30"
          />
        </div>
        
        <div className="flex gap-2">
           <button className="flex-1 md:flex-none bg-surface border border-surface-border rounded-xl md:rounded-2xl px-4 md:px-6 py-2 md:py-3 text-[8px] md:text-[9px] font-bold text-secondary uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/20 transition-all">
             <Filter className="w-3.5 h-3.5" />
             Filtros
           </button>
           <button className="flex-1 md:flex-none bg-secondary text-white rounded-xl md:rounded-2xl px-4 md:px-6 py-2 md:py-3 text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-2xl shadow-secondary/20 transition-all">
             Exportar
           </button>
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-2xl md:rounded-3xl shadow-2xl shadow-primary/5 overflow-hidden min-h-[350px] md:min-h-[400px] card-3d">
        <div className="divide-y divide-surface-border">
          {filteredTasks.map((task) => (
            <div key={task.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-primary/[0.02] transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/5 text-primary rounded-full flex items-center justify-center border border-primary/10 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[3]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-secondary text-base md:text-xl uppercase tracking-tight group-hover:text-primary transition-colors truncate">{task.title}</h3>
                  <p className="text-[8px] md:text-[9px] text-text-muted font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                    {new Date(task.completed_at || task.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <button className="p-2.5 md:p-3 text-text-muted hover:text-accent hover:bg-accent/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {filteredTasks.length === 0 && !loading && (
            <div className="py-24 text-center flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-background border border-surface-border rounded-full flex items-center justify-center grayscale opacity-10">
                <Archive className="w-8 h-8" />
              </div>
              <p className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] md:tracking-[0.4em] italic opacity-30 max-w-xs leading-relaxed px-4">
                O baú está vazio. <br />Construa seu legado no presente para arquivar no futuro.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
