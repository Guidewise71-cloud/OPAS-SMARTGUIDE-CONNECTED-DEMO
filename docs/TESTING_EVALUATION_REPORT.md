# OPAS SmartGuide - Testing and Evaluation Report

Scope: this repo (main). Static review plus automated checks run 2026-11-11. The apps were not run end to end and the UI was not exercised. This is a local simulated prototype, not the official Zambia OPAS.

## 1. Automated results (after fixes)
- Unit tests (vitest): 59/59 pass, 11 files.
- Production build (vite build): succeeds.
- Type check (tsc --noEmit): 0 errors. Before the fixes there were 4 errors: supervisor role mismatch, missing `Clock3` import in CitizenPortal.tsx, and missing `escalationDays` on ReminderRule. All are fixed.

## 2. Deliverable status
| Deliverable | Status | Evidence / gap |
|---|---|---|
| Applicant Guidance Assistant | Implemented | AIGuidanceChat, /api/assistant/chat, approved FAQs, provider fallback. Answer quality not measured. |
| Data Validation Module | Implemented, tested | validation.ts (5 tests), applicationErrorEngine.ts (19 tests). |
| Application Monitoring Module | Implemented, partly tested | Paid-but-unsubmitted tested. Reverted-case logic has no dedicated test. |
| Automated Notification Prototype | Partial | Rules, bulk run, inbox, Resend code. Monitor follow-ups are logged, not delivered. Email delivery unverified. |
| Operational Intelligence Dashboard | Implemented, data source unverified | Officer, supervisor and admin dashboards exist. Whether figures are live or mock is not confirmed. |
| Testing and Evaluation Report | This document | Contains no measured accuracy or pilot results. See limitations. |

## 3. Key findings
1. `/api/responsible-ai/accuracy-tests` returns fixed values and runs no tests. The response is now flagged `illustrative: true` with a note. Do not cite it as measured accuracy.
2. PilotEvaluationReport.tsx shows illustrative figures only. It now carries an "Illustrative figures only" banner and the badge reads "Illustrative pilot view". No pilot data exists in the repo.
3. All integrations use simulated data. Nothing was tested against official OPAS, a payment gateway or real applicants.
4. Authentication is prototype-only.

## 4. Limitations
Simulated data. No usability testing with real users or officers. No accuracy measurement on labelled data. Email delivery unconfirmed. No production security review.

## 5. Recommended next steps
- Run a scripted scenario test (valid and invalid contacts, paid-unsubmitted, reverted) and record results.
- Measure assistant accuracy on a labelled question set.
- Run a small usability test with 3-5 staff and applicants; record task success and feedback.
- Test email delivery to a controlled inbox.
- Confirm whether the dashboards read live or mock data.
