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
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) setCurrentUser(profile as User);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setCurrentUser(profile as User);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      }
    );
    return () => {
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