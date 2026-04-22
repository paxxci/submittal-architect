import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ecnrtylraaddmwmatsrs.supabase.co', 'sb_publishable_caIZl0UBE-GrngvRdieyWw_d-_1OImN');

async function check() {
  console.log('Checking templates table...');
  const { data: tableData, error: tableError } = await supabase.from('templates').select('*');
  console.log('Table Error:', tableError);
  console.log('Table Data:', tableData);

  console.log('\nChecking storage buckets...');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  console.log('Bucket Error:', bucketError);
  console.log('Buckets:', buckets?.map(b => b.name));
}

check();
