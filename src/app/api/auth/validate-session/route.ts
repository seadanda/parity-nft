import { NextRequest, NextResponse } from 'next/server';
import { validateSession, hasEmailMinted } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: 'MISSING_TOKEN',
          message: 'No session token provided.'
        },
        { status: 401 }
      );
    }

    const session = await validateSession(token);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: 'INVALID_SESSION',
          message: 'Session has expired or is invalid. Please verify your email again.'
        },
        { status: 401 }
      );
    }

    // Check if already minted
    const minted = await hasEmailMinted(session.email);

    return NextResponse.json({
      success: true,
      valid: true,
      email: session.email,
      name: session.name,
      canMint: !minted,
      alreadyMinted: minted
    });

  } catch (error) {
    console.error('Error validating session:', error);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}
