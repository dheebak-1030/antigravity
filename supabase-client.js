// Initialize the Supabase Client safely
const supabaseUrl = 'https://rzmjljpmtrrjpkhmncbu.supabase.co';
const supabaseKey = 'sb_publishable_DsKVLUCCh9xM-YhE5RnR8A_f4ke_HEf';

let supabaseClient = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {
  console.warn('[Supabase] Client init skipped (offline / local mode):', e);
}
