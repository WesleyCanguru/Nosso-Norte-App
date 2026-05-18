import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  ArrowLeftRight,
  CheckCircle2,
  Circle,
  MoreVertical,
  Target,
  GripVertical
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ConfirmDialog } from "@/components/ConfirmDialog";

type TaskType = 'quero_fazer' | 'tem_que';

interface Task {
  id: string;
  title: string;
  type: TaskType;
  completed: boolean;
  created_at: string;
  position?: number;
}

export function DDD() {
  const user = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState({ quero_fazer: '', tem_que: '' });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
        .order('position', { ascending: true })
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
      const typeTasks = tasks.filter(t => t.type === type);
      const maxPos = typeTasks.length > 0 ? Math.max(...typeTasks.map(t => t.position || 0)) : -1;
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title,
          type,
          position: maxPos + 1,
          user_name: user.name,
          completed: false
        }])
        .select()
        .single();

      if (error) throw error;
      setTasks([...tasks, data]);
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

  const saveTaskEdit = async (id: string) => {
    if (!editTaskTitle.trim()) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title: editTaskTitle.trim() })
        .eq('id', id);

      if (error) throw error;
      setTasks(tasks.map(t => t.id === id ? { ...t, title: editTaskTitle.trim() } : t));
      setEditingTaskId(null);
    } catch (error) {
      console.error("Error updating task:", error);
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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceColumn = result.source.droppableId as TaskType;
    const destColumn = result.destination.droppableId as TaskType;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceColumn === destColumn && sourceIndex === destIndex) return;

    const sourceTasks = tasks.filter(t => t.type === sourceColumn).sort((a, b) => (a.position || 0) - (b.position || 0));
    const destTasks = sourceColumn === destColumn ? sourceTasks : tasks.filter(t => t.type === destColumn).sort((a, b) => (a.position || 0) - (b.position || 0));
    
    const [movedTask] = sourceTasks.splice(sourceIndex, 1);
    
    if (sourceColumn === destColumn) {
      sourceTasks.splice(destIndex, 0, movedTask);
      
      const newTasks = tasks.filter(t => t.type !== sourceColumn);
      const updatedTasks = sourceTasks.map((t, idx) => ({ ...t, position: idx }));
      setTasks([...newTasks, ...updatedTasks]);

      // Update in DB
      for (let i = 0; i < updatedTasks.length; i++) {
        supabase.from('tasks').update({ position: i }).eq('id', updatedTasks[i].id).then();
      }
    } else {
      movedTask.type = destColumn;
      destTasks.splice(destIndex, 0, movedTask);
      
      const newTasks = tasks.filter(t => t.type !== sourceColumn && t.type !== destColumn);
      const updatedSource = sourceTasks.map((t, idx) => ({ ...t, position: idx }));
      const updatedDest = destTasks.map((t, idx) => ({ ...t, position: idx }));
      
      setTasks([...newTasks, ...updatedSource, ...updatedDest]);

      // Update type of moved task
      await supabase.from('tasks').update({ type: destColumn }).eq('id', movedTask.id).then();

      // Update positions in DB
      for (let i = 0; i < updatedSource.length; i++) {
        supabase.from('tasks').update({ position: i }).eq('id', updatedSource[i].id).then();
      }
      for (let i = 0; i < updatedDest.length; i++) {
        supabase.from('tasks').update({ position: i }).eq('id', updatedDest[i].id).then();
      }
    }
  };

    const renderColumn = (type: TaskType, title: string, subtitle: string, gradient: string) => {
      const filteredTasks = tasks.filter(t => t.type === type).sort((a, b) => (a.position || 0) - (b.position || 0));
      
      return (
        <div className="flex-1 min-w-full lg:min-w-[340px] space-y-6 md:space-y-8">
          <div className={cn("p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-white shadow-[0_30px_60px_-15px_rgba(74,53,47,0.2)] relative overflow-hidden group border border-white/5", gradient)}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3 md:mb-5">
                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] md:tracking-[0.4em] opacity-40">{title}</span>
                <span className="bg-white/10 backdrop-blur-md px-2.5 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] border border-white/10 group-hover:scale-105 transition-transform">{filteredTasks.length} ARQUIVOS</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight uppercase leading-none">{subtitle}</h2>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:scale-125 transition-transform duration-1000" />
          </div>
  
          <div className="space-y-3 md:space-y-4 px-1 md:px-2">
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-surface border border-surface-border rounded-xl md:rounded-[1.5rem] group focus-within:border-primary focus-within:shadow-2xl focus-within:shadow-primary/5 transition-all card-3d">
              <input 
                type="text" 
                placeholder={`Lançar em "${subtitle}"...`}
                value={newTitle[type]}
                onChange={(e) => setNewTitle({ ...newTitle, [type]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addTask(type)}
                className="flex-1 bg-transparent border-none outline-none px-3 md:px-4 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] placeholder:text-text-muted/40"
              />
              <button 
                onClick={() => addTask(type)}
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-secondary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-secondary/30"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
  
            <div className="space-y-2 md:space-y-3">
              <Droppable droppableId={type}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 md:space-y-3 min-h-[50px]">
                    {filteredTasks.map((task, index) => (
                      <React.Fragment key={task.id}>
                        {/* @ts-ignore */}
                        <Draggable draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{...provided.draggableProps.style }}
                            className="relative"
                          >
                            <motion.div
                              drag="x"
                              dragConstraints={{ left: 0, right: 0 }}
                              dragElastic={{ left: 0.5, right: 0 }}
                              onDragEnd={(e, info) => {
                                if (info.offset.x < -80) {
                                  setDeleteTarget(task.id);
                                }
                              }}
                              className={cn(
                                "bg-surface border border-surface-border rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4 group hover:border-primary/30 shadow-sm card-3d overflow-hidden relative z-10",
                                snapshot.isDragging ? "shadow-2xl shadow-primary/20 scale-105 z-50 border-primary" : "hover:shadow-2xl hover:shadow-primary/5 transition-all"
                              )}
                            >
                              <div {...provided.dragHandleProps} className="text-surface-border hover:text-text-muted transition-colors cursor-grab active:cursor-grabbing p-1 -ml-2 rounded-lg">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <button 
                                onClick={() => toggleTask(task.id, task.completed)}
                                className="text-text-muted hover:text-primary transition-all flex-shrink-0 transform hover:scale-110 active:scale-90"
                              >
                                <Circle className="w-5 h-5 md:w-6 md:h-6" />
                              </button>
                              
                              {editingTaskId === task.id ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editTaskTitle}
                                    onChange={(e) => setEditTaskTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveTaskEdit(task.id)}
                                    className="flex-1 bg-transparent border-b border-primary outline-none focus:border-primary text-[9px] md:text-[10px] font-bold text-secondary uppercase tracking-widest"
                                    autoFocus
                                  />
                                  <button onClick={() => saveTaskEdit(task.id)} className="text-[9px] font-bold text-primary uppercase">Salvar</button>
                                  <button onClick={() => setEditingTaskId(null)} className="text-[9px] font-bold text-text-muted uppercase">Canc</button>
                                </div>
                              ) : (
                                <span 
                                  className="flex-1 text-[9px] md:text-[10px] font-bold text-secondary uppercase tracking-widest truncate group-hover:text-primary transition-colors cursor-pointer"
                                  onClick={() => {
                                    setEditingTaskId(task.id);
                                    setEditTaskTitle(task.title);
                                  }}
                                >
                                  {task.title}
                                </span>
                              )}
                              
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                <button 
                                  onClick={() => switchType(task.id, task.type)}
                                  title="Mover coluna"
                                  className="p-1.5 md:p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                >
                                  <ArrowLeftRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                </button>
                                <button 
                                  onClick={() => setDeleteTarget(task.id)}
                                  className="p-1.5 md:p-2 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                </button>
                              </div>
                            </motion.div>
                            <div className="absolute inset-y-0 right-0 w-24 bg-red-500 rounded-xl md:rounded-2xl flex items-center justify-end px-6 z-0">
                               <Trash2 className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          )}
                        </Draggable>
                      </React.Fragment>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              
              {filteredTasks.length === 0 && (
                <div className="py-12 md:py-16 text-center border-2 border-dashed border-surface-border/50 rounded-2xl md:rounded-3xl bg-surface/30">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-surface-border/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                     <Target className="w-4 h-4 md:w-5 md:h-5 text-text-muted opacity-20" />
                  </div>
                  <p className="text-[8px] md:text-[9px] font-bold text-text-muted uppercase tracking-[0.4em] md:tracking-[0.5em] italic opacity-30 px-4">Mente limpa, <br />vácuo criativo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };
  
    return (
      <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-16 px-4 md:px-0">
        <header className="space-y-3 md:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[8px] md:text-[9px] font-bold text-primary uppercase tracking-[0.4em]">ADMINISTRAÇÃO DE DEMANDAS / 0&bull;3</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-secondary leading-[0.9] tracking-[-0.04em] uppercase">
            DEPÓSITO DE<br />
            <span className="text-accent italic font-medium">DEMANDAS.</span>
          </h1>
          <p className="text-text-muted text-base md:text-lg max-w-xl font-light">“A mente é para criar, não para armazenar. Esvazie o supérfluo, valide o essencial.”</p>
        </header>
  
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {renderColumn(
            'quero_fazer', 
            'QUERO FAZER / 01', 
            'To-do', 
            'bg-secondary shadow-secondary/40'
          )}
          
          {renderColumn(
            'tem_que', 
            'TEM QUE FAZER / 02', 
            'Tem que', 
            'bg-primary shadow-primary/40'
          )}
        </div>
      </DragDropContext>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteTask(deleteTarget);
        }}
        title="Excluir Demanda"
        description="Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita."
      />
      </div>
    );
}
