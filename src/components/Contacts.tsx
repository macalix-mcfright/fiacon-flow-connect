import React, { useState, useEffect, useMemo } from 'react';
import { User, Contact } from '../types';
import { supabase } from '../services/supabaseClient';

// Combined type for unified list
// FIX: Changed to a discriminated union to allow for type-safe access to properties.
type UnifiedContact = (User & { isSystemUser: true }) | (Contact & { isSystemUser: false });

const ContactModal = ({ isOpen, onClose, onSave, contact, userId }) => {
  if (!isOpen) return null;

  const [name, setName] = useState(contact?.name || '');
  const [mobile, setMobile] = useState(contact?.mobile || '');
  const [email, setEmail] = useState(contact?.email || '');
  const [notes, setNotes] = useState(contact?.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !mobile) {
      setError('Name and Mobile are required.');
      return;
    }
    setError('');
    onSave({
      id: contact?.id,
      user_id: userId,
      name,
      mobile,
      email,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-800 p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white">{contact ? 'Edit Contact' : 'Create New Contact'}</h2>
        {error && <p className="text-sm text-red-500 bg-red-500/10 p-3 rounded-xl">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm" required />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400">Mobile</label>
            <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm" required />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400">Email (Optional)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400">Notes (Optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm" rows={3}></textarea>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-sm">Cancel</button>
            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm">{contact ? 'Save Changes' : 'Create Contact'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


const Contacts: React.FC<{ user: User; onStartMessage: (contact: User | Contact) => void; }> = ({ user, onStartMessage }) => {
  const [unifiedContacts, setUnifiedContacts] = useState<UnifiedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const fetchContacts = async () => {
    setIsLoading(true);
    // Fetch system users
    const { data: users, error: userError } = await supabase.from('profiles').select('*').eq('status', 'ACTIVE').neq('id', user.id);
    // Fetch external contacts
    const { data: externalContacts, error: contactError } = await supabase.from('contacts').select('*').eq('user_id', user.id);
    
    if (userError || contactError) {
      console.error('Error fetching contacts:', userError || contactError);
    } else {
      const systemUsersFormatted: UnifiedContact[] = (users || []).map(u => ({ ...u, isSystemUser: true }));
      const externalContactsFormatted: UnifiedContact[] = (externalContacts || []).map(c => ({ ...c, isSystemUser: false }));
      // FIX: Use discriminated union to safely access username or name for sorting.
      // By using intermediate variables, we help TypeScript correctly narrow the types within the sort callback.
      // FIX: Use `in` operator guard, as `isSystemUser` check is failing to narrow the type.
      const allContacts = [...systemUsersFormatted, ...externalContactsFormatted].sort((a, b) => {
        const nameA = 'username' in a ? a.username : a.name;
        const nameB = 'username' in b ? b.username : b.name;
        return nameA.localeCompare(nameB);
      });
      setUnifiedContacts(allContacts);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, [user.id]);
  
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return unifiedContacts;
    const lowercasedFilter = searchTerm.toLowerCase();
    // FIX: Use discriminated union to safely access username or name for filtering.
    // An intermediate variable helps TypeScript correctly infer the type in complex expressions.
    // FIX: Use `in` operator guard, as `isSystemUser` check is failing to narrow the type.
    return unifiedContacts.filter(contact => {
      const nameToFilter = 'username' in contact ? contact.username : contact.name;
      return (nameToFilter.toLowerCase().includes(lowercasedFilter)) ||
        (contact.mobile?.toLowerCase().includes(lowercasedFilter)) ||
        (contact.email?.toLowerCase().includes(lowercasedFilter));
    });
  }, [searchTerm, unifiedContacts]);

  const handleSaveContact = async (contactData: Contact) => {
    if (contactData.id) { // Update existing contact
      const { error } = await supabase.from('contacts').update(contactData).eq('id', contactData.id);
      if (error) alert('Error updating contact: ' + error.message);
    } else { // Create new contact
      const { error } = await supabase.from('contacts').insert(contactData);
      if (error) alert('Error creating contact: ' + error.message);
    }
    setIsModalOpen(false);
    setEditingContact(null);
    fetchContacts(); // Refresh list
  };
  
  const handleDeleteContact = async (contactId: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId);
      if (error) alert('Error deleting contact: ' + error.message);
      fetchContacts();
    }
    setActiveMenu(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ContactModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingContact(null); }}
        onSave={handleSaveContact}
        contact={editingContact}
        userId={user.id}
      />
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Contacts Book</h1>
          <p className="text-slate-400">Manage your unified communication list.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                <input 
                    type="text" 
                    placeholder="Search contacts..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <button onClick={() => { setEditingContact(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
            <i className="fa-solid fa-plus text-sm"></i> <span className="hidden sm:inline">New Contact</span>
            </button>
        </div>
      </header>
      
      {isLoading ? <div className="text-center p-8 text-slate-500"><i className="fa-solid fa-circle-notch fa-spin mr-2"></i>Loading contacts...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
            <div key={contact.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {/* FIX: Use `in` operator guard, as `isSystemUser` check is failing to narrow the type. */}
                    <i className={`fa-solid ${'username' in contact ? 'fa-user-shield' : 'fa-user'}`}></i>
                </div>
                <div>
                    {/* FIX: Use discriminated union to safely access username or name for display. */}
                    {/* FIX: Use `in` operator guard, as `isSystemUser` check is failing to narrow the type. */}
                    <h3 className="font-bold text-white">{'username' in contact ? contact.username : contact.name}</h3>
                    <p className={`text-xs ${'username' in contact ? 'text-blue-400' : 'text-slate-500'}`}>{'username' in contact ? 'System User' : 'External Contact'}</p>
                </div>
                </div>
                
                <div className="space-y-2 mb-6 min-h-[60px]">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <i className="fa-solid fa-phone w-4 text-center text-xs"></i>
                    <span>{contact.mobile}</span>
                </div>
                {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                    <i className="fa-solid fa-at w-4 text-center text-xs"></i>
                    <span className="truncate">{contact.email}</span>
                    </div>
                )}
                </div>

                <div className="flex gap-2">
                <button onClick={() => onStartMessage(contact)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold transition-colors">
                    Message
                </button>
                <div className="relative">
                    <button onClick={() => setActiveMenu(activeMenu === contact.id ? null : contact.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
                    <i className="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    {activeMenu === contact.id && (
                    <div className="absolute bottom-12 right-0 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-lg z-10 p-2 animate-in fade-in zoom-in-95">
                        {/* FIX: Use `in` operator guard, as `isSystemUser` check is failing to narrow the type. */}
                        {!('username' in contact) ? (
                        <>
                            <button onClick={() => { setEditingContact(contact as Contact); setIsModalOpen(true); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-700">Edit</button>
                            <button onClick={() => handleDeleteContact(contact.id)} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-700 text-red-500">Delete</button>
                        </>
                        ) : (
                        <p className="px-3 py-2 text-xs text-slate-500">System users are managed in the Admin Panel.</p>
                        )}
                    </div>
                    )}
                </div>
                </div>
            </div>
            ))}
        </div>
      )}
      {!isLoading && filteredContacts.length === 0 && (
          <div className="text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <i className="fa-solid fa-address-book text-4xl text-slate-700 mb-4"></i>
              <h3 className="font-bold text-lg text-slate-300">{searchTerm ? 'No Contacts Found' : 'Your Contacts Book is Empty'}</h3>
              <p className="text-sm text-slate-500 mt-1">{searchTerm ? `Your search for "${searchTerm}" did not return any results.` : 'Add a new contact to get started.'}</p>
          </div>
      )}
    </div>
  );
};

export default Contacts;