import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iaeisumzwxhwioufgliu.supabase.co',
  '***REMOVED_ANON_KEY***'
);

async function test() {
  const { data, error } = await supabase
    .from('professores')
    .select('column_that_does_not_exist')
    .limit(1);
    
  console.log('Error info:', error);
}

test();
