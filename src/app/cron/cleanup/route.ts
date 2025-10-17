import { NextResponse } from 'next/server';
import { cleanupStuckMintingStates } from '@/lib/db';

/**
 * Vercel Cron Job: Cleanup stuck minting states
 *
 * This is called directly by Vercel's cron scheduler (configured in vercel.json)
 * Vercel automatically adds the CRON_SECRET to the Authorization header
 *
 * No manual authentication needed - Vercel handles it
 */
export async function GET() {
  try {
    console.log('[cron:cleanup] Starting cleanup of stuck minting states...');
    const result = await cleanupStuckMintingStates();

    console.log(`[cron:cleanup] Completed: ${result.completed}, Reset: ${result.reset}`);

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      completed: result.completed,
      reset: result.reset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[cron:cleanup] Cleanup failed:', error);
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

// Runtime configuration for Edge or Node
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max
