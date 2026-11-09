// Standalone check of the Resend setup. Run with: npx tsx sendTest.ts
// Requires RESEND_API_KEY, NOTIFICATION_FROM_EMAIL and NOTIFICATION_TEST_RECIPIENT
// in .env.local. The test-recipient guard prevents accidental live applicant email.
import { config } from 'dotenv';
import { sendEmailViaResend, fetchResendDeliveryState } from './src/server/resendEmail.ts';

config({ path: '.env.local' });
config(); // also load .env when present; existing .env.local values take precedence

if (!process.env.NOTIFICATION_TEST_RECIPIENT?.trim()) {
  console.error('Safety stop: set NOTIFICATION_TEST_RECIPIENT in .env.local to an inbox you control.');
  process.exitCode = 1;
} else if (!process.env.RESEND_API_KEY?.trim() || !process.env.NOTIFICATION_FROM_EMAIL?.trim()) {
  console.error('Resend is not configured. Set RESEND_API_KEY and NOTIFICATION_FROM_EMAIL in .env.local.');
  process.exitCode = 1;
} else {
  const result = await sendEmailViaResend({
    to: 'john.banda@example.com', // redirected to NOTIFICATION_TEST_RECIPIENT while it is set
    subject: 'MoHAIS OPAS Reminder: Action Required',
    text: 'Dear John, your application requires correction. Please log in to OPAS to take action.',
  });
  console.log('send result:', result);

  if (result.ok) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('delivery state:', await fetchResendDeliveryState(result.providerMessageId));
  } else {
    process.exitCode = 1;
  }
}
