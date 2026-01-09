// FIX: Corrected import statement. Removed typo 'a,' which was causing React hooks to be undefined.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, MessageType, Message, Contact } from '../types';
import { supabase } from '../services/supabaseClient';
import { webRTCService } from '../services/webrtcService';

interface MessengerProps {
  user: User;
  initialTarget?: User | Contact | null;
  onThreadOpen?: () => void;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

// --- Sub-component: ContactList ---
const ContactList = ({ contacts, activeThread, onlineUsers, onContactSelect }) => (
  <div className="w-full lg:w-80 flex-col bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl flex">
    <div className="p-6 border-b border-slate-800 bg-slate-950/20">
      <h2 className="text-xl font-bold text-white mb-4">Contacts</h2>
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
        <input type="text" placeholder="Find user..." className="w-full bg-slate-800 border-none rounded-2xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto px-2 py-4">
      {contacts.map((contact) => (
        <button
          key={contact.id}
          onClick={() => onContactSelect(contact)}
          className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all mb-1 ${
            activeThread?.id === contact.id ? 'bg-blue-600/10 border border-blue-500/20' : 'hover:bg-slate-800/50'
          }`}
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg bg-indigo-500/10 text-indigo-400">
              {('username' in contact ? contact.username : contact.name).charAt(0).toUpperCase()}
            </div>
            {onlineUsers[contact.id] && (
               <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
            )}
          </div>
          <div className="text-left overflow-hidden flex-1">
            <p className={`font-bold text-sm truncate ${activeThread?.id === contact.id ? 'text-blue-400' : 'text-slate-200'}`}>
              {'username' in contact ? contact.username : contact.name}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{contact.role || 'External'}</p>
          </div>
        </button>
      ))}
    </div>
  </div>
);

// --- Sub-component: ChatArea ---
const ChatArea = ({
  user, activeThread, filteredMessages, onlineUsers, onBack, chatEndRef,
  callStatus, callDuration, isMuted, onInitiateCall, onEndCall, onToggleMute,
  msgType, setMsgType, body, setBody, isSending, onSend,
  localStream, remoteStream, incomingCall, onAcceptCall, onRejectCall,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  
  return (
  <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl relative">
    {activeThread ? (
      <>
        {/* Incoming Call UI */}
        {incomingCall && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                <p className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-4">Incoming Call</p>
                <div className="w-32 h-32 rounded-full flex items-center justify-center font-black text-6xl text-white shadow-2xl bg-indigo-600 shadow-indigo-500/30 mb-4">
                  {incomingCall.caller.username.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-3xl font-bold text-white">{incomingCall.caller.username}</h2>
                <div className="flex gap-6 mt-12">
                  <button onClick={onRejectCall} className="w-20 h-20 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white text-2xl transition-all">
                    <i className="fa-solid fa-phone-slash"></i>
                  </button>
                  <button onClick={onAcceptCall} className="w-20 h-20 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-2xl transition-all">
                    <i className="fa-solid fa-phone"></i>
                  </button>
                </div>
            </div>
        )}

        {/* In-Call UI */}
        {callStatus !== 'idle' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg z-40 flex flex-col items-center justify-center p-4">
              {/* Remote Video */}
              <video ref={remoteVideoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover -z-10"></video>
              
              {/* Local Video */}
              <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-32 h-48 object-cover rounded-2xl border-2 border-slate-700 shadow-2xl"></video>

              <div className="flex-1 flex flex-col justify-between items-center w-full py-8">
                <div className="text-center bg-black/30 p-4 rounded-2xl">
                    <h2 className="text-3xl font-bold text-white">{'username' in activeThread ? activeThread.username : activeThread.name}</h2>
                    <p className="text-lg font-medium text-emerald-400 mt-2 animate-pulse">
                        {callStatus === 'calling' ? 'Calling...' : formatDuration(callDuration)}
                    </p>
                </div>

                <div className="flex gap-6">
                  <button onClick={onToggleMute} className={`w-20 h-20 flex items-center justify-center rounded-full text-2xl transition-all ${isMuted ? 'bg-white text-slate-900' : 'bg-slate-800/50 text-white hover:bg-slate-700'}`}>
                    <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                  </button>
                  <button onClick={onEndCall} className="w-20 h-20 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white text-2xl transition-all animate-pulse">
                    <i className="fa-solid fa-phone-slash"></i>
                  </button>
                </div>
              </div>
          </div>
        )}

        <div className="px-4 sm:px-8 py-5 border-b border-slate-800 bg-slate-950/20 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg bg-indigo-600 shadow-indigo-500/20">
              {('username' in activeThread ? activeThread.username : activeThread.name).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-100">{'username' in activeThread ? activeThread.username : activeThread.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{onlineUsers[activeThread.id] ? 'Online' : (activeThread.role ? 'Offline' : 'External')}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onInitiateCall} 
              disabled={!('role' in activeThread)} // Can only call system users
              className="w-10 h-10 hidden sm:flex items-center justify-center rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <i className="fa-solid fa-phone text-sm"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scrollbar-hide">
          {filteredMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] group ${msg.sender_id === user.id ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-3xl p-4 sm:p-5 shadow-sm relative transition-all ${msg.sender_id === user.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                </div>
                <div className={`text-[10px] mt-2 flex items-center gap-2 ${msg.sender_id === user.id ? 'text-slate-400' : 'text-slate-500'}`}>
                  {msg.type === MessageType.SMS && <span className="font-bold uppercase bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">SMS</span>}
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.sender_id === user.id && (
                    <i className={`fa-solid fa-check-double ${msg.status === 'READ' ? 'text-blue-400' : 'text-slate-500'}`}></i>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 sm:p-6 bg-slate-950/40 border-t border-slate-800">
          <form onSubmit={onSend} className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
               <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700">
                  <button type="button" onClick={() => setMsgType(MessageType.WEB)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${msgType === MessageType.WEB ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`} disabled={!activeThread.role}>Web-to-Web</button>
                  <button type="button" onClick={() => setMsgType(MessageType.SMS)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${msgType === MessageType.SMS ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`} disabled={!activeThread.mobile}>SMS Gateway</button>
              </div>
            </div>
            <div className="flex gap-4 items-end">
              <textarea rows={1} placeholder={`Message ${'username' in activeThread ? activeThread.username : activeThread.name}...`} value={body} onChange={(e) => setBody(e.target.value)} className="flex-1 w-full bg-slate-800 border border-slate-700 rounded-3xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 resize-none min-h-[56px] text-slate-100 placeholder:text-slate-600 transition-all outline-none" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(e as any); }}} />
              <button type="submit" disabled={isSending || !body || !activeThread} className="w-14 h-14 flex items-center justify-center rounded-3xl bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95 group">
                {isSending ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>}
              </button>
            </div>
          </form>
        </div>
      </>
    ) : (
      <div className="h-full hidden lg:flex flex-col items-center justify-center text-center p-12 opacity-40">
        <i className="fa-solid fa-comments text-6xl mb-6 text-slate-700"></i>
        <p className="text-xl font-bold text-slate-400">Unified Messenger</p>
        <p className="text-sm text-slate-500 mt-2 max-w-xs">Select a contact to begin a secure conversation.</p>
      </div>
    )}
  </div>
);
};


// --- Main Messenger Component ---
const Messenger: React.FC<MessengerProps> = ({ user, initialTarget, onThreadOpen }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<(User | Contact)[]>([]);
  const [activeThread, setActiveThread] = useState<User | Contact | null>(null);
  const [body, setBody] = useState('');
  const [msgType, setMsgType] = useState<MessageType>(MessageType.WEB);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
  const [mobileView, setMobileView] = useState<'contacts' | 'chat'>('contacts');
  
  // WebRTC State
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'in-call'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalingChannelRef = useRef<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);


  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      if (!activeThread) return false;
      const isWebMessage = (msg.type === MessageType.WEB) &&
          ((msg.sender_id === user.id && msg.recipient_profile_id === activeThread.id) ||
           (msg.sender_id === activeThread.id && msg.recipient_profile_id === user.id));
      const isSmsOutbound = (msg.type === MessageType.SMS) &&
          (msg.sender_id === user.id && msg.recipient_address === activeThread.mobile);
      return isWebMessage || isSmsOutbound;
    });
  }, [messages, activeThread, user.id]);

  useEffect(() => {
    const fetchContacts = async () => {
      const { data: users, error: userError } = await supabase.from('profiles').select('*').eq('status', 'ACTIVE').neq('id', user.id);
      if (userError) console.error('Error fetching users:', userError);

      const { data: externalContacts, error: contactError } = await supabase.from('contacts').select('*').eq('user_id', user.id);
      if (contactError) console.error('Error fetching contacts:', contactError);

      const combinedContacts = [...(users || []), ...(externalContacts || [])];
      setContacts(combinedContacts);
      
      if (initialTarget) {
        const target = combinedContacts.find(c => c.id === initialTarget.id);
        if (target) {
            setActiveThread(target);
            if (onThreadOpen) onThreadOpen();
        }
      } else if (users && users.length > 0 && window.innerWidth >= 1024) {
        setActiveThread(users[0] as User);
      }
    };
    fetchContacts();
  }, [user.id, initialTarget]);

  useEffect(() => {
    if(activeThread) setMobileView('chat');
    else setMobileView('contacts');
  }, [activeThread]);

  useEffect(() => {
    if (activeThread) {
      setMsgType(activeThread.hasOwnProperty('role') ? MessageType.WEB : MessageType.SMS);
    }
  }, [activeThread]);

  // Main Realtime Subscription Effect
  useEffect(() => {
    // Message Channel
    const messageChannel = supabase.channel(`realtime-messages:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(current => [...current, payload.new as Message]);
      })
      .subscribe();
      
    // Presence Channel
    const presenceChannel = supabase.channel('messenger-presence', { config: { presence: { key: user.id } } });
    presenceChannel.on('presence', { event: 'sync' }, () => setOnlineUsers(presenceChannel.presenceState()));
    presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ online_at: new Date().toISOString() });
    });

    // Signaling Channel for WebRTC
    const signalingChannel = supabase.channel(`webrtc-signaling:${user.id}`);
    signalingChannel
      .on('broadcast', { event: 'call-offer' }, async ({ payload }) => {
        setIncomingCall(payload);
        setActiveThread(payload.caller); // Switch view to the caller
      })
      .on('broadcast', { event: 'call-answer' }, ({ payload }) => {
        webRTCService.handleAnswer(payload.answer);
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        webRTCService.handleNewICECandidate(payload.candidate);
      })
      .on('broadcast', { event: 'call-end' }, () => handleEndCall(false)) // Don't broadcast on end
      .subscribe();
    signalingChannelRef.current = signalingChannel;

    return () => { 
        supabase.removeChannel(messageChannel); 
        supabase.removeChannel(presenceChannel);
        supabase.removeChannel(signalingChannel);
        webRTCService.close();
    };
  }, [user.id]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !body) return;
    setIsSending(true);
    const isWeb = msgType === MessageType.WEB && activeThread.hasOwnProperty('role');
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_profile_id: isWeb ? activeThread.id : null,
      recipient_address: msgType === MessageType.SMS ? activeThread.mobile : null,
      body, type: msgType, status: 'SENT'
    });
    if (error) console.error('Error sending message:', error);
    else setBody('');
    setIsSending(false);
  };

  // --- WebRTC Call Handlers ---
  const handleInitiateCall = async () => {
    if (!activeThread || !('role' in activeThread)) return;
    setCallStatus('calling');
    const stream = await webRTCService.startLocalStream();
    setLocalStream(stream);

    webRTCService.onRemoteStream = (remoteStream) => {
      setRemoteStream(remoteStream);
      setCallStatus('in-call');
      callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    };
    
    const offer = await webRTCService.createOffer();
    signalingChannelRef.current.send({
        type: 'broadcast', event: 'call-offer',
        payload: { offer, caller: user, recipientId: activeThread.id }
    });
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    const stream = await webRTCService.startLocalStream();
    setLocalStream(stream);
    
    webRTCService.onRemoteStream = (remoteStream) => {
        setRemoteStream(remoteStream);
        setCallStatus('in-call');
        callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    };

    const answer = await webRTCService.createAnswer(incomingCall.offer);
    signalingChannelRef.current.send({
      type: 'broadcast', event: 'call-answer',
      payload: { answer, recipientId: incomingCall.caller.id }
    });
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    // Optionally send a 'call-rejected' signal
    setIncomingCall(null);
  };

  const handleEndCall = (broadcast = true) => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (broadcast && activeThread) {
        signalingChannelRef.current.send({
            type: 'broadcast', event: 'call-end',
            payload: { recipientId: activeThread.id }
        });
    }
    webRTCService.close();
    setCallStatus('idle');
    setCallDuration(0);
    setLocalStream(null);
    setRemoteStream(null);
  };
  
  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    webRTCService.toggleMute(newMutedState);
    setIsMuted(newMutedState);
  };

  // FIX: Grouped props for ChatArea to resolve shorthand property errors where handlers were not in scope.
  const chatAreaProps = {
    user,
    activeThread,
    filteredMessages,
    onlineUsers,
    onBack: () => setActiveThread(null),
    chatEndRef,
    callStatus,
    callDuration,
    isMuted,
    onInitiateCall: handleInitiateCall,
    onEndCall: handleEndCall,
    onToggleMute: handleToggleMute,
    msgType,
    setMsgType,
    body,
    setBody,
    isSending,
    onSend: handleSend,
    localStream,
    remoteStream,
    incomingCall,
    onAcceptCall: handleAcceptCall,
    onRejectCall: handleRejectCall,
  };


  return (
    <div className="flex h-full md:h-[calc(100vh-140px)] gap-6 overflow-hidden animate-in slide-in-from-bottom-2 duration-500">
      <div className="hidden lg:flex w-80">
        <ContactList contacts={contacts} activeThread={activeThread} onlineUsers={onlineUsers} onContactSelect={setActiveThread} />
      </div>
      <div className="hidden lg:flex flex-1">
        <ChatArea {...chatAreaProps} />
      </div>

      {/* Mobile/Tablet View */}
      <div className="flex lg:hidden w-full h-full">
        {mobileView === 'contacts' && !incomingCall ? (
          <ContactList contacts={contacts} activeThread={activeThread} onlineUsers={onlineUsers} onContactSelect={setActiveThread} />
        ) : (
          <ChatArea {...chatAreaProps} />
        )}
      </div>
    </div>
  );
};

export default Messenger;
