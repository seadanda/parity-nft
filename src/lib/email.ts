// Email service with Resend (production) and Ethereal (local testing)
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const USE_RESEND = IS_PRODUCTION || process.env.USE_RESEND === 'true';

// Resend client (production) - only instantiate if API key is provided
const resend = USE_RESEND && process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Ethereal account cache for local testing
let etherealAccount: { user: string; pass: string } | null = null;
let etherealTransporter: any = null;

async function getEtherealTransporter() {
  if (etherealTransporter) {
    return etherealTransporter;
  }

  // Create test account (cached)
  if (!etherealAccount) {
    try {
      console.log('Creating Ethereal test account...');
      etherealAccount = await nodemailer.createTestAccount();
      console.log('Ethereal account created:', etherealAccount.user);
    } catch (error) {
      console.warn('Failed to create Ethereal account, emails will be logged to console only:', error);
      return null;
    }
  }

  etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: etherealAccount.user,
      pass: etherealAccount.pass
    }
  });

  return etherealTransporter;
}

export async function sendVerificationEmail(email: string, code: string) {
  const subject = 'Your 10 Years of Parity NFT Verification Code';
  const greeting = 'Hey';
  const mintUrl = `${process.env.APP_URL || 'http://localhost:3000'}/mint`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .code-box {
      background: linear-gradient(135deg, #e81d64 0%, #7c3aed 100%);
      color: white;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      padding: 20px;
      text-align: center;
      border-radius: 8px;
      margin: 30px 0;
    }
    .info {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color: #e81d64; margin: 0;">10 Years of Parity</h1>
    <p style="color: #666; margin: 5px 0;">NFT Mint</p>
  </div>

  <p>${greeting},</p>

  <p>Congrats, you're on the list. Use the code below to mint your NFT:</p>

  <div class="code-box">${code}</div>

  <div class="info">
    <p style="margin: 0;"><strong>⏱️ This code expires in 10 minutes</strong></p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${mintUrl}" style="display: inline-block; background: #e81d64; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Mint Page</a>
  </div>

  <p>If you didn't request this code, you can safely ignore this email.</p>

  <div class="footer">
    <p>Parity Technologies</p>
    <p>10 Years of Building the Future</p>
  </div>
</body>
</html>
  `;

  const textContent = `
${greeting},

Congrats, you're on the list. Use the code below to mint your NFT:

${code}

This code expires in 10 minutes.

Go to the mint page: ${mintUrl}

If you didn't request this code, you can safely ignore this email.

--
Parity Technologies
10 Years of Building the Future
  `;

  if (USE_RESEND && resend) {
    // Production: Use Resend
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'nft@parity.io',
      to: email,
      subject,
      html: htmlContent,
      text: textContent
    });

    console.log('Email sent via Resend:', result);
    return result;
  } else {
    // Development: Use Ethereal or console fallback
    const transporter = await getEtherealTransporter();

    if (!transporter) {
      // Fallback: Just log to console
      console.log('\n========================================');
      console.log('📧 EMAIL (CONSOLE ONLY - Ethereal unavailable)');
      console.log('========================================');
      console.log('To:', email);
      console.log('Subject:', subject);
      console.log('Code:', code);
      console.log('========================================\n');
      return { messageId: 'console-only', previewUrl: null };
    }

    const info = await transporter.sendMail({
      from: '"10 Years of Parity NFT" <nft@parity.io>',
      to: email,
      subject,
      text: textContent,
      html: htmlContent
    });

    // Get preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log('\n========================================');
    console.log('📧 TEST EMAIL SENT');
    console.log('========================================');
    console.log('To:', email);
    console.log('Code:', code);
    console.log('Preview URL:', previewUrl);
    console.log('========================================\n');

    return { messageId: info.messageId, previewUrl };
  }
}

export async function sendAlreadyMintedEmail(email: string) {
  const subject = 'Don\'t Be Greedy 🙈';
  const greeting = 'Hey';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .message-box {
      background: linear-gradient(135deg, #e81d64 0%, #7c3aed 100%);
      color: white;
      font-size: 24px;
      font-weight: bold;
      padding: 40px 20px;
      text-align: center;
      border-radius: 12px;
      margin: 30px 0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color: #e81d64; margin: 0;">10 Years of Parity</h1>
    <p style="color: #666; margin: 5px 0;">NFT Mint</p>
  </div>

  <p>${greeting},</p>

  <div class="message-box">
    Don't be greedy - you've already minted yours! 🎉
  </div>

  <p>You've already claimed your 10 Years of Parity NFT. Each email address can only mint one NFT.</p>

  <p>Thanks for being part of Parity's 10-year journey!</p>

  <div class="footer">
    <p>Parity Technologies</p>
    <p>10 Years of Building the Future</p>
  </div>
</body>
</html>
  `;

  const textContent = `
${greeting},

Don't be greedy - you've already minted yours!

You've already claimed your 10 Years of Parity NFT. Each email address can only mint one NFT.

Thanks for being part of Parity's 10-year journey!

--
Parity Technologies
10 Years of Building the Future
  `;

  if (USE_RESEND && resend) {
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'nft@parity.io',
      to: email,
      subject,
      html: htmlContent,
      text: textContent
    });

    console.log('Already minted email sent via Resend:', result);
    return result;
  } else {
    const transporter = await getEtherealTransporter();

    if (!transporter) {
      console.log('\n========================================');
      console.log('📧 ALREADY MINTED EMAIL (CONSOLE ONLY)');
      console.log('========================================');
      console.log('To:', email);
      console.log('Subject:', subject);
      console.log('========================================\n');
      return { messageId: 'console-only', previewUrl: null };
    }

    const info = await transporter.sendMail({
      from: '"10 Years of Parity NFT" <nft@parity.io>',
      to: email,
      subject,
      text: textContent,
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log('\n========================================');
    console.log('📧 ALREADY MINTED EMAIL SENT');
    console.log('========================================');
    console.log('To:', email);
    console.log('Preview URL:', previewUrl);
    console.log('========================================\n');

    return { messageId: info.messageId, previewUrl };
  }
}

export async function sendMintSuccessEmail(
  email: string,
  nftId: number,
  tier: string,
  hash: string,
  name?: string
) {
  const subject = 'Your 10 Years of Parity NFT is Ready! 🎉';
  const greeting = name ? `Hi ${name}` : 'Hello';

  const viewerUrl = `${process.env.APP_URL || 'http://localhost:3000'}/view?hash=${hash}`;
  const subscanUrl = `https://assethub-polkadot.subscan.io/nft/${process.env.COLLECTION_ID}/${nftId}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .nft-info {
      background: linear-gradient(135deg, #e81d64 0%, #7c3aed 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      margin: 30px 0;
    }
    .tier {
      font-size: 36px;
      font-weight: bold;
      margin: 10px 0;
    }
    .links {
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background: #e81d64;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 5px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color: #e81d64; margin: 0;">Congratulations! 🎉</h1>
  </div>

  <p>${greeting},</p>

  <p>Your 10 Years of Parity NFT has been successfully minted!</p>

  <div class="nft-info">
    <p style="margin: 0; opacity: 0.9;">Tier</p>
    <div class="tier">${tier}</div>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">NFT #${nftId}</p>
  </div>

  <p>Your unique 3D glass Parity logo is ready to view:</p>

  <div class="links" style="text-align: center;">
    <a href="${viewerUrl}" class="button">View 3D NFT</a>
    <a href="${subscanUrl}" class="button">View on Subscan</a>
  </div>

  <p><strong>Your NFT Hash:</strong><br>
  <code style="background: #f5f5f5; padding: 5px 10px; border-radius: 4px; font-size: 12px; word-break: break-all;">${hash}</code></p>

  <p>This NFT is soulbound to your wallet and represents your connection to Parity's 10-year journey.</p>

  <div class="footer">
    <p>Parity Technologies</p>
    <p>10 Years of Building the Future</p>
  </div>
</body>
</html>
  `;

  const textContent = `
${greeting},

Your 10 Years of Parity NFT has been successfully minted!

Tier: ${tier}
NFT ID: ${nftId}

View your 3D NFT: ${viewerUrl}
View on Subscan: ${subscanUrl}

Your NFT Hash:
${hash}

This NFT is soulbound to your wallet and represents your connection to Parity's 10-year journey.

--
Parity Technologies
10 Years of Building the Future
  `;

  if (USE_RESEND && resend) {
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'nft@parity.io',
      to: email,
      subject,
      html: htmlContent,
      text: textContent
    });

    console.log('Mint success email sent via Resend:', result);
    return result;
  } else {
    const transporter = await getEtherealTransporter();

    if (!transporter) {
      console.log('\n========================================');
      console.log('📧 MINT SUCCESS EMAIL (CONSOLE ONLY)');
      console.log('========================================');
      console.log('To:', email);
      console.log('Tier:', tier);
      console.log('NFT ID:', nftId);
      console.log('Subject:', subject);
      console.log('========================================\n');
      return { messageId: 'console-only', previewUrl: null };
    }

    const info = await transporter.sendMail({
      from: '"10 Years of Parity NFT" <nft@parity.io>',
      to: email,
      subject,
      text: textContent,
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log('\n========================================');
    console.log('📧 MINT SUCCESS EMAIL SENT');
    console.log('========================================');
    console.log('To:', email);
    console.log('Tier:', tier);
    console.log('NFT ID:', nftId);
    console.log('Preview URL:', previewUrl);
    console.log('========================================\n');

    return { messageId: info.messageId, previewUrl };
  }
}
