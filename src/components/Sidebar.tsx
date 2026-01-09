import React from 'react';
import { User, UserRole } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, activeTab, setActiveTab, user }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'messenger', label: 'Unified Messenger', icon: 'fa-comments' },
    { id: 'contacts', label: 'Contacts Book', icon: 'fa-address-book' },
    { id: 'leads', label: 'Lead Management', icon: 'fa-user-tag' },
  ];

  if (user.role === UserRole.SUPERADMIN) {
    menuItems.push(
      { id: 'admin', label: 'Admin Panel', icon: 'fa-shield-halved' },
      { id: 'security', label: 'Security Audit', icon: 'fa-user-secret' }
    );
  }
  
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <aside className={`
      fixed md:relative inset-y-0 left-0 z-30
      w-64 flex flex-col bg-slate-950 border-r border-slate-800
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}
    `}>
      <div className={`p-6 flex items-center gap-3 overflow-hidden ${!isOpen && 'md:justify-center md:px-0'}`}>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
          <i className="fa-solid fa-layer-group text-white text-xl"></i>
        </div>
        <div className={`${!isOpen && 'md:hidden'}`}>
          <h1 className="text-xl font-bold tracking-tight text-white whitespace-nowrap">Fiacon Flow</h1>
        </div>
      </div>

      <nav className="flex-1 mt-4 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${!isOpen && 'md:justify-center'} ${
              activeTab === item.id 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-6 text-center text-lg`}></i>
            <span className={`font-medium whitespace-nowrap ${!isOpen && 'md:hidden'}`}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className={`p-4 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden ${!isOpen && 'md:hidden'}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">System Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-emerald-400">Gateway Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;