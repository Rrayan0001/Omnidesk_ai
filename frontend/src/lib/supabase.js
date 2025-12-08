
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create client only if both values exist
let supabase = null

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
    console.error('Missing Supabase environment variables. Auth will not work.')
    // Create a mock client to prevent crashes
    supabase = {
        auth: {
            getSession: () => Promise.resolve({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signUp: () => Promise.resolve({ error: new Error('Supabase not configured') }),
            signInWithPassword: () => Promise.resolve({ error: new Error('Supabase not configured') }),
            signOut: () => Promise.resolve({ error: null }),
            verifyOtp: () => Promise.resolve({ error: new Error('Supabase not configured') }),
        }
    }
}

export { supabase }
