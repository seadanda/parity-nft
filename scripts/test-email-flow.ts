#!/usr/bin/env tsx
// Test the email verification flow locally

import { addToWhitelist, isEmailWhitelisted, createVerificationCode, verifyCode, createSession, validateSession } from '../frontend/src/lib/db';
import { sendVerificationEmail } from '../frontend/src/lib/email';

const TEST_EMAIL = 'test@parity.io';

async function testEmailFlow() {
  console.log('🧪 Testing Email Verification Flow');
  console.log('========================================\n');

  // Step 1: Add to whitelist
  console.log('1️⃣  Adding test email to whitelist...');
  try {
    addToWhitelist(TEST_EMAIL, 'Test User', 'Testing', 'Test account');
    console.log(`✅ Added ${TEST_EMAIL} to whitelist\n`);
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || err?.message?.includes('UNIQUE constraint')) {
      console.log(`⏭️  ${TEST_EMAIL} already in whitelist\n`);
    } else {
      throw err;
    }
  }

  // Step 2: Check whitelist
  console.log('2️⃣  Checking if email is whitelisted...');
  const whitelisted = isEmailWhitelisted(TEST_EMAIL);
  console.log(`✅ Whitelisted: ${whitelisted}\n`);

  if (!whitelisted) {
    console.error('❌ Email not whitelisted!');
    process.exit(1);
  }

  // Step 3: Generate and send verification code
  console.log('3️⃣  Generating verification code...');
  const code = createVerificationCode(TEST_EMAIL, '127.0.0.1', 'test-script');
  console.log(`✅ Generated code: ${code}\n`);

  console.log('4️⃣  Sending verification email...');
  await sendVerificationEmail(TEST_EMAIL, code);
  console.log('✅ Email sent (check console for preview URL)\n');

  // Step 4: Verify the code
  console.log('5️⃣  Verifying code...');
  const isValid = verifyCode(TEST_EMAIL, code);
  console.log(`✅ Code valid: ${isValid}\n`);

  if (!isValid) {
    console.error('❌ Code verification failed!');
    process.exit(1);
  }

  // Step 5: Create session
  console.log('6️⃣  Creating session...');
  const sessionToken = createSession(TEST_EMAIL, '127.0.0.1', 'test-script');
  console.log(`✅ Session token: ${sessionToken}\n`);

  // Step 6: Validate session
  console.log('7️⃣  Validating session...');
  const session = validateSession(sessionToken);
  console.log(`✅ Session valid: ${!!session}`);
  if (session) {
    console.log(`   Email: ${session.email}`);
    console.log(`   Name: ${session.name}\n`);
  }

  console.log('========================================');
  console.log('✅ All tests passed!');
  console.log('========================================\n');

  console.log('📝 Next steps:');
  console.log('1. Check the console output for Ethereal email preview URL');
  console.log('2. Open the preview URL in your browser to see the email');
  console.log('3. The verification code in the email should match:', code);
  console.log('');
}

testEmailFlow().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
