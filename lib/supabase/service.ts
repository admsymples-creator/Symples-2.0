import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function createServiceRoleClient() {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Supabase URL or Service Role Key not defined')
    }

    // Use supabase-js directly for admin operations to bypass RLS
    return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}
