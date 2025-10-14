/**
 * Test account fixtures
 * These are real accounts on Polkadot with known states
 */

export const KNOWN_IDENTITIES = {
  // Gavin Wood - founder of Polkadot
  GAVIN: {
    address: '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5',
    expectedName: 'Gavin Wood', // Actual identity on People chain
  },

  // Joe Petrowski - Parity Technologies
  JOE: {
    address: '1363HWTPzDrzAQ6ChFiMU6mP4b6jmQid2ae55JQcKtZnpLGv',
    expectedName: 'Joe Petrowski',
  },

  // Bill Laboon - Web3 Foundation
  BILL: {
    address: '1363HWTPzDrzAQ6ChFiMU6mP4b6jmQid2ae55JQcKtZnpLGv',
    expectedName: 'Bill Laboon',
  },
}

export const TEST_WALLETS = {
  ALICE: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    seed: '//Alice',
    name: 'Alice'
,
  },

  BOB: {
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    seed: '//Bob',
    name: 'Bob',
  },

  CHARLIE: {
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    seed: '//Charlie',
    name: 'Charlie',
  },

  DAVE: {
    address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
    seed: '//Dave',
    name: 'Dave',
  },
}

// Account that definitely won't have identity set
export const RANDOM_ACCOUNT = {
  address: '16ZL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD',
  expectedName: 'anon',
}
