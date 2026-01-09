
import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [stats, setStats] = useState([
    { label: 'Messages Sent', value: '-', trend: '...', icon: 'fa-paper-plane', color: 'blue' },
    { label: 'Active Leads', value: '-', trend: '...', icon: 'fa-user-tag', color: 'emerald' },
    { label: 'Security Events', value: '-', trend: '24h', icon: 'fa-shield-halved', color: 'amber' },
    { label: 'Total Contacts', value: '-', trend: '...', icon: 'fa-address-book', color: 'purple' },
  ]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const chartData = [
    { name: 'Mon', sent: 120, recv: 40 },
    { name: 'Tue', sent: 210, recv: 70 },
    { name: 'Wed', sent: 180, recv: 110 },
    { name: 'Thu', sent: 240, recv: 90 },
    { name: 'Fri', sent: 320, recv: 150 },
    { name: 'Sat', sent: 150, recv: 60 },
    { name: 'Sun', sent: 90, recv: 30 },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 1. Fetch Counts
      const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender_id', user.id);
      const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).neq('status', 'CLOSED');
      const { count: contactCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { count: eventCount } = await supabase.from('security_events').select('*', { count: 'exact', head: true }).gte('timestamp', yesterday.toISOString());

      setStats([
        { label: 'Messages Sent', value: msgCount?.toLocaleString() || '0', trend: 'Total', icon: 'fa-paper-plane', color: 'blue' },
        { label: 'Active Leads', value: leadCount?.toLocaleString() || '0', trend: 'Open', icon: 'fa-user-tag', color: 'emerald' },
        { label: 'Security Events', value: eventCount?.toLocaleString() || '0', trend: 'Last 24h', icon: 'fa-shield-halved', color: 'amber' },
        { label: 'Total Contacts', value: contactCount?.toLocaleString() || '0', trend: 'Saved', icon: 'fa-address-book', color: 'purple' },
      ]);

      // 2. Fetch Recent Events
      const { data: events } = await supabase.from('security_events').select('*').order('timestamp', { ascending: false }).limit(5);
      if (events) {
        setRecentEvents(events.map(e => ({
          type: e.type.replace(/_/g, ' '),
          desc: e.details,
          time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          icon: 'fa-bell'
        })));
      }
    };
    fetchDashboardData();
  }, [user.id]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-white">System Overview</h1>
        <p className="text-slate-400 mt-1">Welcome back, {user.username}. Monitoring gateway status.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg hover:border-slate-700 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-${s.color}-500/10 flex items-center justify-center text-${s.color}-500 text-xl group-hover:scale-110 transition-transform`}>
                <i className={`fa-solid ${s.icon}`}></i>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                {s.trend}
              </span>
            </div>
            <p className="text-slate-400 text-sm font-medium">{s.label}</p>
            <p className="text-3xl font-bold text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg text-white">Transmission Activity</h3>
            <select className="bg-slate-800 text-xs border border-slate-700 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-blue-500">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis stroke="#64748b" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="sent" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSent)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl overflow-hidden flex flex-col">
          <h3 className="font-bold text-lg text-white mb-6">Security Events</h3>
          <div className="space-y-4 overflow-y-auto pr-2">
            {recentEvents.length > 0 ? recentEvents.map((ev, i) => (
              <div key={i} className="flex gap-4 p-3 rounded-2xl hover:bg-slate-800 transition-colors cursor-default">
                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                  ev.type.includes('FAILURE') ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                }`}>
                  <i className={`fa-solid ${ev.icon}`}></i>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-100 uppercase">{ev.type}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{ev.desc}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{ev.time}</p>
                </div>
              </div>
            )) : (
              <p className="text-slate-500 text-sm text-center py-4">No recent events found.</p>
            )}
          </div>
          <button className="mt-auto pt-6 text-sm font-bold text-blue-500 hover:text-blue-400 text-center">View Audit Logs</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;