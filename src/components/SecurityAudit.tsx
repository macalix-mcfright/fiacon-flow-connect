import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { SecurityEvent, SecurityEventType } from '../types';

const getIconForType = (type: SecurityEventType) => {
    switch (type) {
        case SecurityEventType.LOGIN_SUCCESS: return { icon: 'fa-shield-halved', color: 'text-emerald-500' };
        case SecurityEventType.LOGIN_FAILURE: return { icon: 'fa-triangle-exclamation', color: 'text-red-500' };
        case SecurityEventType.USER_CREATED:
        case SecurityEventType.USER_ACTIVATED:
             return { icon: 'fa-user-plus', color: 'text-blue-500' };
        case SecurityEventType.USER_SUSPENDED: return { icon: 'fa-user-slash', color: 'text-amber-500' };
        case SecurityEventType.MESSAGE_SENT_SMS:
        case SecurityEventType.MESSAGE_SENT_WEB:
             return { icon: 'fa-paper-plane', color: 'text-slate-400' };
        case SecurityEventType.POLICY_CHANGE:
        case SecurityEventType.API_KEY_ROTATED:
             return { icon: 'fa-key', color: 'text-purple-500' };
        default: return { icon: 'fa-question-circle', color: 'text-slate-500' };
    }
}

const SecurityAudit: React.FC = () => {
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            const { data, error } = await supabase
                .from('security_events')
                .select('*')
                .order('timestamp', { ascending: false });
            
            if (data) setEvents(data as SecurityEvent[]);
            if (error) console.error('Error fetching security events:', error);
            setIsLoading(false);
        };
        fetchEvents();

        // Subscribe to realtime changes
        const subscription = supabase
            .channel('security_events_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_events' }, (payload) => {
                setEvents((prev) => [payload.new as SecurityEvent, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Security Audit Log</h1>
          <p className="text-slate-400 mt-1">Monitor critical system events and analyze for threats.</p>
        </div>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {isLoading ? (
            <div className="p-12 text-center">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-purple-500 mb-4"></i>
                <p className="text-slate-400">Loading security events...</p>
            </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-5">Event Type</th>
                <th className="px-6 py-5">Actor</th>
                <th className="px-6 py-5">Source IP</th>
                <th className="px-6 py-5">Details</th>
                <th className="px-6 py-5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {events.map((e) => {
                  const eventMeta = getIconForType(e.type);
                  return (
                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                              <i className={`fa-solid ${eventMeta.icon} w-5 text-center ${eventMeta.color}`}></i>
                              <span className="font-bold text-xs text-slate-300">{e.type.replace(/_/g, ' ')}</span>
                          </div>
                      </td>
                      <td className="px-6 py-5 font-mono text-sm text-white">{e.actor}</td>
                      <td className="px-6 py-5 font-mono text-sm text-slate-400">{e.ip_address}</td>
                      <td className="px-6 py-5 text-sm text-slate-400 max-w-xs truncate">{e.details}</td>
                      <td className="px-6 py-5 text-xs text-slate-500 whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                    </tr>
                )}
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};

export default SecurityAudit;