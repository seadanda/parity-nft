/**
 * Test setup file - runs before all tests
 * Configures environment and utilities for testing
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load test environment variables
config({ path: resolve(process.cwd(), '.env.test') })

// If .env.test doesn't exist, fall back to .env.local
if (!process.env.PROXY_SEED) {
  config({ path: resolve(process.cwd(), '.env.local') })
}

// Global test configuration
export const TEST_TIMEOUT = 60000 // 60 seconds for RPC calls
export const CHOPSTICKS_TIMEOUT = 10000 // 10 seconds to wait for Chopsticks to start

// Test RPC endpoints
// Asset Hub: Chopsticks fork (local)
// People Chain: Real Polkadot chain (read-only, no fork needed)
export const TEST_RPC_ENDPOINTS = {
  ASSET_HUB: 'ws://localhost:8000',
  PEOPLE: 'wss://polkadot-people-rpc.polkadot.io',
}

// Known test accounts with real identities on Polkadot
// These addresses have identities set on the People chain
export const TEST_ACCOUNTS = {
  // Well-known accounts with identities
  WITH_IDENTITY_GAVIN: {
    address: '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5', // Gavin Wood
    expectedIdentity: 'Gavin Wood' // Will be checked against actual on-chain data
  },
  WITH_IDENTITY_JOE: {
    address: '1363HWTPzDrzAQ6ChFiMU6mP4b6jmQid2ae55JQcKtZnpLGv', // Joe Petrowski
    expectedIdentity: 'Joe Petrowski'
  },

  // Test accounts for minting
  ALICE: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    seed: '//Alice',
    hasIdentity: false,
  },
  BOB: {
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    seed: '//Bob',
    hasIdentity: false,
  },

  // Account with insufficient balance (will be empty on Chopsticks unless funded)
  WITHOUT_BALANCE: {
    address: '16ZL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD',
  },
}

// Chopsticks process management
let chopsticksPid: number | null = null

/**
 * Start Chopsticks fork for Asset Hub only
 * People chain is accessed directly (read-only)
 */
export async function startChopsticks(): Promise<void> {
  const { spawn } = await import('child_process')

  console.log('🍴 Starting Chopsticks fork...')
  console.log('   - Asset Hub: ws://localhost:8000')
  console.log('   - People Chain: wss://polkadot-people-rpc.polkadot.io (real chain)')

  const chopsticks = spawn('npx', [
    '@acala-network/chopsticks@latest',
    '-c', 'polkadot-asset-hub',
  ], {
    stdio: 'pipe',
    detached: false,
  })

  chopsticksPid = chopsticks.pid || null

  // Wait for Chopsticks to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Chopsticks failed to start within timeout'))
    }, CHOPSTICKS_TIMEOUT)

    chopsticks.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      // Log Chopsticks output during setup
      if (process.env.VERBOSE_TESTS) {
        console.log('[chopsticks]', output)
      }

      // Look for ready indicator
      if (output.includes('Listening') || output.includes('port')) {
        clearTimeout(timeout)
        resolve()
      }
    })

    chopsticks.stderr?.on('data', (data: Buffer) => {
      console.error('[chopsticks error]', data.toString())
    })

    chopsticks.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    chopsticks.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeout)
        reject(new Error(`Chopsticks exited with code ${code}`))
      }
    })
  })

  // Give it an extra second to fully initialize
  await new Promise(resolve => setTimeout(resolve, 2000))

  console.log('✅ Chopsticks is ready\n')
}

/**
 * Stop Chopsticks
 */
export async function stopChopsticks(): Promise<void> {
  if (chopsticksPid) {
    console.log('🛑 Stopping Chopsticks...')
    try {
      process.kill(chopsticksPid, 'SIGTERM')
      chopsticksPid = null
    } catch (err) {
      console.error('Error stopping Chopsticks:', err)
    }
  }
}

/**
 * Check if Chopsticks is running by attempting to connect
 */
export async function isChopsticksRunning(): Promise<boolean> {
  try {
    const { WsProvider } = await import('@polkadot/api')
    const provider = new WsProvider(TEST_RPC_ENDPOINTS.ASSET_HUB, 1000)

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout')), 2000)

      provider.on('connected', () => {
        clearTimeout(timeout)
        resolve()
      })

      provider.on('error', () => {
        clearTimeout(timeout)
        reject(new Error('connection failed'))
      })
    })

    await provider.disconnect()
    return true
  } catch {
    return false
  }
}

// Cleanup on process exit
process.on('exit', () => {
  stopChopsticks()
})

process.on('SIGINT', () => {
  stopChopsticks()
  process.exit(0)
})

process.on('SIGTERM', () => {
  stopChopsticks()
  process.exit(0)
})
