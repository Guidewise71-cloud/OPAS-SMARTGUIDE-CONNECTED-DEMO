import { describe, expect, it } from 'vitest';
import { INITIAL_APPLICATIONS } from '../data/mockApplications';
import { buildDocumentIssueDetections } from './responsibleAIEngine';

describe('document issue detections', () => {
  it('uses rejected documents and reversion notes as evidence', () => {
    const detections = buildDocumentIssueDetections([INITIAL_APPLICATIONS[0]]);

    expect(detections.map((detection) => detection.issueCategory)).toContain('PHOTO');
    expect(detections.map((detection) => detection.issueCategory)).toContain('IDENTITY');
    expect(detections.every((detection) => detection.evidence.length > 0)).toBe(true);
    expect(detections.find((detection) => detection.issueCategory === 'PHOTO')?.evidenceCodes).toContain('DOCUMENT_REJECTED');
    expect(detections.find((detection) => detection.issueCategory === 'PHOTO')?.caseStage).toBe('REVERTED');
  });

  it('counts similar issues across distinct demo cases', () => {
    const first = INITIAL_APPLICATIONS[0];
    const second = {
      ...first,
      id: 'demo-case-copy',
      trackingNumber: 'DEMO-CASE-COPY',
    };

    const photoDetection = buildDocumentIssueDetections([first, second])
      .find((detection) => detection.applicationId === first.id && detection.issueCategory === 'PHOTO');

    expect(photoDetection?.similarCaseCount).toBe(2);
  });

  it('flags absent standard documents on draft applications', () => {
    const application = {
      ...INITIAL_APPLICATIONS[0],
      status: 'Draft' as const,
      reversionReason: undefined,
      revertedItems: [],
      documents: [],
    };
    const detections = buildDocumentIssueDetections([application]);

    expect(detections.map((detection) => detection.issueCategory)).toEqual(['PHOTO', 'IDENTITY']);
  });

  it('does not infer an issue for a non-draft without explicit evidence', () => {
    const application = {
      ...INITIAL_APPLICATIONS[0],
      status: 'Submitted - Under Review' as const,
      reversionReason: undefined,
      revertedItems: [],
      documents: [],
    };

    expect(buildDocumentIssueDetections([application])).toEqual([]);
  });
});
