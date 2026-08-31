const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runTests() {
  console.log('--- Testes de Integração Pós-RLS Fix ---');
  let hasError = false;

  try {
    // 1. Busca RPC
    console.log('\n[1] RPC get_email_by_username("admin")');
    const { data: email, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: 'admin' });
    if (rpcError) {
      console.error('❌ Erro:', rpcError.message);
      hasError = true;
    } else {
      console.log('✅ Retornou:', email);
      if (email !== 'admin@popclub.com') {
         console.error('❌ Erro: O e-mail deveria ser admin@popclub.com');
         hasError = true;
      }
    }

    // 2. Login
    console.log('\n[2] Login com admin@popclub.com (Senha: @64844048)');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@popclub.com',
      password: '@64844048'
    });

    if (authError) {
      console.error('❌ Erro de Autenticação:', authError.message);
      hasError = true;
    } else {
      console.log('✅ Logado com sucesso. UID:', authData.user.id);
      
      // 3. Checar Perfil
      console.log('\n[3] Buscando perfil do Admin');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();
        
      if (profileError) {
        console.error('❌ Erro de Perfil:', profileError.message);
        hasError = true;
      } else {
        console.log('✅ Perfil obtido. Role:', profile.role);
        if (profile.role !== 'admin') {
           console.error('❌ A role não é admin!');
           hasError = true;
        }
      }
    }
  } catch (e) {
    console.error('Exceção:', e);
    hasError = true;
  }

  if (hasError) {
    console.log('\n❌ FALHAS DETECTADAS.');
    process.exit(1);
  } else {
    console.log('\n🎉 TUDO FUNCIONANDO PERFEITAMENTE!');
    process.exit(0);
  }
}

runTests();
