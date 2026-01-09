import React, { useState, useEffect } from 'react';
import { User, UserRole, Contact } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Messenger from './components/Messenger';
import Contacts from './components/Contacts';
import LeadsManager from './components/LeadsManager';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import TopBar from './components/TopBar';
import SecurityAudit from './components/SecurityAudit';
import { supabase } from './services/supabaseClient';
import { authService } from './services/authService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messengerTarget, setMessengerTarget] = useState<User | Contact | null>(null);


  useEffect(() => {
    // On initial load, open sidebar on desktop
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Race condition to prevent infinite loading if session fetch hangs
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000));

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        if (session?.user && mounted) {
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // Also race the profile fetch to prevent hanging
          const { data: profile } = await Promise.race([profilePromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Profile timeout')), 5000))]) as any;

          if (profile && mounted) setCurrentUser(profile as User);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user && mounted) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (mounted) setCurrentUser(profile as User);
        } else if (event === 'SIGNED_OUT' && mounted) {
          setCurrentUser(null);
        }
      }
    );
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };
  
  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Enforce Single Session: Log out if signed in elsewhere
  useEffect(() => {
    if (!currentUser) return;

    // Generate a unique ID for this specific browser tab/window
    const currentSessionId = self.crypto.randomUUID();

    const enforceSession = async () => {
      // 1. Claim this session in the database
      await supabase.from('profiles').update({ session_id: currentSessionId } as any).eq('id', currentUser.id);

      // 2. Listen for changes to the profile's session_id
      const channel = supabase
        .channel(`session_guard_${currentUser.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}` },
          (payload) => {
            const newSessionId = payload.new.session_id;
            // If the DB session ID changes and doesn't match ours, another device logged in
            if (newSessionId && newSessionId !== currentSessionId) {
              alert('Security Alert: You have been logged in on another device. This session will now close.');
              handleLogout();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    enforceSession();
  }, [currentUser]);

  const handleStartMessage = (contact: User | Contact) => {
    setMessengerTarget(contact);
    setActiveTab('messenger');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-blue-400 font-medium">Initializing Secure Gateway...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
        ></div>
      )}

      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={currentUser}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar 
          user={currentUser} 
          onLogout={handleLogout} 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900/50">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard user={currentUser} />}
            {activeTab === 'messenger' && <Messenger user={currentUser} initialTarget={messengerTarget} onThreadOpen={() => setMessengerTarget(null)} />}
            {activeTab === 'contacts' && <Contacts user={currentUser} onStartMessage={handleStartMessage} />}
            {activeTab === 'leads' && <LeadsManager user={currentUser} />}
            {activeTab === 'admin' && currentUser.role === UserRole.SUPERADMIN && <AdminPanel currentUser={currentUser} />}
            {activeTab === 'security' && currentUser.role === UserRole.SUPERADMIN && <SecurityAudit />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;