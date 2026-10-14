import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Application } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import { PrintablePass } from '../components/PrintablePass';
import {
  X,
  Printer,
  CheckCircle,
  XCircle,
  ArrowLeftCircle,
  RotateCcw,
  Ban,
  Download,
  AlertCircle,
  FileText,
  Clock,
  LogOut,
  LogIn,
} from 'lucide-react';

interface ApplicationDetailsModalProps {
  applicationId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
  applicationId,
  onClose,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog actions
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'RETURN' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPrintPass, setShowPrintPass] = useState(false);

  const fetchApp = async () => {
    setLoading(true);
    try {
      const data = await api.getApplication(applicationId);
      setApp(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load application details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApp();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
          <Clock className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Loading Application #{applicationId}...</span>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-2" />
          <h4 className="font-bold text-slate-900 mb-1">Access Restricted</h4>
          <p className="text-xs text-slate-500 mb-4">{error || 'Application not found'}</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Determine permissions for actions
  const isApplicant = user?.id === app.applicantId;
  const isCurrentStageApprover =
    user &&
    user.role === app.currentStage &&
    !isApplicant && // Prevent self-approval
    ['PENDING_CLASS_ADVISOR', 'PENDING_HOD', 'PENDING_WARDEN'].includes(app.status);

  const canCancel = isApplicant && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(app.status);
  const canResubmit = isApplicant && app.status === 'RETURNED_FOR_CORRECTION';
  const canPrintPass = app.status === 'APPROVED' || app.status === 'OUTPASS_ISSUED' || app.status === 'RETURNED_TO_HOSTEL';
  const isWardenOrAdmin = user?.role === 'WARDEN' || user?.role === 'ADMIN';

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await api.approveApplication(app.id, remarks);
      setActionType(null);
      setRemarks('');
      await fetchApp();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      alert('A mandatory rejection reason is required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.rejectApplication(app.id, remarks);
      setActionType(null);
      setRemarks('');
      await fetchApp();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!remarks.trim()) {
      alert('Correction remarks are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.returnApplication(app.id, remarks);
      setActionType(null);
      setRemarks('');
      await fetchApp();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!confirm('Confirm resubmission of this application with updated corrections?')) return;
    try {
      await api.resubmitApplication(app.id);
      await fetchApp();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this application?')) return;
    try {
      await api.cancelApplication(app.id);
      await fetchApp();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOutpassAction = async (action: 'OUTPASS_ISSUED' | 'RETURNED_TO_HOSTEL') => {
    try {
      await api.outpassAction(app.id, action);
      await fetchApp();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (showPrintPass) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="my-8 max-w-3xl w-full">
          <PrintablePass application={app} onClose={() => setShowPrintPass(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              {app.type}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{app.applicationNumber}</h3>
                <StatusBadge status={app.status} size="sm" />
              </div>
              <p className="text-xs text-slate-400">
                Submitted on {new Date(app.createdAt).toLocaleString()} by {app.studentName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canPrintPass && (
              <button
                onClick={() => setShowPrintPass(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Pass</span>
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Tabs / Sections */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Student Profile Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Name</span>
              <span className="font-semibold text-slate-800">{app.studentName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Register Number</span>
              <span className="font-mono font-semibold text-slate-800">{app.studentRegNo}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
              <span className="font-semibold text-slate-800">{app.departmentName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Class & Section</span>
              <span className="font-semibold text-slate-800">{app.className}</span>
            </div>
            {app.hostelName && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Hostel Residence</span>
                <span className="font-semibold text-blue-700">{app.hostelName}</span>
              </div>
            )}
            {app.applicant?.phone && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Contact</span>
                <span className="font-mono text-slate-800">{app.applicant.phone}</span>
              </div>
            )}
          </div>

          {/* Request Details */}
          <div className="border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {app.type === 'OD'
                ? 'On Duty (OD) Activity Particulars'
                : app.type === 'LEAVE'
                ? 'Leave Request Details'
                : 'Hostel Outpass Information'}
            </h4>

            {app.type === 'OD' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Event / Activity:</span>
                  <span className="font-bold text-slate-800 text-sm">{app.eventName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Duty Nature:</span>
                  <span className="font-semibold text-slate-800">{app.purpose}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Dates:</span>
                  <span className="font-semibold text-slate-800">
                    {app.startDate ? new Date(app.startDate).toLocaleDateString() : ''} to{' '}
                    {app.endDate ? new Date(app.endDate).toLocaleDateString() : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Venue / Destination:</span>
                  <span className="font-semibold text-slate-800">{app.destination}</span>
                </div>
                {app.additionalRemarks && (
                  <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block mb-0.5">Remarks:</span>
                    <span className="text-slate-700">{app.additionalRemarks}</span>
                  </div>
                )}
              </div>
            )}

            {app.type === 'LEAVE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Leave Category:</span>
                  <span className="font-bold text-slate-800 text-sm">{app.leaveType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Leave Duration:</span>
                  <span className="font-semibold text-slate-800">
                    {app.startDate ? new Date(app.startDate).toLocaleDateString() : ''} to{' '}
                    {app.endDate ? new Date(app.endDate).toLocaleDateString() : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Parent / Guardian Contact:</span>
                  <span className="font-mono font-semibold text-slate-800">{app.parentContact || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Student Contact:</span>
                  <span className="font-mono font-semibold text-slate-800">{app.contactNumber || 'N/A'}</span>
                </div>
                <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block mb-0.5">Reason for Absence:</span>
                  <span className="text-slate-800">{app.reason}</span>
                </div>
              </div>
            )}

            {app.type === 'OUTPASS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Outpass Type:</span>
                  <span className="font-bold text-slate-800 text-sm">{app.outpassType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Emergency Contact:</span>
                  <span className="font-mono font-bold text-slate-800">{app.emergencyContact}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Departure Date & Time:</span>
                  <span className="font-semibold text-slate-800">
                    {app.departureTime ? new Date(app.departureTime).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Expected Return Deadline:</span>
                  <span className="font-semibold text-rose-800">
                    {app.expectedReturnTime ? new Date(app.expectedReturnTime).toLocaleString() : 'N/A'}
                  </span>
                </div>
                {app.actualReturnTime && (
                  <div className="sm:col-span-2 p-2 bg-teal-50 border border-teal-200 rounded-lg text-teal-900">
                    <span className="font-bold">Actual Hostel Return Recorded:</span>{' '}
                    {new Date(app.actualReturnTime).toLocaleString()}{' '}
                    {app.isOverdue && <span className="text-rose-600 font-bold">(Returned Overdue)</span>}
                  </div>
                )}
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">Destination Address:</span>
                  <span className="font-medium text-slate-800">{app.destination}</span>
                </div>
                <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block mb-0.5">Reason:</span>
                  <span className="text-slate-800">{app.reason}</span>
                </div>
              </div>
            )}

            {/* Attachments */}
            {app.attachments && app.attachments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">
                  Supporting Documents
                </span>
                <div className="flex flex-wrap gap-2">
                  {app.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`/api/uploads/${att.fileName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>{att.originalName}</span>
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4-Stage Approval Timeline */}
          <div className="border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Mandatory Approval Workflow (Server-Enforced)
            </h4>
            <Timeline application={app} />
          </div>

          {/* Approver Action Prompt / Action Form */}
          {actionType && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs text-slate-900 uppercase">
                  {actionType === 'APPROVE'
                    ? 'Confirm Approval'
                    : actionType === 'REJECT'
                    ? 'Mandatory Rejection'
                    : 'Return for Correction'}
                </h5>
                <button onClick={() => setActionType(null)} className="text-xs text-slate-500 hover:text-slate-800">
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-700 font-semibold mb-1">
                  {actionType === 'REJECT'
                    ? 'Rejection Reason (Mandatory) *'
                    : actionType === 'RETURN'
                    ? 'Correction Instructions (Mandatory) *'
                    : 'Remarks (Optional)'}
                </label>
                <textarea
                  rows={2}
                  required={actionType !== 'APPROVE'}
                  placeholder={
                    actionType === 'REJECT'
                      ? 'State clear regulatory reason for rejection...'
                      : actionType === 'RETURN'
                      ? 'Specify what documents or fields the student must correct...'
                      : 'Add any approver remarks...'
                  }
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={
                    actionType === 'APPROVE'
                      ? handleApprove
                      : actionType === 'REJECT'
                      ? handleReject
                      : handleReturn
                  }
                  className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : actionType === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {submitting ? 'Processing...' : `Confirm ${actionType}`}
                </button>
              </div>
            </div>
          )}

          {/* Action Button Bar */}
          {!actionType && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {/* Approver Actions */}
                {isCurrentStageApprover && (
                  <>
                    <button
                      onClick={() => setActionType('APPROVE')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve Request</span>
                    </button>

                    <button
                      onClick={() => setActionType('REJECT')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>

                    {user?.role !== 'WARDEN' && (
                      <button
                        onClick={() => setActionType('RETURN')}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
                      >
                        <ArrowLeftCircle className="w-4 h-4" />
                        <span>Return for Correction</span>
                      </button>
                    )}
                  </>
                )}

                {/* Warden Gate Actions for Approved Outpass */}
                {isWardenOrAdmin && app.type === 'OUTPASS' && app.status === 'APPROVED' && (
                  <button
                    onClick={() => handleOutpassAction('OUTPASS_ISSUED')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Confirm Gate Exit (Issue Outpass)</span>
                  </button>
                )}

                {isWardenOrAdmin &&
                  app.type === 'OUTPASS' &&
                  (app.status === 'OUTPASS_ISSUED' || app.status === 'OVERDUE_RETURN') && (
                    <button
                      onClick={() => handleOutpassAction('RETURNED_TO_HOSTEL')}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Record Return to Hostel</span>
                    </button>
                  )}

                {/* Student Actions */}
                {canResubmit && (
                  <button
                    onClick={handleResubmit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Resubmit Corrected Request</span>
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Cancel Request</span>
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
