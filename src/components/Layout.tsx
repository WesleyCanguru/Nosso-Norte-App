import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Zap, 
  ListTodo, 
  Target,
  Timer, 
  LineChart, 
  Archive,
  LogOut,
  ChevronRight,
  User,
  Menu,
  X,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "./Button";
import { useCycle } from "@/hooks/useCycle";
import { motion, AnimatePresence } from "motion/react";
import { parseISO, format } from "date-fns";

const navItems = [
  { name: "Início", path: "/", icon: LayoutDashboard },
  { name: "Metas", path: "/metas", icon: Target },
  { name: "Hábitos", path: "/habitos", icon: Zap },
  { name: "DDD", path: "/ddd", icon: ListTodo },
  { name: "Pomodoro", path: "/pomodoro", icon: Timer },
  { name: "Estatísticas", path: "/estatisticas", icon: LineChart },
  { name: "Baú", path: "/bau", icon: Archive },
];

export function Layout({ user, onLogout }: { user: { name: string }, onLogout: () => void }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('w12_sidebar_collapsed');
    return saved === 'true';
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { cycle } = useCycle();

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('w12_sidebar_collapsed', String(newState));
  };

  const getCycleProgress = () => {
    if (!cycle) return null;
    const start = parseISO(cycle.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const totalDays = 84; 
    const progress = Math.min(Math.max((diffDays / totalDays) * 100, 0), 100);
    const currentDay = Math.min(Math.max(diffDays, 0), totalDays);
    return { currentDay, totalDays, progress };
  };

  const cycleInfo = getCycleProgress();

  const handleLogout = async () => {
    localStorage.removeItem('w12_user');
    onLogout();
    navigate("/");
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={cn(
      "min-h-screen w-full bg-background text-text-main selection:bg-primary selection:text-white pb-12 md:pb-0 transition-all duration-700",
      isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
    )}>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex fixed left-0 top-0 h-full bg-surface/50 backdrop-blur-2xl border-r border-surface-border flex-col z-50 transition-all duration-700 overflow-hidden",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-[10px] text-white font-bold shadow-2xl shadow-primary/30 rotate-3 flex-shrink-0">NN</div>
              {!isSidebarCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="oryzo-logo block leading-none text-xl tracking-[-0.08em]">Nosso Norte</span>
                  <span className="text-[7px] font-bold text-text-muted uppercase tracking-[0.4em] mt-1 block opacity-60">ARCHITECTS</span>
                </motion.div>
              )}
            </div>
            
            <button 
              onClick={toggleSidebar}
              className="text-text-muted hover:text-primary transition-colors p-1"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
          
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              className="text-[9px] font-bold text-text-muted uppercase tracking-[0.4em] mb-4 pl-4"
            >
              NAVEGAÇÃO / 0&bull;1
            </motion.div>
          )}
        </div>
        
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto scrollbar-hide py-4">
          {navItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={isSidebarCollapsed ? item.name : ""}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-500 group relative overflow-hidden",
                  isActive 
                    ? "bg-secondary text-white shadow-lg shadow-secondary/15" 
                    : "text-text-muted hover:bg-surface-hover hover:text-secondary border border-transparent hover:border-surface-border",
                  isSidebarCollapsed ? "justify-center px-0" : ""
                )
              }
            >
              <div className={cn(
                "flex items-center gap-3.5 relative z-10 w-full",
                isSidebarCollapsed ? "justify-center" : ""
              )}>
                <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110 flex-shrink-0")} />
                {!isSidebarCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{item.name}</span>
                    <span className="text-[7px] opacity-30 font-mono">0{index + 1}</span>
                  </motion.div>
                )}
              </div>
            </NavLink>
          ))}
        </nav>

        <div className={cn(
          "p-4 md:p-6 border-t border-surface-border space-y-4 transition-all duration-500",
          isSidebarCollapsed ? "items-center" : ""
        )}>
          {cycle && cycleInfo && !isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-2 space-y-3 mb-4"
            >
              <div className="flex items-center justify-between text-[8px] font-bold text-text-muted uppercase tracking-[0.3em]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-2.5 h-2.5 text-primary" />
                  <span>DIA {cycleInfo.currentDay} / {cycleInfo.totalDays}</span>
                </div>
                <span>{Math.round(cycleInfo.progress)}%</span>
              </div>
              <div className="h-1 w-full bg-background border border-surface-border rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${cycleInfo.progress}%` }}
                  transition={{ duration: 1 }}
                  className="h-full bg-primary"
                />
              </div>
            </motion.div>
          )}

          {isSidebarCollapsed && cycle && cycleInfo && (
             <div className="flex justify-center mb-2">
                <div className="w-1.5 h-8 bg-surface-border rounded-full relative overflow-hidden">
                   <div 
                    className="absolute bottom-0 left-0 w-full bg-primary transition-all duration-1000" 
                    style={{ height: `${cycleInfo.progress}%` }}
                   />
                </div>
             </div>
          )}

          <div className={cn(
            "flex items-center gap-3 transition-all duration-500",
            isSidebarCollapsed ? "flex-col justify-center gap-4" : "p-2"
          )}>
            <div className="w-10 h-10 rounded-full bg-background border border-surface-border flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-bold text-secondary truncate">{user.name}</p>
                <p className="text-[10px] text-text-muted truncate">Ciclo Ativo</p>
              </motion.div>
            )}
            <button 
              onClick={handleLogout}
              className={cn(
                "text-text-muted hover:text-red-500 transition-colors p-2",
                isSidebarCollapsed ? "hover:bg-red-50 rounded-xl" : ""
              )}
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className={cn(
        "md:hidden fixed top-0 left-0 w-full z-50 px-6 py-5 flex items-center justify-between transition-all duration-700",
        isScrolled || isMobileMenuOpen ? "bg-surface/90 backdrop-blur-2xl border-b border-surface-border shadow-sm" : "bg-transparent"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-[11px] text-white font-bold shadow-xl shadow-primary/20 rotate-3">NN</div>
          <span className="oryzo-logo text-xl tracking-[-0.08em]">Nosso Norte</span>
        </div>
        
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-10 h-10 rounded-full bg-surface border border-surface-border flex items-center justify-center shadow-sm text-secondary hover:bg-surface-hover transition-all"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-surface/95 backdrop-blur-3xl md:hidden pt-24 px-6 pb-12 flex flex-col"
          >
            <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.4em] mb-6 pl-4 opacity-40">MENUDESK / 0•1</p>
              {navItems.map((item, index) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between px-6 py-5 rounded-[2rem] text-xs font-bold uppercase tracking-[0.2em] transition-all duration-500",
                      isActive 
                        ? "bg-secondary text-white shadow-2xl shadow-secondary/20" 
                        : "text-text-muted hover:bg-surface-hover hover:text-secondary border border-transparent"
                    )
                  }
                >
                  <div className="flex items-center gap-5">
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 opacity-30")} />
                </NavLink>
              ))}
            </div>

            <div className="pt-8 mt-auto border-t border-surface-border space-y-6">
              {cycle && cycleInfo && (
                <div className="px-6 space-y-3">
                  <div className="flex items-center justify-between text-[9px] font-bold text-text-muted uppercase tracking-[0.3em]">
                    <div className="flex items-center gap-2">
                       <Calendar className="w-3 h-3 text-primary" />
                       <span>DIA {cycleInfo.currentDay} / {cycleInfo.totalDays}</span>
                    </div>
                    <span>{Math.round(cycleInfo.progress)}% DO CICLO</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${cycleInfo.progress}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 px-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-secondary font-bold text-sm uppercase tracking-tight">{user?.name}</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest">Plano Premium</p>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-4 h-16 rounded-[2rem] border border-red-500/20 text-red-500 font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-red-500/5 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Encerrar Sessão
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-700 pt-32 md:pt-10 px-6 md:px-8 lg:px-12 w-full animate-in fade-in duration-700",
        isMobileMenuOpen ? "blur-xl" : "blur-0"
      )}>
        <Outlet />
      </main>
    </div>
  );
}
