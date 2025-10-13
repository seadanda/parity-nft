import { NextRequest, NextResponse } from 'next/server';
import {
  isEmailWhitelisted,
  hasEmailMinted,
  createVerificationCode,
  checkRateLimit,
  logAudit,
  getWhitelistEntry
} from '@/lib/db';
import { sendVerificationEmail, sendAlreadyMintedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await logAudit('CODE_REQUEST', email, false, ipAddress, userAgent, 'Invalid email format');
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_EMAIL',
          message: 'Please enter a valid email address.'
        },
        { status: 400 }
      );
    }

    // Rate limiting - IP only (to prevent abuse)
    // Allow up to 20 code requests per hour per IP
    // NOTE: No per-email rate limit - users can request new codes freely
    //       Old codes are automatically invalidated (see createVerificationCode in db.ts)
    const ipRateLimit = await checkRateLimit(ipAddress, 'ip', 'request_code', 20, 60 * 60 * 1000);
    if (!ipRateLimit.allowed) {
      await logAudit('CODE_REQUEST', email, false, ipAddress, userAgent, 'IP rate limited');
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMITED',
          message: 'Too many requests from your network. Please try again in an hour.',
          canRetryAt: ipRateLimit.lockedUntil
        },
        { status: 429 }
      );
    }

    // Check whitelist and mint status
    const whitelisted = await isEmailWhitelisted(email);
    const minted = whitelisted ? await hasEmailMinted(email) : false;

    console.log(`[request-code] Email: ${email}, Whitelisted: ${whitelisted}, Minted: ${minted}`);

    // SECURITY: Always return success, regardless of whitelist status
    // This prevents attackers from enumerating the whitelist

    if (whitelisted && !minted) {
      // Send verification code if they're whitelisted AND haven't minted
      const code = await createVerificationCode(email, ipAddress, userAgent);
      console.log(`[request-code] Generated code: ${code} for ${email}`);

      await sendVerificationEmail(email, code);
      console.log(`[request-code] Email sent to ${email}`);
      await logAudit('CODE_REQUEST', email, true, ipAddress, userAgent, 'Code sent');
    } else if (whitelisted && minted) {
      // Send "greedy" email if they're whitelisted but already minted
      console.log(`[request-code] Already minted, sending greedy email`);
      await sendAlreadyMintedEmail(email);
      await logAudit('CODE_REQUEST', email, false, ipAddress, userAgent, 'Already minted - greedy email sent');
    } else {
      // Not whitelisted - log but don't send email
      console.log(`[request-code] Not whitelisted, not sending email`);
      await logAudit('CODE_REQUEST', email, false, ipAddress, userAgent, 'Not whitelisted');
    }

    // Always return the same success response
    return NextResponse.json({
      success: true,
      message: 'If your email is on the whitelist, you will receive a verification code shortly.',
      expiresIn: 600 // 10 minutes
    });

  } catch (error) {
    console.error('Error requesting verification code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}
