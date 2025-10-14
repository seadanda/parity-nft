import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getIdentitiesBatch } from '@/lib/identity';

export async function GET() {
  try {
    const db = getDb();

    // Get all mint records ordered by mint time (newest first)
    const result = await db.execute(`
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
    `);

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
      mints: mintsWithIdentity
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
