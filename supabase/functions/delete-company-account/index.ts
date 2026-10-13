import { createClient } from 'npm:@supabase/supabase-js@2';

// Permanently deletes a company account: storage files (documents + logos),
// every tenant row (via FK cascades from the owner), the app `users` rows of
// the employees, and the auth.users of the employees and the owner.
// Invoked from the company settings "danger zone"; the caller must be the
// company owner/admin.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Recursively collects every file path under a storage "folder" (paths are
// virtual prefixes in Supabase storage).
async function collectStoragePaths(
  storage: ReturnType<typeof createClient>['storage'],
  bucket: string,
  folder: string,
): Promise<string[]> {
  const { data, error } = await storage.from(bucket).list(folder, { limit: 1000 });
  if (error || !data) {
    console.error(`Failed to list ${bucket}/${folder}:`, error?.message);
    return [];
  }

  const paths: string[] = [];
  for (const item of data) {
    const full = `${folder}/${item.name}`;
    if (item.id) {
      paths.push(full);
    } else {
      paths.push(...await collectStoragePaths(storage, bucket, full));
    }
  }
  return paths;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'unauthorized' });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return jsonResponse(401, { error: 'unauthorized' });
    }

    // Tenant isolation: only the company admin (owner) may delete the account.
    const { data: caller, error: callerError } = await supabase
      .from('users')
      .select('id, type')
      .eq('id', user.id)
      .maybeSingle();

    if (callerError || !caller) {
      return jsonResponse(401, { error: 'unauthorized' });
    }
    if (caller.type !== 'company') {
      return jsonResponse(403, { error: 'forbidden' });
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (companyError || !company) {
      return jsonResponse(404, { error: 'company_not_found' });
    }

    // Auth user ids to remove: employees linked to this company + the owner.
    const { data: memberRows } = await supabase
      .from('employees')
      .select('user_id')
      .eq('company_id', company.id)
      .not('user_id', 'is', null);

    const memberAuthIds = [...new Set((memberRows ?? []).map((r) => r.user_id))];
    const authIdsToDelete = [...memberAuthIds, user.id];

    // Storage cleanup (documents + logos live under <company_id>/...).
    const documentPaths = await collectStoragePaths(supabase.storage, 'documents', company.id);
    if (documentPaths.length > 0) {
      const { error: docsError } = await supabase.storage.from('documents').remove(documentPaths);
      if (docsError) console.error('Failed to delete document files:', docsError.message);
    }

    const logoPaths = await collectStoragePaths(supabase.storage, 'company-logos', company.id);
    if (logoPaths.length > 0) {
      const { error: logosError } = await supabase.storage.from('company-logos').remove(logoPaths);
      if (logosError) console.error('Failed to delete logo files:', logosError.message);
    }

    // App users rows: employees first (their users.company_id still points at
    // the company), then the owner — deleting the owner cascades the companies
    // row and, with it, every remaining tenant row (employees, documents,
    // invitations, leave, time tracking, templates).
    const { error: employeesDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('company_id', company.id)
      .eq('type', 'employee');

    if (employeesDeleteError) {
      return jsonResponse(500, { error: 'employee_users_delete_failed' });
    }

    const { error: ownerDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (ownerDeleteError) {
      return jsonResponse(500, { error: 'owner_delete_failed' });
    }

    // Finally remove the auth accounts (service role only). Failures here are
    // logged but not fatal: the app rows are already gone.
    for (const authId of authIdsToDelete) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authId);
      if (deleteUserError) {
        console.error(`Failed to delete auth user ${authId}:`, deleteUserError.message);
      }
    }

    return jsonResponse(200, {
      success: true,
      company: company.name,
      deleted_auth_users: authIdsToDelete.length,
    });
  } catch (error) {
    console.error('delete-company-account failed:', error);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'internal_error',
    });
  }
});
