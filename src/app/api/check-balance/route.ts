import { NextRequest, NextResponse } from 'next/server';
import { checkAccountBalance, isValidPolkadotAddress } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!isValidPolkadotAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid Polkadot address' },
        { status: 400 }
      );
    }

    // Check balance on Polkadot
    const balanceInfo = await checkAccountBalance(address);

    return NextResponse.json({
      hasBalance: balanceInfo.hasBalance,
      balance: balanceInfo.balance,
      address
    });
  } catch (error) {
    console.error('Balance check API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check balance'
      },
      { status: 500 }
    );
  }
}
