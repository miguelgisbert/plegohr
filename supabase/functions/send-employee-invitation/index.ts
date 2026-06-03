import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password + 'Aa1';
}

interface InvitationRequest {
  employeeId: string;
  email: string;
  companyId: string;
  appUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { employeeId, email, companyId, appUrl }: InvitationRequest = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const password = generatePassword();

    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: email.split('@')[0],
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: userError } = await supabase
      .from('users')
      .update({ type: 'employee', company_id: companyId })
      .eq('id', authUser.user!.id);

    if (userError) {
      console.error('User record update error:', userError);
    }

    const baseUrl = appUrl || 'http://localhost:5173';
    const loginUrl = `${baseUrl}/login`;

    const { data: invitation, error: invitationError } = await supabase
      .from('employee_invitations')
      .insert({
        employee_id: employeeId,
        email: email,
        invited_by: user.id,
      })
      .select()
      .single();

    if (invitationError) {
      return new Response(
        JSON.stringify({ error: invitationError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: employeeLinkError } = await supabase
      .from('employees')
      .update({ user_id: authUser.user!.id })
      .eq('id', employeeId);

    if (employeeLinkError) {
      console.error('Failed to link employee to user:', employeeLinkError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        credentials: {
          email,
          password,
          loginUrl,
        },
        message: 'Employee user created successfully. Share the credentials with the employee.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
