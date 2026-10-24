import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iervxykfcaqhsjjeslnq.supabase.co';
const supabaseKey = 'sb_publishable_hs8LfTrHNCNJOW55N3pcXA_pLg4oIiR';

export const supabase = createClient(supabaseUrl, supabaseKey);