import React from 'react';
import { Application } from '../types';
import { CheckCircle2, Clock, XCircle, ArrowLeftCircle, User, ShieldCheck } from 'lucide-react';

interface TimelineProps {
  application: Application;
}

export const Timeline: React.FC<TimelineProps> = ({ application }) => {
  const steps = application.approvalSteps || [];
  const history = application.approvalHistory || [];

  const requiresWarden = application.type === 'OUTPASS' || steps.some((s) => s.stage === 'WARDEN');

  // Stage 1: Student
  const studentHistory = history.find((h) => h.action === 'SUBMITTED' || h.action === 'RESUBMITTED');

  // Stage 2: Advisor
  const advisorStep = steps.find((s) => s.stage === 'CLASS_ADVISOR');
  const advisorHistory = history.find((h) => h.actorRole === 'CLASS_ADVISOR');

  // Stage 3: HOD
  const hodStep = steps.find((s) => s.stage === 'HOD');
  const hodHistory = history.find((h) => h.actorRole === 'HOD');

  // Stage 4: Warden
  const wardenStep = steps.find((s) => s.stage === 'WARDEN');
  const wardenHistory = history.find((h) => h.actorRole === 'WARDEN');

  interface StageDisplay {
    id: string;
    title: string;
    role: string;
    state: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'REJECTED' | 'RETURNED';
    actorName?: string;
    timestamp?: string;
    remarks?: string;
  }

  const stageList: StageDisplay[] = [
    {
      id: 'STUDENT',
      title: 'Student Submission',
      role: 'Student',
      state: 'COMPLETED',
      actorName: application.studentName,
      timestamp: studentHistory?.createdAt || application.createdAt,
      remarks: studentHistory?.remarks || 'Application submitted',
    },
    {
      id: 'CLASS_ADVISOR',
      title: 'Class Advisor Review',
      role: 'Class Advisor',
      state:
        advisorStep?.status === 'APPROVED'
          ? 'COMPLETED'
          : advisorStep?.status === 'REJECTED'
          ? 'REJECTED'
          : advisorStep?.status === 'RETURNED'
          ? 'RETURNED'
          : application.currentStage === 'CLASS_ADVISOR'
          ? 'ACTIVE'
          : 'PENDING',
      actorName: advisorHistory?.actorName,
      timestamp: advisorStep?.actionAt || advisorHistory?.createdAt,
      remarks: advisorStep?.remarks || advisorHistory?.remarks,
    },
    {
      id: 'HOD',
      title: 'Head of Department (HOD)',
      role: 'HOD',
      state:
        hodStep?.status === 'APPROVED'
          ? 'COMPLETED'
          : hodStep?.status === 'REJECTED'
          ? 'REJECTED'
          : hodStep?.status === 'RETURNED'
          ? 'RETURNED'
          : application.currentStage === 'HOD'
          ? 'ACTIVE'
          : 'PENDING',
      actorName: hodHistory?.actorName,
      timestamp: hodStep?.actionAt || hodHistory?.createdAt,
      remarks: hodStep?.remarks || hodHistory?.remarks,
    },
  ];

  if (requiresWarden) {
    stageList.push({
      id: 'WARDEN',
      title: 'Hostel Warden Final Review',
      role: 'Hostel Warden',
      state:
        wardenStep?.status === 'APPROVED'
          ? 'COMPLETED'
          : wardenStep?.status === 'REJECTED'
          ? 'REJECTED'
          : application.currentStage === 'WARDEN'
          ? 'ACTIVE'
          : 'PENDING',
      actorName: wardenHistory?.actorName,
      timestamp: wardenStep?.actionAt || wardenHistory?.createdAt,
      remarks: wardenStep?.remarks || wardenHistory?.remarks,
    });
  }

  return (
    <div className="py-4">
      <div className="relative">
        <div className="space-y-6">
          {stageList.map((stage, idx) => {
            const isLast = idx === stageList.length - 1;

            const iconMap = {
              COMPLETED: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
              ACTIVE: <Clock className="w-5 h-5 text-sky-600 animate-spin" />,
              REJECTED: <XCircle className="w-5 h-5 text-rose-600" />,
              RETURNED: <ArrowLeftCircle className="w-5 h-5 text-orange-600" />,
              PENDING: <div className="w-3 h-3 rounded-full bg-slate-300" />,
            };

            const bgMap = {
              COMPLETED: 'bg-emerald-50 border-emerald-300',
              ACTIVE: 'bg-sky-50 border-sky-400 ring-2 ring-sky-200',
              REJECTED: 'bg-rose-50 border-rose-300',
              RETURNED: 'bg-orange-50 border-orange-300',
              PENDING: 'bg-slate-50 border-slate-200 text-slate-400',
            };

            return (
              <div key={stage.id} className="relative flex items-start group">
                {!isLast && (
                  <div
                    className={`absolute left-4 top-8 -ml-px w-0.5 h-full ${
                      stage.state === 'COMPLETED' ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                )}

                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border shadow-sm z-10 shrink-0 ${
                    bgMap[stage.state]
                  }`}
                >
                  {iconMap[stage.state]}
                </div>

                <div className="ml-4 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm font-semibold ${
                          stage.state === 'ACTIVE'
                            ? 'text-sky-900'
                            : stage.state === 'REJECTED'
                            ? 'text-rose-900'
                            : 'text-slate-800'
                        }`}
                      >
                        {stage.title}
                      </h4>
                      {stage.state === 'ACTIVE' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800">
                          Current Stage
                        </span>
                      )}
                    </div>
                    {stage.timestamp && (
                      <span className="text-xs text-slate-500 mt-1 sm:mt-0">
                        {new Date(stage.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {stage.actorName ? (
                        <>
                          <strong className="text-slate-700">{stage.actorName}</strong> (
                          {stage.role})
                        </>
                      ) : stage.state === 'ACTIVE' ? (
                        <span className="text-sky-700 italic">Awaiting review from assigned {stage.role}</span>
                      ) : (
                        <span className="text-slate-400">Assigned {stage.role}</span>
                      )}
                    </span>
                  </div>

                  {stage.remarks && (
                    <div
                      className={`mt-2 p-2.5 rounded-lg text-xs border ${
                        stage.state === 'REJECTED'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : stage.state === 'RETURNED'
                          ? 'bg-orange-50 border-orange-200 text-orange-800'
                          : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                      }`}
                    >
                      <span className="font-semibold block mb-0.5">
                        {stage.state === 'REJECTED'
                          ? 'Mandatory Rejection Reason:'
                          : stage.state === 'RETURNED'
                          ? 'Correction Feedback:'
                          : 'Approver Remarks:'}
                      </span>
                      {stage.remarks}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {application.status === 'APPROVED' && (
        <div className="mt-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-medium">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            Multi-stage approval sequence completed. Permission pass is authorized and active.
          </span>
        </div>
      )}
    </div>
  );
};
