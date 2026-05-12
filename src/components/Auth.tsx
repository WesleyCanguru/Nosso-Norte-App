import React, { useState } from 'react';
import { Button } from './Button';
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Auth = ({ onLogin }: { onLogin: (user: { name: string }) => void }) => {
  const [key, setKey] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const accessKey = key.trim();
    
    if (accessKey === 'Wesley123') {
      const user = { name: 'Wesley' };
      localStorage.setItem('w12_user', JSON.stringify(user));
      onLogin(user);
    } else if (accessKey === 'Sarah123') {
      const user = { name: 'Sarah' };
      localStorage.setItem('w12_user', JSON.stringify(user));
      onLogin(user);
    } else {
      alert('Chave de acesso inválida!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden px-6">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />

      <div 
        className={cn(
          "w-full max-w-md relative z-10 transition-all duration-1000",
          isHovered ? "scale-[1.01]" : "scale-100"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="bg-surface border border-surface-border p-8 md:p-16 rounded-[3rem] md:rounded-[4rem] shadow-3d relative overflow-hidden">
          {/* Subtle logo bg */}
          <div className="absolute -right-20 -top-20 opacity-[0.02] rotate-12 pointer-events-none">
            <KeyRound className="w-96 h-96" />
          </div>

          <div className="flex justify-center mb-8 md:mb-12">
            <div className="relative group">
              <div className="absolute -inset-4 bg-primary/10 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/5 border border-primary/10 rounded-2xl md:rounded-3xl flex items-center justify-center text-primary relative z-10 shadow-sm rotate-3 group-hover:rotate-0 transition-transform duration-700">
                <KeyRound className="w-8 h-8 md:w-10 md:h-10" />
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-4 mb-10 md:mb-14">
            <h1 className="oryzo-logo text-3xl md:text-4xl tracking-[-0.08em] leading-none">Nosso Norte</h1>
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <span className="h-[1px] w-6 md:w-8 bg-surface-border" />
              <p className="text-[8px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] md:tracking-[0.4em] opacity-60 px-2 leading-relaxed">
                Um ciclo por vez,<br className="inline md:hidden" /> rumo ao nosso norte.
              </p>
              <span className="h-[1px] w-6 md:w-8 bg-surface-border" />
            </div>
          </div>
          
          <form onSubmit={handleAccess} className="space-y-8 md:space-y-10">
            <div className="space-y-4">
              <label className="block text-[8px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.4em] text-center mb-2 md:mb-4">
                Chave de Acesso / 0&bull;0
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-background border border-surface-border rounded-2xl md:rounded-3xl px-6 md:px-8 py-5 md:py-8 outline-none focus:border-primary focus:shadow-2xl focus:shadow-primary/5 transition-all text-center text-2xl md:text-3xl tracking-[0.4em] font-mono placeholder:text-surface-border/50"
                  placeholder="••••"
                  required
                />
                <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 opacity-20">
                  <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-secondary text-white h-16 md:h-20 rounded-[1.5rem] md:rounded-3xl text-[10px] md:text-[11px] font-bold uppercase tracking-[0.3em] shadow-2xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
            >
              <LogIn className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              Consolidar Entrada
            </Button>
          </form>
          
          <div className="mt-10 md:mt-14 pt-6 md:pt-8 border-t border-surface-border/50 flex items-center justify-center gap-3 md:gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-accent/30" />
            <p className="text-[8px] font-bold text-text-muted uppercase tracking-[0.3em] md:tracking-[0.5em] opacity-40 italic text-center">Acesso Privado &bull; Criptografado</p>
            <div className="w-1.5 h-1.5 rounded-full bg-accent/30" />
          </div>
        </div>

        {/* Brand footer */}
        <div className="mt-8 text-center">
          <span className="text-[8px] font-bold text-text-muted uppercase tracking-[0.4em] opacity-30">Nosso Norte OS / Build v1.02</span>
        </div>
      </div>
    </div>
  );
};
