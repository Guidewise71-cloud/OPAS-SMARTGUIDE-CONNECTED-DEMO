# Reverted / paid-unsubmitted follow-up: what changed

| Gap | Fix | Where |
|---|---|---|
| Repeated reminders did not run on their own | The SmartGuide server scheduler now wakes every `REMINDER_INTERVAL_MINUTES` (default 60) and **really sends** reminders: Twilio SMS, then Resend email, then the OPAS Message Board as a guaranteed fallback. A reminder is marked `Sent` only when a provider accepted it; failures are recorded with the reason. Rule cooldowns and maximums (reverted: daily, up to 4) still apply. If `N8N_REMINDER_WEBHOOK_URL` is set, every status change is forwarded to the n8n *OPAS Reminder Engine* (signed), which then owns SMS/email, delivery receipts and officer escalation; the server only posts Message Board copies so nothing is sent twice. | `src/server/followup.ts`, `src/server/reminderDispatch.ts` (hooked into `server.ts`) |
| No direct link to the reverted application / field | Every reminder contains `OPAS_PUBLIC_URL/?application=REF&action=fix&field=photo`. The officer comment is mapped to a field (photo, NRC, birth certificate, guarantor, personal/contact details, travel history, declaration). Simulated OPAS keeps the link through login, opens that application at the right step, scrolls to and highlights the field, and shows "What to fix: ...". | `src/utils/correctionLinks.ts`, `Simulated-OPAS/src/utils/deepLink.ts`, `Simulated-OPAS/src/App.tsx` |
| No clear confirmation after resubmitting | Reverted applications now have a **RESUBMIT** button (Simulated OPAS, documents and review steps). Success is shown only after the server confirms it: green "RESUBMITTED SUCCESSFULLY" with confirmation number and time; otherwise a red "NOT RESUBMITTED" with the reason. SmartGuide is told via a signed `SUBMITTED` event, reminders stop, and the applicant gets an in-app "Resubmission received" message. The SmartGuide citizen portal resubmit works the same way (`POST /api/applications/status-events`), and duplicate resubmissions are answered with "already submitted". | `Simulated-OPAS/src/components/ResubmitPanel.tsx`, `vite.config.ts` (`/api/opas/resubmit`), `CitizenPortal.tsx` |
| Flag cases left in Reverted too long | Already present (Action Queue HIGH / CRITICAL after 8 days). The n8n engine additionally escalates after 14 days and emails a daily officer digest. | unchanged |
| No live handover to an officer | "Talk to an officer" in the AI assistant opens a live conversation (the AI transcript is passed along). Officers see waiting applicants, oldest first, at the top of **Action Queue**, reply in real time, and close when resolved. Replies also land in the applicant's OPAS messages. | `LiveOfficerHandover.tsx`, `LiveHelpQueue.tsx`, `/api/support/handovers*` in `followup.ts`, `handoverStore.ts` |

Also fixed: `saveApplicantMessage` crashed when `readAt` was not supplied (affected the payment-return notice too).

## Configure
See the new block at the end of `OPAS-SmartGuide/.env.example`. To use the n8n engine set
`N8N_REMINDER_WEBHOOK_URL=https://giv-en.app.n8n.cloud/webhook/opas-reminder-status-event` (after the workflow is published).

## Applying this branch
New files are committed directly. Edits to existing (large) files are in `patches/followup-existing-files.patch`
because they are too big to upload file-by-file. From the repo root:

```bash
git fetch origin
git checkout fix/followup-reminders-deeplinks-handover
git apply patches/followup-existing-files.patch
git rm -q patches/followup-existing-files.patch
git add -A && git commit -m "Apply follow-up edits to existing files" && git push
cd OPAS-SmartGuide && npm test     # 88 tests
```
