import { APP_URL } from '@/lib/config/app';

export function getEmailVerificationEmailHtml(token: string, username: string): string {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; color: #333; font-size: 24px; font-weight: bold;">Verify Your Email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.6;">
                Hello ${username || 'there'},
              </p>
              <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.6;">
                Thank you for signing up for InterlinedList! Please verify your email address by clicking the button below:
              </p>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${verifyUrl}" style="display: inline-block; padding: 14px 28px; background-color: #0070f3; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">Verify Email</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 20px 0; color: #0070f3; font-size: 14px; word-break: break-all;">
                ${verifyUrl}
              </p>
              <p style="margin: 20px 0 0 0; color: #999; font-size: 14px; line-height: 1.6;">
                This link will expire in 24 hours for security reasons.
              </p>
              <p style="margin: 20px 0 0 0; color: #999; font-size: 14px; line-height: 1.6;">
                If you didn't create an account with InterlinedList, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} InterlinedList. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function getEmailVerificationEmailText(token: string, username: string): string {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  return `
Verify Your Email

Hello ${username || 'there'},

Thank you for signing up for InterlinedList! Please verify your email address by clicking the link below:

${verifyUrl}

This link will expire in 24 hours for security reasons.

If you didn't create an account with InterlinedList, please ignore this email.

© ${new Date().getFullYear()} InterlinedList. All rights reserved.
  `.trim();
}

