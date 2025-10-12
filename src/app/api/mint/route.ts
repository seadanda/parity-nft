import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/db';
import { mintNFT } from '@/lib/mint';

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
