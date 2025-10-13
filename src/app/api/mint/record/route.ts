import { NextRequest, NextResponse } from 'next/server';
import { validateSession, recordMint, hasEmailMinted, logAudit } from '@/lib/db';
import { sendMintSuccessEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
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
          error: 'INVALID_SESSION',
          message: 'Session has expired or is invalid.'
        },
        { status: 401 }
      );
    }

    const {
      walletAddress,
      collectionId,
      nftId,
      hash,
      tier,
      rarity,
      transactionHash
    } = await request.json();

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate required fields
    if (!walletAddress || !collectionId || !nftId || !hash || !tier || !rarity) {
      await logAudit('MINT_RECORD', session.email, false, ipAddress, userAgent, 'Missing required fields');
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_INPUT',
          message: 'Missing required mint information.'
        },
        { status: 400 }
      );
    }

    // Check if already minted
    if (await hasEmailMinted(session.email)) {
      await logAudit('MINT_RECORD', session.email, false, ipAddress, userAgent, 'Already minted');
      return NextResponse.json(
        {
          success: false,
          error: 'ALREADY_MINTED',
          message: 'This email has already been used to mint an NFT.'
        },
        { status: 400 }
      );
    }

    // Record the mint
    await recordMint(
      session.email,
      walletAddress,
      collectionId,
      nftId,
      hash,
      tier,
      rarity,
      transactionHash
    );

    await logAudit('MINT_RECORD', session.email, true, ipAddress, userAgent, 'Mint recorded', {
      nftId,
      tier,
      hash
    });

    // Send success email (don't await - let it happen in background)
    sendMintSuccessEmail(session.email, nftId, tier, hash, session.name).catch(err => {
      console.error('Failed to send mint success email:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Mint recorded successfully'
    });

  } catch (error: unknown) {
    console.error('Error recording mint:', error);

    // Check if it's a unique constraint violation (already minted)
    const err = error as { code?: string; message?: string };
    if (err?.code === 'SQLITE_CONSTRAINT' && err?.message?.includes('UNIQUE')) {
      return NextResponse.json(
        {
          success: false,
          error: 'ALREADY_MINTED',
          message: 'This email has already been used to mint an NFT.'
        },
        { status: 400 }
      );
    }

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
