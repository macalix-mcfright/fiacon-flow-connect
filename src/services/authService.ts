import { User } from '../types';
import { supabase } from './supabaseClient';

export const authService = {
  /**
   * Registers a new user. The database trigger will automatically create a
   * corresponding profile with a 'PENDING_APPROVAL' status.
   */
  async signUp(email: string, password: string, username: string, mobile: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          mobile: mobile,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    
    // Supabase sends a confirmation email by default.
    // The user's status will be PENDING_APPROVAL regardless.
    if (data.user) {
      return { success: true };
    }

    return { success: false, error: 'An unknown error occurred during registration.' };
  },

  /**
   * Step 1: Sign in the user with email and password using Supabase Auth.
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase Sign In Error:', error.message);
      return { success: false, error: error.message };
    }

    // The onAuthStateChange listener in App.tsx will handle fetching the profile
    // and setting the user state, including all security checks.
    return { success: true };
  },

  /**
   * Sends a password reset link to the user's email.
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // Optional: redirect back to app after reset
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  /**
   * Signs the current user out.
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  /**
   * Deletes a user from the system. Requires a Supabase database function.
   * This calls an RPC to a function that must be created in the Supabase SQL editor.
   */
  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.rpc('delete_user_by_id', {
      user_id_to_delete: userId
    });

    if (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }
};