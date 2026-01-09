import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { authService } from '../services/authService';

interface AdminPanelProps {
  currentUser: User;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', username: '', mobile: '', role: UserRole.USER });

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('profiles').select('*');
    
    if (error) {
      setError(`Failed to fetch user data: ${error.message}`);
      console.error(error);
    } else {
      setUsers(data as User[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusUpdate = async (userId: string, newStatus: User['status']) => {
    setIsUpdating(userId);

    // Check if we are approving a user for the first time.
    const isFirstTimeApproval = newStatus === 'ACTIVE' && users.find(u => u.id === userId)?.status === 'PENDING_APPROVAL';

    if (isFirstTimeApproval) {
      // If approving, call a secure RPC to confirm the email and activate the profile simultaneously.
      const { error: rpcError } = await supabase.rpc('confirm_user_and_activate', {
        user_id_to_confirm: userId
      });
      if (rpcError) {
        alert(`Failed to approve user: ${rpcError.message}. Make sure the 'confirm_user_and_activate' function is created in the Supabase SQL Editor.`);
      }
    } else {
      // For other status changes (Suspend, Re-activate from suspended), just update the profile.
      const { error: updateError } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
      if (updateError) {
        alert(`Failed to update status: ${updateError.message}`);
      }
    }
    
    // Refresh the list to show the new status.
    await fetchUsers();
    setIsUpdating(null);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setIsUpdating(userId);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      alert(`Failed to update role: ${error.message}`);
    } else {
      fetchUsers();
    }
    setIsUpdating(null);
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (window.confirm(`Are you sure you want to permanently delete user "${username}"? This action cannot be undone.`)) {
      setIsUpdating(userId);
      const result = await authService.deleteUser(userId);
      if (result.success) {
        fetchUsers();
      } else {
        alert(`Failed to delete user: ${result.error}`);
      }
      setIsUpdating(null);
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating('new');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            username: newUser.username,
            mobile: newUser.mobile,
            role: newUser.role,
            status: 'ACTIVE'
          }
        }
      });

      if (error) throw error;

      alert('User provisioned successfully!');
      setShowProvisionModal(false);
      setNewUser({ email: '', password: '', username: '', mobile: '', role: UserRole.USER });
      fetchUsers();
    } catch (err: any) {
      alert(`Failed to provision user: ${err.message}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusPill = (status: User['status']) => {
    switch (status) {
      case 'ACTIVE': return <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-xs font-bold text-emerald-500">ACTIVE</span></div>;
      case 'SUSPENDED': return <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-xs font-bold text-red-500">SUSPENDED</span></div>;
      case 'PENDING_APPROVAL': return <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span><span className="text-xs font-bold text-amber-500">PENDING</span></div>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Identity & Access</h1>
          <p className="text-slate-400 mt-1">Manage system users, roles, and security policies.</p>
        </div>
        <button onClick={() => setShowProvisionModal(true)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
          <i className="fa-solid fa-plus"></i> Provision New User
        </button>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-950/50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-5">User Identity</th>
                <th className="px-6 py-5">Role</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center p-8 text-slate-500"><i className="fa-solid fa-circle-notch fa-spin mr-2"></i>Loading users...</td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="text-center p-8 text-red-500">{error}</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-bold text-white">{u.username}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">{u.mobile || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <select 
                        value={u.role} 
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        disabled={isUpdating === u.id || u.id === currentUser.id}
                        className="bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold p-2 text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                      >
                        {Object.values(UserRole).map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-5">{getStatusPill(u.status)}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {isUpdating === u.id && <i className="fa-solid fa-circle-notch fa-spin text-slate-400"></i>}
                        {u.status === 'PENDING_APPROVAL' && (
                          <button onClick={() => handleStatusUpdate(u.id, 'ACTIVE')} disabled={isUpdating === u.id} className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50">Approve</button>
                        )}
                        {u.status === 'ACTIVE' && u.id !== currentUser.id && (
                          <button onClick={() => handleStatusUpdate(u.id, 'SUSPENDED')} disabled={isUpdating === u.id} className="px-3 py-2 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 disabled:opacity-50">Suspend</button>
                        )}
                        {u.status === 'SUSPENDED' && (
                          <button onClick={() => handleStatusUpdate(u.id, 'ACTIVE')} disabled={isUpdating === u.id} className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50">Activate</button>
                        )}
                        {u.id !== currentUser.id && (
                          <button onClick={() => handleDeleteUser(u.id, u.username)} disabled={isUpdating === u.id} className="px-3 py-2 text-xs font-bold rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision User Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-white mb-6">Provision New User</h2>
            <form onSubmit={handleProvisionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label>
                <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="jdoe" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="jdoe@company.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mobile Number</label>
                <input type="tel" value={newUser.mobile} onChange={e => setNewUser({...newUser, mobile: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0917..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Initial Password</label>
                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none">
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowProvisionModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdating === 'new'} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isUpdating === 'new' ? (
                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Creating...</>
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
