// utils/supabase-client.ts
import { createClient } from '@supabase/supabase-js'

// ✅ Environment variables (must be defined in your .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

// ✅ Create ONE Supabase client instance globally
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // ✅ Persist user sessions in localStorage
    persistSession: true,

    // ✅ Automatically refresh tokens before expiry
    autoRefreshToken: true,

    // ✅ Detect session from URL (for magic links, etc.)
    detectSessionInUrl: true,

    // ✅ Explicitly store in localStorage (prevents cookie issues on localhost)
    storage: localStorage,
  },
})

// ✅ Export for API compatibility (optional)
export const api = { supabase }

export default supabase
