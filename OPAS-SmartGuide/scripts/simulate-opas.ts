// Plays the part of Simulated OPAS so you can watch SmartGuide react.
//
// Run from OPAS-SmartGuide:
//   npm run simulate:opas -- payment OPAS-2026-001
//   npm run simulate:opas -- submit  OPAS-2026-001
//   npm run simulate:opas -- revert  OPAS-2026-001
//
// Use an application reference already known to SmartGuide. The sample
// OPAS-2026-001 is present in the demo data. Payment creates a unique transaction.
// Needs OPAS_INTEGRATION_SECRET (same value as the SmartGuide server) and
// optionally SMARTGUIDE_URL. SmartGuide defaults to port 3001 in this project.
import { config } from 'dotenv';
import { sendApplicationEvent, sendPaymentEvent } from '../src/server/opasClient.ts';

config({ path: '.env.local' });
config();

const [command, applicationReference] = process.argv.slice(2);
const secret = process.env.OPAS_INTEGRATION_SECRET?.trim();
const baseUrl = process.env.SMARTGUIDE_URL?.trim() || 'http://localhost:3001';

if (!secret || secret.length < 32 || !command || !applicationReference) {
  console.error('Usage: npm run simulate:opas -- <payment|submit|revert> <applicationReference>');
  if (!secret || secret.length < 32) console.error('Set OPAS_INTEGRATION_SECRET to the same value used by the SmartGuide server (at least 32 characters).');
  process.exit(1);
}

const stamp = Date.now().toString().slice(-8);
let result;

try {
  if (command === 'payment') {
    result = await sendPaymentEvent(baseUrl, secret, {
      applicantId: 'APP-001',
      applicationReference,
      transactionReference: `ZP-${stamp}`,
      paymentReferenceNumber: `PRN-2026-${stamp.slice(-5)}`,
      amount: 500,
      currency: 'ZMW',
      paymentStatus: 'SUCCESSFUL',
      paymentDate: new Date().toISOString(),
      applicationStatus: 'PAID_NOT_SUBMITTED',
      gatewayConfirmation: 'CONFIRMED',
      opasAcknowledgementReference: `OPAS-ACK-${stamp}`,
    });
  } else if (command === 'submit' || command === 'revert') {
    result = await sendApplicationEvent(baseUrl, secret, {
      applicationReference,
      applicationStatus: command === 'submit' ? 'SUBMITTED' : 'REVERTED',
      ...(command === 'revert' ? { officerComment: 'Please upload a clearer copy of your NRC.' } : {}),
    });
  } else {
    console.error(`Unknown command "${command}". Use payment, submit or revert.`);
    process.exit(1);
  }

  console.log(`SmartGuide HTTP ${result.status}`);
  console.log(JSON.stringify(result.body, null, 2));
  if (result.status < 200 || result.status >= 300) process.exitCode = 1;
} catch (error) {
  console.error('Could not send the event to SmartGuide:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
