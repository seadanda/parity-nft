import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/db';
import { mintNFT } from '@/lib/mint';
import { isValidPolkadotAddress, checkAccountBalance } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, walletAddress } = body;

    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization');
    const sessionToken = authHeader?.replace('Bearer ', '');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      );
    }

    // Validate session
    const session = validateSession(sessionToken);
    if (!session || session.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Validate inputs
    if (!email || !walletAddress) {
      return NextResponse.json(
        { error: 'Email and wallet address are required' },
        { status: 400 }
      );
    }

    // Validate Polkadot address format (SS58 with prefix 0)
    if (!isValidPolkadotAddress(walletAddress.trim())) {
      return NextResponse.json(
        { error: 'Invalid Polkadot address format' },
        { status: 400 }
      );
    }

    // Check account balance (>= 0.1 DOT)
    try {
      const balanceInfo = await checkAccountBalance(walletAddress.trim());
      if (!balanceInfo.hasBalance) {
        return NextResponse.json(
          { error: `Insufficient balance. Account has ${balanceInfo.balance} DOT but needs at least 0.1 DOT` },
          { status: 400 }
        );
      }
    } catch (balanceError) {
      console.error('Balance check failed:', balanceError);
      // Continue with minting even if balance check fails (to avoid blocking on RPC issues)
      console.warn('Proceeding with mint despite balance check failure');
    }

    // Call the minting function
    const result = await mintNFT(email.toLowerCase().trim(), walletAddress.trim());

    return NextResponse.json(result);
  } catch (error) {
    console.error('Mint API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during minting'
      },
      { status: 500 }
    );
  }
}
