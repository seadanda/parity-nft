import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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

    return NextResponse.json({
      success: true,
      mints: result.rows
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
