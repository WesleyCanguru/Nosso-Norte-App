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
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "./Button";
import { getCycleInfo } from "@/lib/cycle";

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
  const [userInitials, setUserInitials] = useState(user.name.substring(0, 2).toUpperCase());
  const location = useLocation();
  const navigate = useNavigate();
  const { currentDay, totalDays, cycleProgress } = getCycleInfo();

  const handleLogout = async () => {
    localStorage.removeItem('w12_user');
    onLogout();
    navigate("/");
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen w-full bg-background text-text-main selection:bg-primary selection:text-white pb-24 md:pb-0 md:pl-20 lg:pl-64">
      {/* Desktop Sidebar (Lg screens) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-surface/50 backdrop-blur-2xl border-r border-surface-border flex-col z-50">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center text-[11px] text-white font-bold shadow-2xl shadow-primary/30 rotate-3 group-hover:rotate-0 transition-transform">NN</div>
            <div>
              <span className="oryzo-logo block leading-none text-2xl tracking-[-0.08em]">Nosso Norte</span>
              <span className="text-[8px] font-bold text-text-muted uppercase tracking-[0.4em] mt-1 block opacity-60">ARCHITECTS OF TIME</span>
            </div>
          </div>
          
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.4em] mb-6 pl-4 opacity-40">NAVEGAÇÃO / 0&bull;1</div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-500 group relative overflow-hidden",
                  isActive 
                    ? "bg-secondary text-white shadow-xl shadow-secondary/20" 
                    : "text-text-muted hover:bg-surface-hover hover:text-secondary border border-transparent hover:border-surface-border"
                )
              }
            >
              <div className="flex items-center gap-4 relative z-10 w-full">
                <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110")} />
                <span>{item.name}</span>
                <span className="ml-auto text-[8px] opacity-30 font-mono">0{index + 1}</span>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-surface-border space-y-4">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-background border border-surface-border flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-secondary truncate">{user.name}</p>
              <p className="text-[10px] text-text-muted truncate">Ciclo Ativo</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar (Md screens - Icons only) */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 h-full w-24 bg-surface border-r border-surface-border flex-col items-center py-10 z-50">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-[11px] text-white font-bold shadow-2xl shadow-primary/30 mb-12 rotate-3">NN</div>
        <nav className="flex-1 space-y-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.name}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500",
                  isActive 
                    ? "bg-secondary text-white shadow-2xl shadow-secondary/20 scale-110" 
                    : "text-text-muted hover:bg-surface-hover hover:text-secondary border border-transparent hover:border-surface-border"
                )
              }
            >
              <item.icon className="w-6 h-6" />
            </NavLink>
          ))}
        </nav>
        
        <button 
          onClick={handleLogout}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-all duration-500"
          title="Sair"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50 bg-white/80 backdrop-blur-xl border border-surface-border shadow-2xl rounded-3xl px-2 py-2 flex items-center justify-around">
        {navItems.filter(item => ["Início", "Hábitos", "DDD", "Pomodoro"].includes(item.name)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-text-muted hover:text-secondary"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter opacity-80">{item.name === "Início" ? "Home" : item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Mobile Top Header */}
      <header className={cn(
        "md:hidden fixed top-0 left-0 w-full z-40 px-6 py-5 flex items-center justify-between transition-all duration-500",
        isScrolled ? "bg-surface/90 backdrop-blur-md border-b border-surface-border shadow-sm" : "bg-transparent"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-[11px] text-white font-bold shadow-xl shadow-primary/20 rotate-3">NN</div>
          <span className="oryzo-logo text-xl tracking-[-0.08em]">Nosso Norte</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-surface border border-surface-border flex items-center justify-center shadow-sm">
            <User className="w-4 h-4 text-secondary/40" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 md:pt-12 px-6 md:px-10 lg:px-16 w-full animate-in fade-in duration-700">
        <Outlet />
      </main>
    </div>
  );
}
