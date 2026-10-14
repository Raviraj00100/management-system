import React from 'react';
import { Application } from '../types';
import { Printer, Shield, CheckCircle, QrCode } from 'lucide-react';

interface PrintablePassProps {
  application: Application;
  onClose?: () => void;
}

export const PrintablePass: React.FC<PrintablePassProps> = ({ application, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const advisorApproval = application.approvalSteps.find((s) => s.stage === 'CLASS_ADVISOR' && s.status === 'APPROVED');
  const hodApproval = application.approvalSteps.find((s) => s.stage === 'HOD' && s.status === 'APPROVED');
  const wardenApproval = application.approvalSteps.find((s) => s.stage === 'WARDEN' && s.status === 'APPROVED');

  return (
    <div className="bg-white p-6 sm:p-10 max-w-3xl mx-auto rounded-xl border border-slate-200 shadow-xl" id="printable-pass">
      {/* Top action bar - Hidden during print */}
      <div className="no-print flex items-center justify-between pb-6 mb-6 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Official Permission Pass</h3>
          <p className="text-xs text-slate-500">Authorized document for gate security and academic leave records</p>
        </div>
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Close
            </button>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Print Permission Slip
          </button>
        </div>
      </div>

      {/* Institutional Document Header */}
      <div className="border-2 border-slate-800 p-6 rounded-lg relative overflow-hidden bg-white">
        {/* Security Watermark Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
          <Shield className="w-96 h-96 text-slate-900" />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-blue-900 text-white rounded-lg flex items-center justify-center font-serif text-2xl font-bold shadow">
                CP
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-serif uppercase">
                  College of Engineering & Technology
                </h1>
                <p className="text-xs text-slate-600 font-medium">Autonomous Institution | Approved by AICTE & UGC</p>
                <div className="inline-block mt-1 bg-slate-900 text-white px-3 py-0.5 text-xs font-bold uppercase tracking-wider rounded">
                  {application.type === 'OUTPASS'
                    ? 'HOSTEL OUTPASS & GATE PASS'
                    : application.type === 'OD'
                    ? 'ON DUTY (OD) PERMISSION CERTIFICATE'
                    : 'STUDENT LEAVE PERMISSION PASS'}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Pass Number</div>
              <div className="text-base font-mono font-bold text-blue-900">{application.applicationNumber}</div>
              <div className="text-xs text-slate-500 mt-1 font-mono">
                Date: {new Date(application.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Student Profile Grid */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Student Name</span>
              <span className="font-bold text-slate-800 text-sm">{application.studentName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Register / Roll No.</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{application.studentRegNo}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Department</span>
              <span className="font-semibold text-slate-800">{application.departmentName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Class & Section</span>
              <span className="font-semibold text-slate-800">{application.className}</span>
            </div>

            {application.hostelName && (
              <>
                <div>
                  <span className="text-slate-500 block">Hostel Name</span>
                  <span className="font-semibold text-slate-800">{application.hostelName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Residential Status</span>
                  <span className="font-semibold text-blue-700">Hosteller Resident</span>
                </div>
              </>
            )}
            <div>
              <span className="text-slate-500 block">Current Status</span>
              <span className="font-bold text-emerald-700 uppercase">{application.status.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Permission Details */}
          <div className="border border-slate-200 rounded-lg p-4 mb-4 text-xs space-y-2">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide border-b pb-1">
              Permission Particulars
            </h4>

            {application.type === 'OUTPASS' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block">Outpass Type:</span>
                  <span className="font-bold text-slate-800">{application.outpassType || 'Day Out'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Scheduled Departure:</span>
                  <span className="font-semibold text-slate-800">
                    {application.departureTime ? new Date(application.departureTime).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Expected Return Deadline:</span>
                  <span className="font-semibold text-rose-800">
                    {application.expectedReturnTime ? new Date(application.expectedReturnTime).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">Destination:</span>
                  <span className="font-medium text-slate-800">{application.destination}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Emergency Contact:</span>
                  <span className="font-mono font-bold text-slate-800">{application.emergencyContact || 'N/A'}</span>
                </div>
                <div className="sm:col-span-3">
                  <span className="text-slate-500 block">Reason for Outpass:</span>
                  <span className="text-slate-700">{application.reason}</span>
                </div>
              </div>
            )}

            {application.type === 'OD' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block">Event / Activity:</span>
                  <span className="font-bold text-slate-800">{application.eventName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Duty Duration:</span>
                  <span className="font-semibold text-slate-800">
                    {application.startDate ? new Date(application.startDate).toLocaleDateString() : ''} to{' '}
                    {application.endDate ? new Date(application.endDate).toLocaleDateString() : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Venue / Destination:</span>
                  <span className="font-medium text-slate-800">{application.destination}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Purpose:</span>
                  <span className="font-medium text-slate-800">{application.purpose}</span>
                </div>
              </div>
            )}

            {application.type === 'LEAVE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block">Leave Category:</span>
                  <span className="font-bold text-slate-800">{application.leaveType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Leave Dates:</span>
                  <span className="font-semibold text-slate-800">
                    {application.startDate ? new Date(application.startDate).toLocaleDateString() : ''} to{' '}
                    {application.endDate ? new Date(application.endDate).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">Reason for Leave:</span>
                  <span className="text-slate-700">{application.reason}</span>
                </div>
              </div>
            )}
          </div>

          {/* Approvals & Digital Signatures Box */}
          <div className="grid grid-cols-3 gap-2 border-2 border-dashed border-slate-300 p-3 rounded-lg mb-4 text-center">
            {/* Advisor Signature */}
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Class Advisor</span>
              {advisorApproval ? (
                <div className="mt-1">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
                  <span className="text-[11px] font-bold text-slate-800 block mt-0.5">Digitally Approved</span>
                  <span className="text-[9px] text-slate-500 block">
                    {new Date(advisorApproval.actionAt || '').toLocaleString()}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic block mt-3">Pending / Not Required</span>
              )}
            </div>

            {/* HOD Signature */}
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Head of Department</span>
              {hodApproval ? (
                <div className="mt-1">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
                  <span className="text-[11px] font-bold text-slate-800 block mt-0.5">Digitally Approved</span>
                  <span className="text-[9px] text-slate-500 block">
                    {new Date(hodApproval.actionAt || '').toLocaleString()}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic block mt-3">Pending / Not Required</span>
              )}
            </div>

            {/* Warden Signature */}
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Hostel Warden</span>
              {wardenApproval ? (
                <div className="mt-1">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
                  <span className="text-[11px] font-bold text-slate-800 block mt-0.5">Digitally Approved</span>
                  <span className="text-[9px] text-slate-500 block">
                    {new Date(wardenApproval.actionAt || '').toLocaleString()}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic block mt-3">
                  {application.type === 'OUTPASS' ? 'Pending Approval' : 'Day Scholar / N/A'}
                </span>
              )}
            </div>
          </div>

          {/* QR Verification & Gate Security Footer */}
          <div className="flex items-center justify-between border-t border-slate-300 pt-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-slate-900 text-white rounded flex items-center justify-center p-1">
                <QrCode className="w-12 h-12" />
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Scan to Verify Authenticity</span>
                <span className="font-mono text-[10px] text-slate-500 block">Token: {application.qrCodeToken}</span>
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  Encrypted Digital Authorization
                </span>
              </div>
            </div>

            <div className="text-right border-l pl-4 border-slate-300">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Security Gate Check</span>
              <div className="flex gap-4 mt-1 text-[10px]">
                <div className="text-center">
                  <span className="block border-b border-slate-400 pb-1 w-20">Out: ______</span>
                  <span className="text-slate-400">Security Sign</span>
                </div>
                <div className="text-center">
                  <span className="block border-b border-slate-400 pb-1 w-20">In: ______</span>
                  <span className="text-slate-400">Security Sign</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
