export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

export enum MessageType {
  SMS = 'SMS',
  WEB = 'WEB',
  SYSTEM = 'SYSTEM'
}

// Updated to match the 'profiles' table in Supabase
export interface User {
  id: string; // This is the UUID from auth.users
  username: string;
  role: UserRole;
  mobile: string;
  email: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
}

// Updated to match the 'messages' table in Supabase
export interface Message {
  id: string; // UUID from the database
  created_at: string;
  sender_id: string; // The sender's user ID (UUID)
  recipient_profile_id?: string; // The recipient's user ID for web messages
  recipient_address?: string; // The phone number for SMS messages
  body: string;
  type: MessageType;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'READ' | 'PENDING';
  // Optional: to display sender info easily after a join
  profiles?: { username: string };
}

export interface Lead {
  id: string;
  timestamp: string;
  name: string;
  email: string;
  mobile: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CLOSED';
}

// Updated to match the new 'contacts' table schema
export interface Contact {
  id: string;
  user_id: string; // The user who created this contact
  name: string;
  mobile: string;
  email?: string;
  notes?: string;
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  USER_CREATED = 'USER_CREATED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  MESSAGE_SENT_SMS = 'MESSAGE_SENT_SMS',
  MESSAGE_SENT_WEB = 'MESSAGE_SENT_WEB',
  POLICY_CHANGE = 'POLICY_CHANGE',
  API_KEY_ROTATED = 'API_KEY_ROTATED'
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  actor: string; // username
  ip_address: string;
  details: string;
}