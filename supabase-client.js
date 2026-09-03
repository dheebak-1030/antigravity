// Initialize the Supabase Client
const supabaseUrl = 'https://rzmjljpmtrrjpkhmncbu.supabase.co';
const supabaseKey = 'sb_publishable_DsKVLUCCh9xM-YhE5RnR8A_f4ke_HEf';

// This assumes the Supabase JS library is loaded via a CDN script tag in the HTML before this script
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
