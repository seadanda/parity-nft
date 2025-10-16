import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getIdentitiesBatch } from '@/lib/identity';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validate and clamp parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 per page
    const offset = (validPage - 1) * validLimit;

    const db = getDb();

    // Get total count
    const countResult = await db.execute('SELECT COUNT(*) as total FROM mint_records');
    const total = (countResult.rows[0] as any).total;

    // Get paginated mint records ordered by mint time (newest first)
    const result = await db.execute({
      sql: `
        SELECT
          id,
          wallet_address,
          collection_id,
          nft_id,
          hash,
          tier,
          rarity,
          transaction_hash,
          minted_at
        FROM mint_records
        ORDER BY minted_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [validLimit, offset]
    });

    const mints = result.rows as any as Array<{
      id: number;
      wallet_address: string;
      collection_id: number;
      nft_id: number;
      hash: string;
      tier: string;
      rarity: string;
      transaction_hash: string | null;
      minted_at: string;
    }>;

    // Fetch identities for all wallet addresses
    let identities: Map<string, string> | null = null;
    if (mints.length > 0) {
      try {
        const addresses = mints.map(mint => mint.wallet_address);
        identities = await getIdentitiesBatch(addresses);
      } catch (identityErr) {
        console.error('Failed to fetch identities:', identityErr);
        // Continue without identities - all will show as 'anon'
      }
    }

    // Add identity to each mint
    const mintsWithIdentity = mints.map(mint => ({
      ...mint,
      identity: identities?.get(mint.wallet_address) || 'anon'
    }));

    return NextResponse.json({
      success: true,
      mints: mintsWithIdentity,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
        hasMore: offset + mints.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching recent mints:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch recent mints'
      },
      { status: 500 }
    );
  }
}
