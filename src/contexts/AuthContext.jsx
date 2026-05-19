'use client'
import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { resetSavedIds } from '../lib/movieActions'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes — reset saved-IDs cache so it rebuilds for the new user
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      resetSavedIds()
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = (email, password, fullName) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // After the user clicks the verification link, send them back here
        // already logged in (Supabase exchanges the token automatically).
        // &verified=1 is our signal to show the "Email verified" toast.
        emailRedirectTo: `${window.location.origin}/browse?section=movies&verified=1`,
      },
    })

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/browse?section=movies' },
    })

  const signOut = () => supabase.auth.signOut()

  const updateDisplayName = (name) =>
    supabase.auth.updateUser({ data: { full_name: name } })

  const updatePassword = (newPassword) =>
    supabase.auth.updateUser({ password: newPassword })

  // Requires a Postgres function in Supabase:
  // CREATE OR REPLACE FUNCTION delete_user()
  // RETURNS void LANGUAGE sql SECURITY DEFINER AS
  // $$ DELETE FROM auth.users WHERE id = auth.uid(); $$;
  const deleteAccount = () => supabase.rpc('delete_user')

  const value = useMemo(
    () => ({ user, loading, signUp, signIn, signInWithGoogle, signOut, updateDisplayName, updatePassword, deleteAccount }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
