import React from 'react';
import { Plus, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onOpenCreateModal }) {
  const { isAuthenticated, user, login, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-teal-900/30 bg-[#070d19]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-700 p-0.5 shadow-lg shadow-cyan-500/25 flex items-center justify-center group hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#070d19] rounded-[14px] flex items-center justify-center overflow-hidden p-1">
              <img src="/logo.png" alt="Catalyst Logo" className="w-full h-full object-contain filter drop-shadow" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl bg-gradient-to-r from-white via-teal-100 to-cyan-300 bg-clip-text text-transparent">
                Catalyst
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Phase 1
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">AI-First Google Calendar Study Planner</p>
          </div>
        </div>

        {/* Right Actions & Auth Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Google Auth Button & Status */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-teal-500/20 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
                </span>
                <span className="font-medium text-slate-200 hidden md:inline truncate max-w-[120px]">
                  {user?.name || 'Connected'}
                </span>
                <button
                  onClick={logout}
                  title="Disconnect Google Account"
                  className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                Account is not connected
              </span>
              <button
                onClick={() => login()}
                className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-teal-500/30 hover:border-teal-400/60 hover:bg-slate-850 text-slate-100 text-xs sm:text-sm font-semibold transition-all shadow-md group"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Connect Google Calendar</span>
              </button>
            </div>
          )}

          {/* New Event CTA Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Add Study Event</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
    </header>
  );
}

