import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InvitationRequest {
  employeeId: string;
  email: string;
  companyId: string;
  appUrl?: string;
}

interface InvitationRecord {
  id: string;
  token: string;
  email: string;
  expires_at: string;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateToken(): string {
  return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
}

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Replaces {{placeholder}} tokens. Values are expected to be pre-escaped
// when the result is injected into HTML.
function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => vars[key] ?? match);
}

async function sendInvitationEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  inviteUrl: string;
  employeeName: string;
  companyName: string;
  // Per-company template from email_templates (type 'invitation'), if any.
  customTemplate?: { subject: string; body: string } | null;
}): Promise<{ ok: boolean; detail: string }> {
  const subject = params.customTemplate
    ? renderTemplate(params.customTemplate.subject, {
        company_name: params.companyName,
        employee_name: params.employeeName,
        invite_url: params.inviteUrl,
      })
    : `You have been invited to ${params.companyName} on PlegoHR`;

  const html = params.customTemplate
    ? renderTemplate(params.customTemplate.body, {
        company_name: escapeHtml(params.companyName),
        employee_name: escapeHtml(params.employeeName),
        invite_url: escapeHtml(params.inviteUrl),
      })
    : `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, Helvetica, sans-serif; background: #f4f7f7; padding: 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: #0d9488; padding: 24px 32px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">PlegoHR</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px;">You have been invited to join ${escapeHtml(params.companyName)}</h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
                Hi ${escapeHtml(params.employeeName)},
              </p>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                An administrator added you to <strong>${escapeHtml(params.companyName)}</strong> on PlegoHR.
                Click the button below to set your password and activate your account. This link expires in 7 days.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td style="background: #0d9488; border-radius: 8px;">
                    <a href="${escapeHtml(params.inviteUrl)}" style="display: inline-block; padding: 12px 24px; color: #ffffff; font-weight: bold; font-size: 14px; text-decoration: none;">
                      Set my password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0;">
                If the button does not work, copy and paste this link into your browser:<br />
                <span style="color: #0d9488;">${escapeHtml(params.inviteUrl)}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background: #f9fafb; color: #9ca3af; font-size: 12px;">
              This is an automated message from PlegoHR. You can ignore it if you were not expecting an invitation.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return { ok: false, detail: detail.slice(0, 500) };
    }
    return { ok: true, detail: 'sent' };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
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

    const body = (await req.json()) as Partial<InvitationRequest>;
    const { employeeId, email, companyId } = body;

    if (!isValidUuid(employeeId) || !isValidUuid(companyId) || typeof email !== 'string') {
      return jsonResponse(400, { error: 'invalid_request' });
    }

    // Tenant isolation: the caller must belong to the requested company
    // and must be the company admin (users.type = 'company').
    const { data: caller, error: callerError } = await supabase
      .from('users')
      .select('id, company_id, type')
      .eq('id', user.id)
      .maybeSingle();

    if (callerError || !caller) {
      return jsonResponse(401, { error: 'unauthorized' });
    }
    if (caller.type !== 'company' || caller.company_id !== companyId) {
      return jsonResponse(403, { error: 'forbidden_cross_tenant' });
    }

    // Employee must belong to the same company and still be unlinked.
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, company_id, email, full_name, user_id')
      .eq('id', employeeId)
      .maybeSingle();

    if (employeeError || !employee) {
      return jsonResponse(404, { error: 'employee_not_found' });
    }
    if (employee.company_id !== companyId) {
      return jsonResponse(403, { error: 'forbidden_cross_tenant' });
    }
    if (employee.user_id) {
      return jsonResponse(409, { error: 'employee_already_accepted' });
    }

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .maybeSingle();
    const companyName = company?.name ?? 'your team';

    // Company-specific invitation template, when saved from company settings.
    const { data: invitationTemplate } = await supabase
      .from('email_templates')
      .select('subject, body')
      .eq('company_id', companyId)
      .eq('template_type', 'invitation')
      .maybeSingle();

    const appUrl = (typeof body.appUrl === 'string' && body.appUrl) ||
      Deno.env.get('APP_URL') ||
      'http://localhost:5173';
    const normalizedAppUrl = appUrl.replace(/\/+$/, '');

    // Create a fresh invitation or regenerate the existing one (resend).
    const { data: existing } = await supabase
      .from('employee_invitations')
      .select('id, status')
      .eq('employee_id', employeeId)
      .eq('status', 'pending')
      .maybeSingle();

    const token = generateToken();
    let invitation: InvitationRecord;

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('employee_invitations')
        .update({
          email,
          company_id: companyId,
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          accepted_at: null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          token,
        })
        .eq('id', existing.id)
        .select('id, token, email, expires_at')
        .single();

      if (updateError || !updated) {
        return jsonResponse(500, { error: 'invitation_update_failed' });
      }
      invitation = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('employee_invitations')
        .insert({
          employee_id: employeeId,
          email,
          company_id: companyId,
          invited_by: user.id,
          token,
        })
        .select('id, token, email, expires_at')
        .single();

      if (insertError || !inserted) {
        return jsonResponse(500, { error: 'invitation_create_failed' });
      }
      invitation = inserted;
    }

    const inviteUrl = `${normalizedAppUrl}/accept-invitation?token=${invitation.token}`;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return jsonResponse(200, {
        success: true,
        delivery: 'unconfigured',
        inviteUrl,
        invitation: { id: invitation.id, expires_at: invitation.expires_at },
        message: 'RESEND_API_KEY is not configured. Share the inviteUrl manually.',
      });
    }

    const emailResult = await sendInvitationEmail({
      apiKey: resendApiKey,
      from: Deno.env.get('EMAIL_FROM') ?? 'PlegoHR <onboarding@resend.dev>',
      to: email,
      inviteUrl,
      employeeName: employee.full_name || email,
      companyName,
      customTemplate: invitationTemplate,
    });

    if (!emailResult.ok) {
      console.error('Invitation email delivery failed:', emailResult.detail);
      return jsonResponse(200, {
        success: true,
        delivery: 'failed',
        inviteUrl,
        invitation: { id: invitation.id, expires_at: invitation.expires_at },
        detail: emailResult.detail,
      });
    }

    return jsonResponse(200, {
      success: true,
      delivery: 'sent',
      invitation: { id: invitation.id, expires_at: invitation.expires_at },
    });
  } catch (error) {
    console.error('send-employee-invitation failed:', error);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'internal_error',
    });
  }
});
