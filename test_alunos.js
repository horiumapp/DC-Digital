const { createClient } = require('@supabase/supabase-js');
const url = 'https://iaeisumzwxhwioufgliu.supabase.co';
const key = 'sb_publishable_mK9D-rlkcDWNyrzdMX75lw_5MBqP8FY'; // publishable key (anon fallback)
const supabase = createClient(url, key);

async function test() {
  const turmaId = '24dc5d0e-77e5-4030-9c42-8b2903058f52';
  
  console.log('Fetching all students for turma:', turmaId);
  const { data, error } = await supabase
    .from('alunos')
    .select('*')
    .eq('turma_id', turmaId);
    
  if (error) console.error('Error fetching students:', error);
  else console.log(`Found ${data.length} students total.`);
  
  if (data && data.length > 0) {
    console.log('Sample student:', data[0]);
  }
}

test();
