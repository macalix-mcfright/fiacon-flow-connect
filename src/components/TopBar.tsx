
import React from 'react';
import { User } from '../types';

interface TopBarProps {
  user: User;
  onLogout: () => void;
  toggleSidebar: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ user, onLogout, toggleSidebar }) => {
  return (
    <header className="h-20 bg-slate-950/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
        >
          <i className="fa-solid fa-bars-staggered"></i>
        </button>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
          <i className="fa-solid fa-magnifying-glass text-slate-500 text-sm"></i>
          <input 
            type="text" 
            placeholder="Search gateway data..." 
            className="bg-transparent border-none text-xs text-slate-300 w-48 focus:ring-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-right">
            <p className="text-xs font-bold text-white leading-none">{user.username}</p>
            <p className="text-[10px] text-blue-500 font-medium mt-1 uppercase tracking-wider">{user.role}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <i className="fa-solid fa-user-tie"></i>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center"
          title="Logout"
        >
          <i className="fa-solid fa-power-off"></i>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
