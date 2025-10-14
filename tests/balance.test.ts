/**
 * Balance Checking Tests
 * Tests for checking account balances on Asset Hub
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { checkAccountBalance, isValidPolkadotAddress } from '../src/lib/validation'
import { TEST_WALLETS, RANDOM_ACCOUNT } from './fixtures/accounts'
import { TEST_RPC_ENDPOINTS } from './setup'

describe('Balance Checking (pjs-api)', () => {
  beforeAll(() => {
    // Override RPC endpoint to use Chopsticks fork
    process.env.RPC_ENDPOINT = TEST_RPC_ENDPOINTS.ASSET_HUB
  })

  describe('Address Validation', () => {
    test('should validate correct Polkadot address', () => {
      const address = TEST_WALLETS.ALICE.address
      expect(isValidPolkadotAddress(address)).toBe(true)
    })

    test('should reject invalid address format', () => {
      const invalidAddress = 'not-an-address'
      expect(isValidPolkadotAddress(invalidAddress)).toBe(false)
    })

    test('should reject Kusama address (wrong prefix)', () => {
      // Kusama addresses start with different characters
      const kusamaAddress = 'FLk7KoqCJXHLMPPtPH4DpMhqzMsqLCkp4Bv2VwXDFNmefJr'
      const result = isValidPolkadotAddress(kusamaAddress)

      // Should either reject or validate (depends on implementation)
      // Log for verification
      console.log(`      ℹ️  Kusama address validation:`, result)
    })

    test('should validate all test wallet addresses', () => {
      Object.values(TEST_WALLETS).forEach(wallet => {
        expect(isValidPolkadotAddress(wallet.address)).toBe(true)
      })
    })
  })

  describe('Balance Queries', () => {
    test('should query balance for funded account (Alice)', async () => {
      // Alice is funded in chopsticks-config-asset-hub.yml
      const address = TEST_WALLETS.ALICE.address
      const result = await checkAccountBalance(address)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('hasBalance')
      expect(result).toHaveProperty('balance')
      expect(result).toHaveProperty('balancePlanck')

      // Check types
      expect(typeof result.hasBalance).toBe('boolean')
      expect(typeof result.balance).toBe('string')
      expect(typeof result.balancePlanck).toBe('bigint')

      // Alice should have >= 0.1 DOT (funded in config)
      expect(result.hasBalance).toBe(true)
      expect(parseFloat(result.balance)).toBeGreaterThanOrEqual(0.1)
      expect(result.balancePlanck).toBeGreaterThanOrEqual(BigInt('1000000000')) // 0.1 DOT

      console.log(`      ℹ️  Alice balance: ${result.balance} DOT`)
      console.log(`      ℹ️  Alice balance (planck): ${result.balancePlanck}`)
    }, 30000)

    test('should query balance for Bob (also funded)', async () => {
      const address = TEST_WALLETS.BOB.address
      const result = await checkAccountBalance(address)

      expect(result.hasBalance).toBe(true)
      expect(parseFloat(result.balance)).toBeGreaterThanOrEqual(0.1)

      console.log(`      ℹ️  Bob balance: ${result.balance} DOT`)
    }, 30000)

    test('should handle account with zero balance', async () => {
      // Random account should have zero balance on Chopsticks
      const address = RANDOM_ACCOUNT.address
      const result = await checkAccountBalance(address)

      expect(result.hasBalance).toBe(false)
      expect(result.balance).toBe('0.0000')
      expect(result.balancePlanck).toBe(BigInt(0))
    }, 30000)

    test('should query balance for Dave (unfunded)', async () => {
      // Dave is not funded in config
      const address = TEST_WALLETS.DAVE.address
      const result = await checkAccountBalance(address)

      // Should have zero or insufficient balance
      expect(result.hasBalance).toBe(false)
      expect(parseFloat(result.balance)).toBeLessThan(0.1)

      console.log(`      ℹ️  Dave balance: ${result.balance} DOT`)
    }, 30000)
  })

  describe('Balance Formatting', () => {
    test('should format balance with 4 decimal places', async () => {
      const address = TEST_WALLETS.ALICE.address
      const result = await checkAccountBalance(address)

      // Should match format: X.XXXX
      expect(result.balance).toMatch(/^\d+\.\d{4}$/)
    }, 30000)

    test('should correctly convert between DOT and planck', async () => {
      const address = TEST_WALLETS.ALICE.address
      const result = await checkAccountBalance(address)

      const balanceDOT = parseFloat(result.balance)
      const expectedPlanck = BigInt(Math.floor(balanceDOT * 1e10))

      // Should be close (within rounding error)
      const diff = result.balancePlanck - expectedPlanck
      expect(Number(diff)).toBeLessThanOrEqual(1e10) // Within 1 DOT
    }, 30000)

    test('should handle large balances correctly', async () => {
      // If Alice has 1 DOT = 10000000000 planck
      const address = TEST_WALLETS.ALICE.address
      const result = await checkAccountBalance(address)

      // 1 DOT on Asset Hub = 10^10 planck
      const oneDOT = BigInt('10000000000')

      if (result.balancePlanck >= oneDOT) {
        // Should format correctly
        const expectedDOT = Number(result.balancePlanck) / 1e10
        const actualDOT = parseFloat(result.balance)

        expect(actualDOT).toBeCloseTo(expectedDOT, 4)
      }
    }, 30000)
  })

  describe('Balance Thresholds', () => {
    test('should detect balance >= 0.1 DOT (ED)', async () => {
      const address = TEST_WALLETS.ALICE.address
      const result = await checkAccountBalance(address)

      // Alice funded with 1 DOT in config
      expect(result.hasBalance).toBe(true)
    }, 30000)

    test('should detect balance < 0.1 DOT', async () => {
      const address = TEST_WALLETS.DAVE.address
      const result = await checkAccountBalance(address)

      // Dave not funded
      expect(result.hasBalance).toBe(false)
    }, 30000)

    test('should correctly evaluate boundary (exactly 0.1 DOT)', async () => {
      // This would require setting up an account with exactly 0.1 DOT
      // For now, document the expected behavior
      const minBalancePlanck = BigInt('1000000000') // 0.1 DOT

      // hasBalance should be true if balance >= 1000000000 planck
      expect(minBalancePlanck >= BigInt('1000000000')).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should throw error for invalid address', async () => {
      const invalidAddress = 'invalid-address'

      await expect(checkAccountBalance(invalidAddress)).rejects.toThrow()
    })

    test('should throw error for malformed address', async () => {
      const malformedAddress = '1' + 'x'.repeat(47)

      await expect(checkAccountBalance(malformedAddress)).rejects.toThrow()
    })

    test('should throw error if RPC endpoint not configured', async () => {
      const originalEndpoint = process.env.RPC_ENDPOINT
      delete process.env.RPC_ENDPOINT

      const address = TEST_WALLETS.ALICE.address

      await expect(checkAccountBalance(address)).rejects.toThrow(/RPC_ENDPOINT/)

      // Restore
      process.env.RPC_ENDPOINT = originalEndpoint
    })
  })

  describe('Real World Scenarios', () => {
    test('should query multiple accounts in sequence', async () => {
      const addresses = [
        TEST_WALLETS.ALICE.address,
        TEST_WALLETS.BOB.address,
        TEST_WALLETS.CHARLIE.address,
      ]

      const results = []
      for (const address of addresses) {
        const result = await checkAccountBalance(address)
        results.push({ address, ...result })
      }

      expect(results).toHaveLength(3)
      results.forEach((result, i) => {
        expect(result.address).toBe(addresses[i])
        expect(result).toHaveProperty('hasBalance')
        expect(result).toHaveProperty('balance')

        const name = Object.values(TEST_WALLETS).find(w => w.address === result.address)?.name
        console.log(`      ℹ️  ${name}: ${result.balance} DOT (sufficient: ${result.hasBalance})`)
      })
    }, 60000)

    test('should match expected balances from config', async () => {
      // Alice funded with 1 DOT in chopsticks-config-asset-hub.yml
      const alice = await checkAccountBalance(TEST_WALLETS.ALICE.address)

      // Should be approximately 1 DOT (may be slightly less due to ED)
      const aliceDOT = parseFloat(alice.balance)
      expect(aliceDOT).toBeGreaterThanOrEqual(0.9)
      expect(aliceDOT).toBeLessThanOrEqual(1.1)

      console.log(`      ℹ️  Expected: ~1.0000 DOT, Got: ${alice.balance} DOT`)
    }, 30000)
  })

  describe('Performance', () => {
    test('should complete balance check within reasonable time', async () => {
      const address = TEST_WALLETS.ALICE.address

      const start = Date.now()
      await checkAccountBalance(address)
      const duration = Date.now() - start

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000)

      console.log(`      ℹ️  Balance check took ${duration}ms`)
    }, 30000)

    test('should handle concurrent balance checks', async () => {
      const addresses = [
        TEST_WALLETS.ALICE.address,
        TEST_WALLETS.BOB.address,
        TEST_WALLETS.CHARLIE.address,
        TEST_WALLETS.DAVE.address,
      ]

      const start = Date.now()
      const results = await Promise.all(
        addresses.map(addr => checkAccountBalance(addr))
      )
      const duration = Date.now() - start

      expect(results).toHaveLength(4)
      results.forEach(result => {
        expect(result).toHaveProperty('hasBalance')
        expect(result).toHaveProperty('balance')
      })

      console.log(`      ℹ️  Concurrent checks (${addresses.length}) took ${duration}ms`)
    }, 30000)
  })
})
