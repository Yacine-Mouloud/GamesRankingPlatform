import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://xaluytjrdtpbnadowlcd.supabase.co"
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_b1GXs0AD8C9VQVJanKvTcg_ng5JSjGE"

export const supabase = createClient(supabaseUrl, supabaseKey)
