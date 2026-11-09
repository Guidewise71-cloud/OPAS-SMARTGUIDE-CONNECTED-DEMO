import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  Shield,
  CheckCircle2,
  TrendingUp,
  Layers,
  Calendar,
  Lock,
  Building2,
  ExternalLink,
} from 'lucide-react';

interface EOIDocumentModalProps {
  onClose: () => void;
}

export const EOIDocumentModal: React.FC<EOIDocumentModalProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<'summary' | 'solution' | 'scope' | 'timeline' | 'governance'>('summary');

  const pdfUrl = '/assets/aistudio/AI_Powered_Passport_Assistance_OPAS_Intelligence_24b992ee.pdf';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between border-b border-emerald-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white shrink-0 shadow-xs">
              <FileText className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  UNIPODS AI for Public Good Challenge &bull; Expression of Interest (EOI)
                </h3>
                <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                  Official MoHAIS Doc
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                AI-Powered Passport Application Assistance and OPAS Intelligence &bull; Ministry of Home Affairs and Internal Security
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              download="AI_Powered_Passport_Assistance_OPAS_Intelligence.pdf"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'summary', label: '1. Executive Summary & Problem' },
            { id: 'solution', label: '2. Proposed 5-Layer AI Solution' },
            { id: 'scope', label: '3. Scope & Objectives' },
            { id: 'timeline', label: '4. 6-Month Roadmap & Deliverables' },
            { id: 'governance', label: '5. Governance & Stakeholders' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeSection === tab.id
                  ? 'border-emerald-600 text-emerald-800 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs leading-relaxed text-slate-700 flex-1">
          {activeSection === 'summary' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Proposal Mission &bull; Ministry of Home Affairs and Internal Security
                </span>
                <p className="text-xs text-emerald-950 font-medium">
                  &quot;The Ministry of Home Affairs and Internal Security (MoHAIS) proposes an AI-powered enhancement to the existing Online Passport Application System (OPAS) to improve the passport application experience for citizens and increase operational efficiency within the Passport Office.&quot;
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                  Key Problems Identified in Baseline OPAS:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="text-slate-900 block mb-0.5">1. Reverted Applications Backlog:</strong>
                    <span className="text-slate-600 text-[11px]">
                      Approximately 1,500 cases require further action from applicants, creating a significant follow-up burden on passport counters.
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="text-slate-900 block mb-0.5">2. Paid-but-Unsubmitted Applications:</strong>
                    <span className="text-slate-600 text-[11px]">
                      Applicants complete fees via the Government Payment Gateway but stall before final submission, leaving applications dormant.
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="text-slate-900 block mb-0.5">3. Invalid Contact Information:</strong>
                    <span className="text-slate-600 text-[11px]">
                      Incorrect mobile number formats and email typos prevent citizens from receiving collection alerts, resulting in unclaimed booklets.
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="text-slate-900 block mb-0.5">4. High Repetitive Enquiry Burden:</strong>
                    <span className="text-slate-600 text-[11px]">
                      Officers spend an average of 3.5 hours per day answering basic photo specifications and fee queries at counters and switchboards.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'solution' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Section 3: The 5 Functional Modules
              </h4>
              <div className="space-y-3">
                <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 text-xs">3.1 Applicant Guidance Assistant</span>
                  <p className="text-[11px] text-slate-600">
                    24/7 virtual assistant answering approved MoHAIS FAQs, explaining passport specifications, guiding through relevant stages, and clarifying why a case was reverted in plain language.
                  </p>
                </div>
                <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 text-xs">3.2 Contact &amp; Application Data Validation</span>
                  <p className="text-[11px] text-slate-600">
                    Automated pre-flight validation checking E.164 phone formats (+260), common email typos (@gamil.com, @outlok.com), and green NRC syntax (123456/78/1).
                  </p>
                </div>
                <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 text-xs">3.3 Incomplete &amp; Paid-but-Unsubmitted Detection</span>
                  <p className="text-[11px] text-slate-600">
                    Background surveillance detecting dormant applications with verified payments, prompting citizens to schedule biometrics and complete submission.
                  </p>
                </div>
                <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 text-xs">3.4 Automated Reminders &amp; Notifications</span>
                  <p className="text-[11px] text-slate-600">
                    Targeted SMS and OPAS Message Board notifications with 72-hour anti-spam intervals, ensuring citizens understand what remedy is needed without paying again.
                  </p>
                </div>
                <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 text-xs">3.5 Operational Intelligence Dashboard</span>
                  <p className="text-[11px] text-slate-600">
                    Consolidated view for Passport Office leadership and vetting officers showing national pipeline distribution, backlog clearance velocity, and bottleneck heatmaps.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'scope' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                  <span className="font-bold text-emerald-950 uppercase tracking-wide block flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    5.1 IN SCOPE (Pilot Focus)
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-emerald-900 text-[11px]">
                    <li>AI-powered virtual assistant and applicant support</li>
                    <li>Email and phone number format validation</li>
                    <li>Detection of incomplete and paid-but-unsubmitted applications</li>
                    <li>Automated reminders for reverted cases &amp; outstanding actions</li>
                    <li>OPAS message-board notifications &amp; delivery tracking</li>
                    <li>Operational intelligence dashboard for Passport Officers</li>
                    <li>Prototype testing, performance evaluation, and UNIPODS reporting</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wide block flex items-center gap-1.5">
                    <X className="w-4 h-4 text-slate-500" />
                    5.2 OUT OF SCOPE (Strict Safeguards)
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                    <li>Complete redevelopment or replacement of OPAS</li>
                    <li>Implementation of a national AI platform</li>
                    <li>Legislative or policy reforms</li>
                    <li>Procurement and deployment of full production system</li>
                    <li>Automated approval or rejection of passport applications</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Section 7: 6-Month Pilot Implementation Roadmap
              </h4>
              <div className="space-y-2">
                {[
                  { week: 'Week 1', title: 'Requirements & Baseline Assessment', desc: 'Confirm user needs, establish governance requirements, assess data availability, baseline 1,500 cases.' },
                  { week: 'Week 2', title: 'Data Preparation & System Design', desc: 'Prepare synthetic test datasets, define validation regex rules, design assistant knowledge base.' },
                  { week: 'Week 3-4', title: 'Prototype Development (Current Stage)', desc: 'Implement guidance assistant, validation logic, reminder engine, and operational dashboard.' },
                  { week: 'Week 5', title: 'Testing & Security Evaluation', desc: 'Test data protection, response quality, notification rules, and usability with passport officers.' },
                  { week: 'Week 6', title: 'Pilot Demonstration & Final Reporting', desc: 'Demonstrate prototype to MoHAIS executive team and submit UNIPODS report.' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
                    <span className="font-mono font-bold text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                      {item.week}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'governance' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Section 10: Stakeholder Roles &amp; Responsibilities
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Responsible Party</th>
                      <th className="py-2.5 px-3">Mandate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Executive Sponsor</td>
                      <td className="py-2.5 px-3">Permanent Secretary, MoHAIS</td>
                      <td className="py-2.5 px-3 text-slate-600">Overall institutional oversight &amp; approvals</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Programme Focal Point</td>
                      <td className="py-2.5 px-3">Spriano Banda</td>
                      <td className="py-2.5 px-3 text-slate-600">Chief Systems Development Officer</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Operational Stakeholders</td>
                      <td className="py-2.5 px-3">Passport Office</td>
                      <td className="py-2.5 px-3 text-slate-600">Vetting Officers, Adjudicators, Registrars</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Technical Stakeholders</td>
                      <td className="py-2.5 px-3">MoHAIS ICT Department</td>
                      <td className="py-2.5 px-3 text-slate-600">OPAS Technical &amp; Database Administrators</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-900 text-xs block">Key Governance Principle (Section 10.1):</span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  &quot;AI outputs support applicants and officers but do NOT replace authorised decision-makers. Final approval or rejection of passport dossiers remains strictly under human officer authority.&quot;
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Expression of Interest &bull; UNIPODS AI for Public Good Challenge</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-semibold cursor-pointer"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
};
