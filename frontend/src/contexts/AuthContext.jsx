
import React, { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false)

    useEffect(() => {
        // Check URL hash for password recovery on initial load
        const hash = window.location.hash
        if (hash.includes('type=recovery') || hash.includes('type%3Drecovery')) {
            setPasswordRecoveryMode(true)
        }

        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            // Don't auto-login if we're in password recovery mode
            if (!passwordRecoveryMode) {
                setUser(session?.user ?? null)
            }
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event)

            // Detect password recovery event
            if (event === 'PASSWORD_RECOVERY') {
                console.log('Password recovery detected')
                setPasswordRecoveryMode(true)
                setLoading(false)
                return // Don't set user yet - allow reset password flow
            }

            // If we're in password recovery mode, don't auto-login the user
            if (passwordRecoveryMode && event === 'SIGNED_IN') {
                console.log('Blocking auto-login during password recovery')
                setLoading(false)
                return
            }

            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [passwordRecoveryMode])

    const value = {
        signUp: (data) => supabase.auth.signUp(data),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        verifyOtp: (data) => supabase.auth.verifyOtp(data),
        signOut: async () => {
            try {
                // Remove local session first to update UI immediately
                setUser(null);

                // Then attempt server signout, ignoring errors
                const { error } = await supabase.auth.signOut();
                if (error) console.error("Signout error:", error);
            } catch (err) {
                // Ignore errors if already logged out
                console.log("Already signed out or network error");
            }
        },
        resetPasswordForEmail: async (email) => {
            return supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#access_token`,
            });
        },
        updatePassword: async (newPassword) => {
            return supabase.auth.updateUser({ password: newPassword });
        },
        user,
        session: user ? { user } : null, // Compatible structure if needed
        passwordRecoveryMode,
        clearPasswordRecoveryMode: () => {
            setPasswordRecoveryMode(false)
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname)
        }
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
