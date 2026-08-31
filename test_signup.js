const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSignup() {
  console.log('Tentando cadastrar usuario teste...');
  const { data, error } = await supabase.auth.signUp({
    email: `test_${Date.now()}@gmail.com`,
    password: 'Password@123',
    options: {
      data: {
        username: `testuser_${Date.now()}`
      }
    }
  });

  if (error) {
    console.error('Erro no signup:', error.message);
  } else {
    console.log('Signup com sucesso!', data.user.id);
  }
}

testSignup();
