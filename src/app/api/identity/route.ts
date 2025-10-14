import { NextRequest, NextResponse } from 'next/server';
import { getIdentity, getIdentitiesBatch } from '@/lib/identity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    const identity = await getIdentity(address);

    return NextResponse.json({
      success: true,
      identity: {
        display: identity.display,
        hasIdentity: identity.hasIdentity
      }
    });
  } catch (error) {
    console.error('Identity API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch identity'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const addresses = searchParams.get('addresses');

    // Batch request
    if (addresses) {
      const addressList = addresses.split(',').map(a => a.trim()).filter(Boolean);

      if (addressList.length === 0) {
        return NextResponse.json(
          { error: 'No valid addresses provided' },
          { status: 400 }
        );
      }

      const identities = await getIdentitiesBatch(addressList);

      // Convert Map to object for JSON response
      const result: Record<string, string> = {};
      identities.forEach((display, addr) => {
        result[addr] = display;
      });

      return NextResponse.json({ identities: result });
    }

    // Single address request
    if (address) {
      const identity = await getIdentity(address);
      return NextResponse.json({
        address,
        displayName: identity.display,
        hasIdentity: identity.hasIdentity
      });
    }

    return NextResponse.json(
      { error: 'Address or addresses parameter required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Identity API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch identity'
      },
      { status: 500 }
    );
  }
}
