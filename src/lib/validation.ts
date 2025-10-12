import { z } from 'zod';

// Polkadot SS58 address validation
// SS58 addresses start with specific characters and have specific lengths
const SS58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/;

export const mintFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(SS58_REGEX, 'Please enter a valid Polkadot wallet address')
});

export type MintFormData = z.infer<typeof mintFormSchema>;
