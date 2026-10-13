export type EmailTemplateType = 'invitation' | 'payslip' | 'contract';

export interface EmailTemplateContent {
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATE_TYPES: EmailTemplateType[] = [
  'invitation',
  'payslip',
  'contract',
];

// Placeholders available in each template. Substitution happens server-side
// (invitation) or when sending (payslip/contract, future feature).
export const EMAIL_TEMPLATE_PLACEHOLDERS: Record<EmailTemplateType, string[]> = {
  invitation: ['{{company_name}}', '{{employee_name}}', '{{invite_url}}'],
  payslip: ['{{employee_name}}', '{{month}}', '{{login_url}}'],
  contract: ['{{employee_name}}', '{{login_url}}'],
};

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplateContent> = {
  invitation: {
    subject: 'You have been invited to join {{company_name}} on PlegoHR',
    body: `<p>Hello {{employee_name}},</p>
<p>You have been invited to join <strong>{{company_name}}</strong> on PlegoHR.</p>
<p><a href="{{invite_url}}">Set your password and accept the invitation</a></p>
<p>If the button does not work, copy this link into your browser:<br>{{invite_url}}</p>
<p>This invitation expires in 7 days.</p>`,
  },
  payslip: {
    subject: 'Your payslip for {{month}} is ready',
    body: `<p>Hello {{employee_name}},</p>
<p>Your payslip for {{month}} is available.</p>
<p><a href="{{login_url}}">Sign in to PlegoHR to download it</a></p>`,
  },
  contract: {
    subject: 'Your employment contract is available',
    body: `<p>Hello {{employee_name}},</p>
<p>Your employment contract is available in PlegoHR.</p>
<p><a href="{{login_url}}">Sign in to review and sign it</a></p>`,
  },
};
