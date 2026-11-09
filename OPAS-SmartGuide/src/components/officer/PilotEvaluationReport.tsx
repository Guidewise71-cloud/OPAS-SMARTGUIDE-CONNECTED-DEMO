import React from 'react';
import { ShieldCheck, TrendingUp } from 'lucide-react';

export const PilotEvaluationReport: React.FC = () => {
  return (
    <div className="space-y-6 text-slate-200">
      {/* Governance & Sponsorship Header with low contrast slate */}
      <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#33425a] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              MoHAIS Operational Intelligence &amp; SLA Evaluation Initiative
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-1">
              Pilot Evaluation Framework &amp; Operational Metrics
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Operational Performance Evaluation and Baseline Metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Pilot Active (Week 4 of 6)
            </span>
          </div>
        </div>

        {/* Stakeholder Roles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 text-sm">
          <div className="p-4 bg-[#18202c] rounded-xl border border-[#33425a]">
            <div className="text-slate-400 text-xs font-medium">Executive Sponsor</div>
            <div className="font-bold text-slate-100 text-sm sm:text-base mt-1">Permanent Secretary</div>
            <div className="text-xs text-slate-400 mt-0.5">Ministry of Home Affairs &amp; Internal Security</div>
          </div>
          <div className="p-4 bg-[#18202c] rounded-xl border border-[#33425a]">
            <div className="text-slate-400 text-xs font-medium">Programme Focal Point</div>
            <div className="font-bold text-slate-100 text-sm sm:text-base mt-1">Spriano Banda</div>
            <div className="text-xs text-slate-400 mt-0.5">Chief Systems Development Officer</div>
          </div>
          <div className="p-4 bg-[#18202c] rounded-xl border border-[#33425a]">
            <div className="text-slate-400 text-xs font-medium">Business Stakeholders</div>
            <div className="font-bold text-slate-100 text-sm sm:text-base mt-1">Passport Office Leadership</div>
            <div className="text-xs text-slate-400 mt-0.5">Vetting Officers &amp; Registry Administrators</div>
          </div>
          <div className="p-4 bg-[#18202c] rounded-xl border border-[#33425a]">
            <div className="text-slate-400 text-xs font-medium">Technical Stakeholders</div>
            <div className="font-bold text-slate-100 text-sm sm:text-base mt-1">MoHAIS ICT Department</div>
            <div className="text-xs text-slate-400 mt-0.5">OPAS Technical &amp; Data Administrators</div>
          </div>
        </div>
      </div>

      {/* Success Indicators Matrix with readable fonts */}
      <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Evaluation Indicators: Baseline vs. Pilot Results
          </h3>
          <p className="text-sm text-slate-300 mt-1">
            Technical validation findings comparing pre-pilot baseline with AI-assisted enhancement layer
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#33425a] bg-[#1a2332] text-slate-300 font-bold text-xs sm:text-sm uppercase tracking-wider">
                <th className="py-3.5 px-4">Evaluation Area</th>
                <th className="py-3.5 px-4">Primary Indicator</th>
                <th className="py-3.5 px-4">Baseline (Legacy OPAS)</th>
                <th className="py-3.5 px-4">Pilot Performance</th>
                <th className="py-3.5 px-4">Measurement Approach</th>
                <th className="py-3.5 px-4 text-right">Variance Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c394e] text-slate-200">
              <tr className="hover:bg-[#253247] transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-100">Contact Validation</td>
                <td className="py-3.5 px-4">Invalid phone / email formats flagged pre-submission</td>
                <td className="py-3.5 px-4 text-slate-400">18.6% delivery failure</td>
                <td className="py-3.5 px-4 font-bold text-emerald-400">1.8% failure (90% caught)</td>
                <td className="py-3.5 px-4 text-slate-300">RFC regex &amp; E.164 country code validator</td>
                <td className="py-3.5 px-4 text-right font-black text-emerald-400">-90.3% error rate</td>
              </tr>
              <tr className="hover:bg-[#253247] transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-100">Application Completion</td>
                <td className="py-3.5 px-4">Paid-but-unsubmitted cases detected &amp; prompted</td>
                <td className="py-3.5 px-4 text-slate-400">Avg. 22 days dormant</td>
                <td className="py-3.5 px-4 font-bold text-emerald-400">Avg. 3.2 days to submit</td>
                <td className="py-3.5 px-4 text-slate-300">Automated workflow scan &amp; scheduled SMS</td>
                <td className="py-3.5 px-4 text-right font-black text-emerald-400">+85.4% velocity</td>
              </tr>
              <tr className="hover:bg-[#253247] transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-100">Reverted Case Management</td>
                <td className="py-3.5 px-4">Backlog clearance of ~1,500 outstanding reverted cases</td>
                <td className="py-3.5 px-4 text-slate-400">14% monthly resolution</td>
                <td className="py-3.5 px-4 font-bold text-emerald-400">58.6% monthly resolution</td>
                <td className="py-3.5 px-4 text-slate-300">Targeted reversion remedy notices with pre-check</td>
                <td className="py-3.5 px-4 text-right font-black text-emerald-400">+4.2x clearance rate</td>
              </tr>
              <tr className="hover:bg-[#253247] transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-100">Citizen Assistance</td>
                <td className="py-3.5 px-4">Guidance accuracy and self-service FAQ resolution</td>
                <td className="py-3.5 px-4 text-slate-400">100% manual officer enquiries</td>
                <td className="py-3.5 px-4 font-bold text-emerald-400">76.2% resolved via AI Assistant</td>
                <td className="py-3.5 px-4 text-slate-300">Approved MoHAIS FAQ grounding model</td>
                <td className="py-3.5 px-4 text-right font-black text-emerald-400">-76% manual volume</td>
              </tr>
              <tr className="hover:bg-[#253247] transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-100">Operational Efficiency</td>
                <td className="py-3.5 px-4">Passport officer hours on repetitive phone/counter queries</td>
                <td className="py-3.5 px-4 text-slate-400">3.5 hrs / officer / day</td>
                <td className="py-3.5 px-4 font-bold text-emerald-400">0.8 hrs / officer / day</td>
                <td className="py-3.5 px-4 text-slate-300">Weekly officer workload timesheet comparison</td>
                <td className="py-3.5 px-4 text-right font-black text-emerald-400">-77% time diverted</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
