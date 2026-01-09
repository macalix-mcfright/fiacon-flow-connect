
import React, { useState, useEffect } from 'react';
import { Lead, User } from '../types';
import { supabase } from '../services/supabaseClient';

const LeadsManager: React.FC<{ user: User }> = ({ user }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase.from('leads').select('*').order('timestamp', { ascending: false });
      if (error) console.error('Error fetching leads:', error);
      else setLeads(data as Lead[]);
      setIsLoading(false);
    };
    fetchLeads();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500/10 text-blue-500';
      case 'QUALIFIED': return 'bg-emerald-500/10 text-emerald-500';
      case 'CONTACTED': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  const handleStatusCycle = async (lead: Lead) => {
    const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED'];
    const currentIndex = statuses.indexOf(lead.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    const { error } = await supabase.from('leads').update({ status: nextStatus }).eq('id', lead.id);
    if (!error) {
        setLeads(leads.map(l => l.id === lead.id ? { ...l, status: nextStatus } : l));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-white">Lead Pipeline</h1>
        <p className="text-slate-400">Convert incoming messages into enterprise opportunities.</p>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Lead Source</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Stage</th>
                <th className="px-6 py-4">Captured</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center p-8 text-slate-500"><i className="fa-solid fa-circle-notch fa-spin mr-2"></i>Loading leads...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-slate-500">No leads found.</td></tr>
              ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-200">{lead.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">ID: {lead.id}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-slate-300">{lead.email}</p>
                    <p className="text-xs text-slate-500">{lead.mobile}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs text-slate-400">{new Date(lead.timestamp).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => handleStatusCycle(lead)} className="text-blue-500 hover:text-blue-400 font-bold text-xs uppercase tracking-widest">
                      {lead.status === 'CLOSED' ? 'Reopen' : 'Advance Stage'}
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeadsManager;
