
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

        // If URL has access_token in hash, force Supabase to extract session from URL
        const initSession = async () => {
            // Check if there's a hash with tokens
            if (hash && (hash.includes('access_token') || hash.includes('refresh_token'))) {
                console.log('Recovery tokens detected in URL, extracting session...')
                // This forces Supabase to parse the URL and set the session
                const { data, error } = await supabase.auth.getSession()
                if (error) {
                    console.error('Error extracting session from URL:', error)
                } else if (data?.session) {
                    console.log('Session extracted successfully:', data.session.user?.email)
                    setUser(data.session.user)
                }
            } else {
                // Normal session check
                const { data: { session } } = await supabase.auth.getSession()
                setUser(session?.user ?? null)
            }
            setLoading(false)
        }

        initSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event)

            // Detect password recovery event
            if (event === 'PASSWORD_RECOVERY') {
                console.log('Password recovery detected')
                setPasswordRecoveryMode(true)
                setLoading(false)
                // Continue to set user session below so updateUser works
            }

            // If we're in password recovery mode, we STILL need to set the user session
            // because supabase.auth.updateUser() requires an active session.
            // The UI (App.jsx) handles showing the ResetPassword component instead of Dashboard.
            if (passwordRecoveryMode && event === 'SIGNED_IN') {
                console.log('Password recovery session established')
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
        // OTP-based password reset methods
        sendOtpForPasswordReset: async (email) => {
            return supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false // Don't create new user if email doesn't exist
                }
            });
        },
        verifyOtpForRecovery: async (email, token) => {
            const result = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email'
            });
            // If verification successful, set password recovery mode
            if (!result.error && result.data?.session) {
                setPasswordRecoveryMode(true);
                setUser(result.data.session.user);
            }
            return result;
        },
        // Legacy link-based reset (keeping for compatibility)
        resetPasswordForEmail: async (email) => {
            return supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/`,
            });
        },
        updatePassword: async (newPassword) => {
            return supabase.auth.updateUser({ password: newPassword });
        },
        user,
        session: user ? { user } : null,
        passwordRecoveryMode,
        clearPasswordRecoveryMode: () => {
            setPasswordRecoveryMode(false)
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
