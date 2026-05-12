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
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <header className="space-y-6">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
          <History className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">ARQUIVO HISTÓRICO / 0&bull;5</span>
        </div>
        <h1 className="text-6xl md:text-7xl font-display font-bold text-secondary leading-[0.85] tracking-[-0.06em] uppercase">
          BAÚ DE<br />
          <span className="text-accent italic font-medium">CONQUISTAS.</span>
        </h1>
        <p className="text-text-muted text-xl max-w-lg font-light">“Onde o esforço de ontem se torna a fundação inabalável do amanhã.”</p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-surface border border-surface-border rounded-3xl p-3 flex items-center gap-4 shadow-sm focus-within:border-primary focus-within:shadow-2xl focus-within:shadow-primary/5 transition-all">
          <Search className="w-5 h-5 text-text-muted ml-4 opacity-40" />
          <input 
            type="text" 
            placeholder="Buscar no arquivo histórico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-[0.2em] placeholder:text-text-muted/30"
          />
        </div>
        
        <div className="flex gap-3">
           <button className="bg-surface border border-surface-border rounded-3xl px-10 py-5 text-[10px] font-bold text-secondary uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-primary/5 hover:border-primary/20 transition-all">
             <Filter className="w-4 h-4" />
             Filtros
           </button>
           <button className="bg-secondary text-white rounded-3xl px-10 py-5 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-105 active:scale-95 shadow-2xl shadow-secondary/20 transition-all">
             Exportar
           </button>
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-[3.5rem] shadow-2xl shadow-primary/5 overflow-hidden min-h-[450px] card-3d">
        <div className="divide-y divide-surface-border">
          {filteredTasks.map((task) => (
            <div key={task.id} className="p-10 flex items-center justify-between hover:bg-primary/[0.02] transition-colors group">
              <div className="flex items-center gap-8">
                <div className="w-14 h-14 bg-primary/5 text-primary rounded-full flex items-center justify-center border border-primary/10">
                  <CheckCircle2 className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-secondary text-2xl uppercase tracking-tight group-hover:text-primary transition-colors">{task.title}</h3>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary/20" />
                    Arquivado em: {new Date(task.completed_at || task.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <button className="p-4 text-text-muted hover:text-accent hover:bg-accent/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          {filteredTasks.length === 0 && !loading && (
            <div className="py-32 text-center flex flex-col items-center gap-8">
              <div className="w-24 h-24 bg-background border border-surface-border rounded-full flex items-center justify-center grayscale opacity-10">
                <Archive className="w-10 h-10" />
              </div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.4em] italic opacity-30 max-w-xs leading-relaxed">
                O baú está vazio. <br />Construa seu legado no presente para arquivar no futuro.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
