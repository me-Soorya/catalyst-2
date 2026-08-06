import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sun, Moon, Sunrise, Sunset, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function WelcomeBanner() {
  const { user, isAuthenticated, login } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine greeting and icon based on current hour
  const hour = currentTime.getHours();
  let greeting = 'Good Morning';
  let GreetingIcon = Sunrise;
  let greetingColor = 'text-amber-400';

  if (hour >= 12 && hour < 17) {
    greeting = 'Good Afternoon';
    GreetingIcon = Sun;
    greetingColor = 'text-amber-300';
  } else if (hour >= 17 && hour < 22) {
    greeting = 'Good Evening';
    GreetingIcon = Sunset;
    greetingColor = 'text-rose-400';
  } else if (hour >= 22 || hour < 5) {
    greeting = 'Good Night';
    GreetingIcon = Moon;
    greetingColor = 'text-indigo-400';
  }

  // Format date and time
  const dayName = format(currentTime, 'EEEE'); // e.g. Wednesday
  const formattedDate = format(currentTime, 'MMMM d, yyyy'); // e.g. July 29, 2026
  const timeString = format(currentTime, 'hh:mm:ss a'); // e.g. 06:38:25 PM

  // Get user display name
  const displayName = isAuthenticated && user?.name ? user.name : 'Student';

  // Get timezone string
  const timezoneStr = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900/90 via-teal-950/40 to-slate-950/90 border border-teal-500/20 shadow-2xl shadow-teal-950/40 mb-8">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Watermark Logo */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-25 pointer-events-none hidden lg:block">
        <img src="/logo.png" alt="Catalyst Watermark" className="w-52 h-52 object-contain" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">

        {/* Left Side: Welcoming Message & Greeting */}
        <div className="max-w-xl">
          {/* Greeting Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-bold uppercase tracking-wider mb-3">
            <GreetingIcon className={`w-3.5 h-3.5 ${greetingColor}`} />
            <span className="text-teal-300">{greeting}</span>
          </div>

          {/* Main Welcome Heading */}
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-slate-100 tracking-tight leading-tight mb-3">
            Welcome,{' '}
            <span className="bg-gradient-to-r from-teal-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {displayName}
            </span>
          </h1>

          {/* Connected User / Account Pill */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-xs text-slate-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="font-medium">Google Account Connected</span>
              </div>
            ) : (
              <button
                onClick={() => login()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300 font-medium transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Account Not Connected — Click to Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Live Clock & Today's Details Card */}
        <div className="glass-panel p-5 rounded-2xl border border-teal-500/20 bg-slate-900/80 backdrop-blur-md shadow-xl flex flex-col justify-between min-w-[260px] sm:min-w-[300px]">

          {/* Header of card: Day */}
          <div className="flex items-center justify-between border-b border-teal-900/30 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span className="font-display font-bold text-sm text-teal-300 uppercase tracking-wider">
                {dayName}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60">
              {timezoneStr}
            </span>
          </div>

          {/* Live Clock Display */}
          <div className="my-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Live Clock</span>
            </div>
            <div className="font-mono font-bold text-2xl sm:text-3xl text-slate-100 tracking-wider bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
              {timeString}
            </div>
          </div>

          {/* Today's Full Date */}
          <div className="mt-3 pt-3 border-t border-teal-900/30 flex items-center justify-between text-xs text-slate-300">
            <span className="text-slate-400 font-bold">Date</span>
            <span className="font-semibold text-slate-200">{formattedDate}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
