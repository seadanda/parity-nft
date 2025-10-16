import { NextRequest, NextResponse } from 'next/server';
import { cleanupStuckMintingStates } from '@/lib/db';

/**
 * Cleanup endpoint for stuck minting states
 * Checks on-chain ownership before resetting
 *
 * Can be called:
 * - Manually: GET /api/cleanup?key=YOUR_SECRET
 * - Via cron: Configure in vercel.json
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check - Vercel Cron uses Authorization header, manual calls use query param
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const providedKey = searchParams.get('key');

    const expectedKey = process.env.CLEANUP_SECRET_KEY;
    const cronSecret = process.env.CRON_SECRET;

    // Allow Vercel Cron (Authorization: Bearer CRON_SECRET)
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;

    // Allow manual calls with secret key
    const isManualCall = expectedKey && providedKey === expectedKey;

    if (!isVercelCron && !isManualCall) {
      console.log('[cleanup] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[cleanup] Starting cleanup of stuck minting states...');
    const result = await cleanupStuckMintingStates();

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      completed: result.completed,
      reset: result.reset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[cleanup] Cleanup failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
