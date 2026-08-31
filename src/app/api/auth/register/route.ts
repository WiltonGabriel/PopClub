import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// We create a fresh client for the server route to perform backend operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
    }

    // 1. Password Validation
    const hasLetter = /[A-Za-z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }
    if (!hasNumber) {
      return NextResponse.json({ error: "A senha deve conter pelo menos um número." }, { status: 400 });
    }
    if (!hasLetter && !hasSpecial) {
      return NextResponse.json({ error: "A senha deve conter pelo menos uma letra ou caractere especial." }, { status: 400 });
    }

    // 2. Username uniqueness check
    const { data: existingUser, error: checkError } = await supabase
      .from("user_profiles")
      .select("username")
      .eq("username", username)
      .single();
      
    if (existingUser) {
      return NextResponse.json({ error: "Este nome de usuário já está em uso." }, { status: 400 });
    }
    
    // Ignore PGRST116 (0 rows returned) error
    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ error: "Erro ao verificar disponibilidade do usuário." }, { status: 500 });
    }

    // 3. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username, // this goes to raw_user_meta_data and is caught by the SQL trigger
        }
      }
    });

    if (authError) {
      // Return a user friendly error if email already exists
      if (authError.message.includes("User already registered")) {
         return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: authData.user });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro interno do servidor" }, { status: 500 });
  }
}
