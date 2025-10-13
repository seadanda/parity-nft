import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCode,
  createSession,
  checkRateLimit,
  logAudit,
  getWhitelistEntry
} from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate input
    if (!email || !code || !/^\d{6}$/.test(code)) {
      await logAudit('CODE_VERIFY', email, false, ipAddress, userAgent, 'Invalid input');
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_INPUT',
          message: 'Please enter a valid 6-digit code.'
        },
        { status: 400 }
      );
    }

    // Rate limiting - max 5 attempts per email per hour
    const rateLimit = await checkRateLimit(email.toLowerCase(), 'email', 'verify_code', 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      await logAudit('CODE_VERIFY', email, false, ipAddress, userAgent, 'Too many attempts');
      return NextResponse.json(
        {
          success: false,
          error: 'TOO_MANY_ATTEMPTS',
          message: 'Too many invalid attempts. Please request a new code in 1 hour.',
          canRetryAt: rateLimit.lockedUntil
        },
        { status: 429 }
      );
    }

    // Verify the code
    const isValid = await verifyCode(email, code);

    if (!isValid) {
      await logAudit('CODE_VERIFY', email, false, ipAddress, userAgent, 'Invalid code');
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CODE',
          message: 'Invalid verification code. Please try again.',
          attemptsRemaining: rateLimit.remainingAttempts
        },
        { status: 400 }
      );
    }

    // Create session
    const sessionToken = await createSession(email, ipAddress, userAgent);
    const whitelistEntry = await getWhitelistEntry(email);

    await logAudit('CODE_VERIFY', email, true, ipAddress, userAgent, 'Session created');

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      sessionToken,
      email: email.toLowerCase(),
      name: whitelistEntry?.name
    });

  } catch (error) {
    console.error('Error verifying code:', error);
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
