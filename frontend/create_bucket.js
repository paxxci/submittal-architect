import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ecnrtylraaddmwmatsrs.supabase.co', 'sb_publishable_caIZl0UBE-GrngvRdieyWw_d-_1OImN');

async function createBucket() {
  console.log('Attempting to create bucket...');
  const { data, error } = await supabase.storage.createBucket('templates', { public: true });
  console.log('Result:', { data, error });
}

createBucket();
