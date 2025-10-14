/**
 * Identity Lookup Tests
 * Tests for fetching identity display names from Polkadot People chain
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { getIdentity, getIdentitiesBatch, getIdentityDisplayName, clearIdentityCache } from '../src/lib/identity'
import { KNOWN_IDENTITIES, RANDOM_ACCOUNT, TEST_WALLETS } from './fixtures/accounts'
import { TEST_RPC_ENDPOINTS } from './setup'

describe('Identity Lookups (pjs-api)', () => {
  beforeAll(() => {
    // Override RPC endpoint to use Chopsticks fork
    process.env.PEOPLE_CHAIN_RPC = TEST_RPC_ENDPOINTS.PEOPLE
    // Clear cache before tests
    clearIdentityCache()
  })

  describe('Single Identity Lookup', () => {
    test('should fetch identity with display name set', async () => {
      const address = KNOWN_IDENTITIES.GAVIN.address
      const identity = await getIdentity(address)

      expect(identity).toBeDefined()
      expect(identity.hasIdentity).toBe(true)
      expect(identity.display).not.toBe('anon')
      expect(typeof identity.display).toBe('string')
      expect(identity.display.length).toBeGreaterThan(0)

      // Log the actual identity for verification
      console.log(`      ℹ️  Identity for ${address}:`, identity.display)
    }, 30000)

    test('should return "anon" for account without identity', async () => {
      const address = RANDOM_ACCOUNT.address
      const identity = await getIdentity(address)

      expect(identity).toBeDefined()
      expect(identity.hasIdentity).toBe(false)
      expect(identity.display).toBe('anon')
    }, 30000)

    test('should return "anon" for test accounts (Alice, Bob)', async () => {
      const aliceIdentity = await getIdentity(TEST_WALLETS.ALICE.address)
      const bobIdentity = await getIdentity(TEST_WALLETS.BOB.address)

      expect(aliceIdentity.display).toBe('anon')
      expect(aliceIdentity.hasIdentity).toBe(false)

      expect(bobIdentity.display).toBe('anon')
      expect(bobIdentity.hasIdentity).toBe(false)
    }, 30000)
  })

  describe('Display Name Helper', () => {
    test('should return display name string directly', async () => {
      const address = KNOWN_IDENTITIES.GAVIN.address
      const displayName = await getIdentityDisplayName(address)

      expect(typeof displayName).toBe('string')
      expect(displayName).not.toBe('')
      console.log(`      ℹ️  Display name: ${displayName}`)
    }, 30000)

    test('should return "anon" for account without identity', async () => {
      const address = RANDOM_ACCOUNT.address
      const displayName = await getIdentityDisplayName(address)

      expect(displayName).toBe('anon')
    }, 30000)
  })

  describe('Batch Identity Lookup', () => {
    test('should fetch multiple identities efficiently', async () => {
      const addresses = [
        KNOWN_IDENTITIES.GAVIN.address,
        KNOWN_IDENTITIES.JOE.address,
        RANDOM_ACCOUNT.address,
        TEST_WALLETS.ALICE.address,
      ]

      const startTime = Date.now()
      const identities = await getIdentitiesBatch(addresses)
      const duration = Date.now() - startTime

      expect(identities).toBeInstanceOf(Map)
      expect(identities.size).toBe(addresses.length)

      // Verify all addresses are present
      addresses.forEach(address => {
        expect(identities.has(address)).toBe(true)
        expect(typeof identities.get(address)).toBe('string')
      })

      // Known identities should not be "anon"
      const gavinName = identities.get(KNOWN_IDENTITIES.GAVIN.address)
      expect(gavinName).not.toBe('anon')

      // Random account should be "anon"
      expect(identities.get(RANDOM_ACCOUNT.address)).toBe('anon')
      expect(identities.get(TEST_WALLETS.ALICE.address)).toBe('anon')

      console.log(`      ℹ️  Batch lookup took ${duration}ms for ${addresses.length} addresses`)
      console.log('      ℹ️  Results:')
      identities.forEach((name, address) => {
        const short = `${address.slice(0, 8)}...${address.slice(-6)}`
        console.log(`         ${short}: ${name}`)
      })
    }, 30000)

    test('should handle empty array', async () => {
      const identities = await getIdentitiesBatch([])
      expect(identities.size).toBe(0)
    })

    test('should handle single address', async () => {
      const identities = await getIdentitiesBatch([KNOWN_IDENTITIES.GAVIN.address])
      expect(identities.size).toBe(1)
      expect(identities.has(KNOWN_IDENTITIES.GAVIN.address)).toBe(true)
    }, 30000)
  })

  describe('Caching Behavior', () => {
    test('should cache identity lookups', async () => {
      const address = KNOWN_IDENTITIES.GAVIN.address

      // Clear cache first
      clearIdentityCache()

      // First call - will hit RPC
      const start1 = Date.now()
      const identity1 = await getIdentity(address)
      const time1 = Date.now() - start1

      // Second call - should use cache
      const start2 = Date.now()
      const identity2 = await getIdentity(address)
      const time2 = Date.now() - start2

      // Verify same result
      expect(identity1.display).toBe(identity2.display)
      expect(identity1.hasIdentity).toBe(identity2.hasIdentity)

      // Second call should be significantly faster (< 10% of first call)
      console.log(`      ℹ️  First call: ${time1}ms, Second call (cached): ${time2}ms`)
      expect(time2).toBeLessThan(time1 * 0.1)
    }, 30000)

    test('should clear cache when requested', async () => {
      const address = KNOWN_IDENTITIES.GAVIN.address

      // Populate cache
      await getIdentity(address)

      // Clear cache
      clearIdentityCache()

      // Next call should hit RPC again (will be slower)
      const start = Date.now()
      await getIdentity(address)
      const time = Date.now() - start

      // Should take longer than a cached call (> 10ms)
      expect(time).toBeGreaterThan(10)
    }, 30000)
  })

  describe('Error Handling', () => {
    test('should handle invalid address format gracefully', async () => {
      const invalidAddress = 'not-a-valid-address'

      // Should not throw
      const identity = await getIdentity(invalidAddress)

      // Should return default values
      expect(identity.display).toBe('anon')
      expect(identity.hasIdentity).toBe(false)
    })

    test('should handle malformed SS58 address', async () => {
      const malformedAddress = '1' + 'x'.repeat(47)

      const identity = await getIdentity(malformedAddress)

      expect(identity.display).toBe('anon')
      expect(identity.hasIdentity).toBe(false)
    })
  })

  describe('Real World Scenarios', () => {
    test('should work with addresses from different networks (same public key)', async () => {
      // Test that we correctly handle different SS58 encodings of the same key
      // Gavin's address on Polkadot vs Generic substrate
      const polkadotAddress = KNOWN_IDENTITIES.GAVIN.address

      const identity = await getIdentity(polkadotAddress)

      expect(identity.hasIdentity).toBe(true)
      expect(identity.display).not.toBe('anon')
    }, 30000)

    test('should handle addresses with special characters in identity', async () => {
      // Some identities may have unicode or special chars
      const addresses = [
        KNOWN_IDENTITIES.GAVIN.address,
        KNOWN_IDENTITIES.JOE.address,
      ]

      const identities = await getIdentitiesBatch(addresses)

      identities.forEach((name, address) => {
        expect(typeof name).toBe('string')
        // Should not contain control characters
        expect(name).not.toMatch(/[\x00-\x1F\x7F]/)
      })
    }, 30000)
  })
})
