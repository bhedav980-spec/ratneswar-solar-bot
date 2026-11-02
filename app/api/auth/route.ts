import { cookies } from 'next/headers';
import {
  required,
  env,
  session,
  failure,
} from '@/lib/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (
      req.headers.get('origin') !== new URL(req.url).origin
    ) {
      throw Error('Invalid request origin');
    }

    const { email, password } = await req.json();

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      throw Error('Email and password required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const allowedEmails = env('ADMIN_EMAILS')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedEmails.includes(normalizedEmail)) {
      throw Error(
        'Admin access required. Check ADMIN_EMAILS in Vercel.'
      );
    }

    const projectUrl = required(
      'NEXT_PUBLIC_SUPABASE_URL'
    ).trim().replace(/\/+$/, '');

    const publishableKey = required(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    ).trim();

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(projectUrl);
    } catch {
      throw Error(
        'Invalid Supabase Project URL. Enter only the https://...supabase.co URL in Vercel.'
      );
    }

    if (parsedUrl.protocol !== 'https:') {
      throw Error('Supabase Project URL must use HTTPS.');
    }

    const response = await fetch(
      `${projectUrl}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          apikey: publishableKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      }
    );

    const result = await response.json().catch(() => null);

    if (!result) {
      throw Error(
        `Supabase returned an unexpected response (${response.status}).`
      );
    }

    if (!response.ok) {
      const code = String(
        result.error_code || result.code || ''
      );

      const messages: Record<string, string> = {
        invalid_credentials:
          'Email or password did not match.',
        email_not_confirmed:
          'Confirm this user’s email in Supabase.',
        user_banned:
          'This user is banned in Supabase.',
        over_request_rate_limit:
          'Too many requests. Wait before trying again.',
        over_email_send_rate_limit:
          'Email rate limit reached. Wait before trying again.',
        signup_disabled:
          'Signup is disabled.',
      };

      let detail =
        messages[code] ||
        'Check the corresponding Supabase Auth or API logs.';

      if (response.status === 401 && !code) {
        detail =
          'Authentication was rejected. Check the publishable key and Project URL belong to the same Supabase project.';
      }

      throw Error(
        `Supabase login error (${response.status})` +
          (code ? ` [${code}]` : '') +
          `: ${detail}`
      );
    }

    if (!result.user?.email_confirmed_at) {
      throw Error(
        'Supabase returned an unconfirmed user.'
      );
    }

    if (
      !result.access_token ||
      !result.refresh_token
    ) {
      throw Error(
        'Supabase did not return a complete login session.'
      );
    }

    await session(result);

    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(req: Request) {
  if (
    req.headers.get('origin') !== new URL(req.url).origin
  ) {
    return Response.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    );
  }

  const cookieStore = await cookies();

  cookieStore.delete('rss_access');
  cookieStore.delete('rss_refresh');

  return Response.json({ ok: true });
}
