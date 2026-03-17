const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ecnrtylraaddmwmatsrs.supabase.co';
const supabaseAnonKey = 'sb_publishable_caIZl0UBE-GrngvRdieyWw_d-_1OImN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;
