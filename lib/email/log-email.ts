/**
 * Email logging helper. Logs transactional email sends to the database.
 * Best-effort only: never throws; logs DB errors to console.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type EmailLogType =
  | 'signup_verification'
  | 'resend_verification'
  | 'admin_user_verification'
  | 'email_change_verification'
  | 'forgot_password';

export interface LogEmailParams {
  emailType: EmailLogType;
  fromEmail?: string | null;
  recipient: string;
  userId?: string | null;
  status: 'sent' | 'failed';
  providerId?: string | null;
  errorMessage?: string | null;
  metadata?: object | null;
}

/** Resend API returns { data } on success or { error: { message, statusCode, name } } on failure */
export function getResendLogParams(
  result: {
    data?: { id?: string } | null;
    error?: { message?: string; statusCode?: number | null; name?: string } | null;
  },
  base: Omit<LogEmailParams, 'status' | 'providerId' | 'errorMessage'>
): LogEmailParams {
  const err = result?.error;
  if (err) {
    const metadata: Record<string, unknown> = { ...(base.metadata as Record<string, unknown> ?? {}) };
    if (err.statusCode !== undefined) metadata.errorCode = err.statusCode;
    if (err.name) metadata.errorName = err.name;
    return {
      ...base,
      status: 'failed',
      errorMessage: err.message ?? 'Unknown Resend error',
      metadata,
    };
  }
  const id = result?.data?.id;
  return { ...base, status: 'sent', providerId: id ?? undefined };
}

export async function logEmailSend(params: LogEmailParams): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        emailType: params.emailType,
        fromEmail: params.fromEmail ?? undefined,
        recipient: params.recipient,
        userId: params.userId ?? undefined,
        status: params.status,
        providerId: params.providerId ?? undefined,
        errorMessage: params.errorMessage ?? undefined,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error('Failed to log email send:', err);
  }
}
