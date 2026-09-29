import React, { useState } from 'react';
import { Lock, Mail, Key, ShieldCheck, AlertCircle, X, Sparkles, Database, UserPlus, Building, CheckCircle2 } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { isSupabaseConfigured } from '../../lib/supabase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const localLogin = useAdminStore((state) => state.login);
  const supabaseLogin = useSupabaseAuthStore((state) => state.loginWithPassword);
  const supabaseSignUp = useSupabaseAuthStore((state) => state.signUpWithTenant);
  const isCloudConfigured = isSupabaseConfigured();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (isCloudConfigured) {
      if (mode === 'signup') {
        const res = await supabaseSignUp(email, password, fullName, tenantName);
        setIsLoading(false);
        if (res.success) {
          onSuccess();
        } else {
          setErrorMsg(res.error || 'Error al registrar nuevo proveedor.');
        }
      } else {
        const res = await supabaseLogin(email, password);
        setIsLoading(false);
        if (res.success) {
          onSuccess();
        } else {
          // Intentar fallback local si no coincide en nube
          const localRes = localLogin(email, password);
          if (localRes.success) {
            onSuccess();
          } else {
            setErrorMsg(res.error || 'Credenciales inválidas en Supabase y local.');
          }
        }
      }
    } else {
      // Modo Local / Demo
      setTimeout(() => {
        const result = localLogin(email, password);
        setIsLoading(false);
        if (result.success) {
          onSuccess();
        } else {
          setErrorMsg(result.error || 'Credenciales inválidas');
        }
      }, 200);
    }
  };

  const handleFillDemo = () => {
    setEmail('marcelo@robfu.cl');
    setPassword('Robfu2026@');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950 border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-500/10 overflow-hidden text-slate-200">
        {/* Glow Header */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/15 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                {mode === 'login' ? 'Acceso Backoffice' : 'Nuevo Proveedor'}
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded">
                  Multi-tenant
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isCloudConfigured ? 'Conectado a PostgreSQL (Supabase)' : 'Modo local activo (listo para conectar Supabase)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Database Status Indicator */}
        <div className="px-6 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <Database size={13} className={isCloudConfigured ? 'text-emerald-400' : 'text-amber-400'} />
            <span className="text-slate-400">Base de datos:</span>
            <span className="font-semibold text-slate-200">{isCloudConfigured ? 'Supabase Cloud RLS' : 'Local Storage / Mock'}</span>
          </div>
          {isCloudConfigured && (
            <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
              <CheckCircle2 size={11} /> Online
            </span>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 relative z-10">
          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Marcelo Torres"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nombre de tu Empresa / Proveedor
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Maderas & Tableros Express SpA"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marcelo@robfu.cl"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-200"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {/* Demo Helper */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              <span className="text-zinc-500">Credenciales Admin Maestro:</span> <span className="text-orange-400/90 font-mono">marcelo@robfu.cl</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles size={12} /> Auto-llenar
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Procesando...</span>
            ) : mode === 'login' ? (
              <>
                <ShieldCheck size={16} />
                Ingresar al Backoffice
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Registrar Proveedor
              </>
            )}
          </button>

          {isCloudConfigured && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setErrorMsg('');
                }}
                className="text-xs text-slate-400 hover:text-orange-400 transition-colors"
              >
                {mode === 'login' ? '¿Nuevo proveedor? Registra tu empresa aquí' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
