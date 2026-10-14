import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { ApplicationType } from '../types';
import { X, Upload, AlertCircle, Briefcase, Hospital, Compass, CheckCircle2 } from 'lucide-react';

interface CreateApplicationModalProps {
  initialType?: ApplicationType;
  onClose: () => void;
  onSuccess: (appId: string) => void;
}

export const CreateApplicationModal: React.FC<CreateApplicationModalProps> = ({
  initialType = 'OD',
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [type, setType] = useState<ApplicationType>(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common / OD fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [eventName, setEventName] = useState('');
  const [destination, setDestination] = useState('');
  const [additionalRemarks, setAdditionalRemarks] = useState('');

  // Leave fields
  const [leaveType, setLeaveType] = useState<'PERSONAL' | 'MEDICAL' | 'EMERGENCY' | 'OTHER'>('PERSONAL');
  const [reason, setReason] = useState('');
  const [contactNumber, setContactNumber] = useState(user?.phone || '');
  const [parentContact, setParentContact] = useState(user?.studentProfile?.parentPhone || '');

  // Outpass fields
  const [outpassType, setOutpassType] = useState<'DAY_OUT' | 'OVERNIGHT'>('DAY_OUT');
  const [departureTime, setDepartureTime] = useState('');
  const [expectedReturnTime, setExpectedReturnTime] = useState('');
  const [emergencyContact, setEmergencyContact] = useState(user?.studentProfile?.parentPhone || '');

  // File attachments
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  const isHosteller = user?.studentProfile?.isHosteller;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadFile(file);
      setAttachments((prev) => [
        ...prev,
        {
          fileName: res.fileName,
          originalName: res.originalName,
          fileSize: res.fileSize,
          mimeType: res.mimeType,
          storagePath: res.storagePath,
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'File upload failed. Only PDF, PNG, JPG under 5MB allowed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validations
    if (type === 'OD') {
      if (!startDate || !endDate || !purpose || !eventName || !destination) {
        setError('Please complete all required OD fields.');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setError('End date cannot be earlier than start date.');
        return;
      }
    } else if (type === 'LEAVE') {
      if (!startDate || !endDate || !reason) {
        setError('Please complete leave start date, end date, and reason.');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setError('End date cannot be earlier than start date.');
        return;
      }
    } else if (type === 'OUTPASS') {
      if (!isHosteller) {
        setError('Only hosteller students can submit hostel outpass requests.');
        return;
      }
      if (!departureTime || !expectedReturnTime || !destination || !reason) {
        setError('Departure time, expected return time, destination, and reason are required.');
        return;
      }
      if (new Date(departureTime) >= new Date(expectedReturnTime)) {
        setError('Expected return time must be strictly after departure time.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {
        type,
        attachments,
      };

      if (type === 'OD') {
        payload.startDate = new Date(startDate).toISOString();
        payload.endDate = new Date(endDate).toISOString();
        payload.purpose = purpose;
        payload.eventName = eventName;
        payload.destination = destination;
        payload.additionalRemarks = additionalRemarks;
      } else if (type === 'LEAVE') {
        payload.leaveType = leaveType;
        payload.startDate = new Date(startDate).toISOString();
        payload.endDate = new Date(endDate).toISOString();
        payload.reason = reason;
        payload.contactNumber = contactNumber;
        payload.parentContact = parentContact;
      } else if (type === 'OUTPASS') {
        payload.outpassType = outpassType;
        payload.departureTime = new Date(departureTime).toISOString();
        payload.expectedReturnTime = new Date(expectedReturnTime).toISOString();
        payload.destination = destination;
        payload.reason = reason;
        payload.emergencyContact = emergencyContact;
      }

      const created = await api.createApplication(payload);
      onSuccess(created.id);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">New Permission Request</h3>
            <p className="text-xs text-slate-400">
              Submit an application for server-enforced multi-stage review
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('OD')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                type === 'OD'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>On Duty (OD)</span>
            </button>

            <button
              type="button"
              onClick={() => setType('LEAVE')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                type === 'LEAVE'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Hospital className="w-4 h-4" />
              <span>Leave Permission</span>
            </button>

            <button
              type="button"
              onClick={() => setType('OUTPASS')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                type === 'OUTPASS'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Hostel Outpass</span>
            </button>
          </div>

          {/* Student Profile pill preview */}
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Applicant: <strong>{user?.name}</strong> ({user?.studentProfile?.studentId})
            </span>
            <span>
              Dept: {user?.studentProfile?.department?.code} | Class: {user?.studentProfile?.class?.name}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type 1: OD Fields */}
          {type === 'OD' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event / Activity Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. National Technical Symposium 2026"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purpose / Activity Nature *
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Purpose...</option>
                    <option value="Workshop & Training">Workshop & Training</option>
                    <option value="Hackathon Competition">Hackathon Competition</option>
                    <option value="Paper Presentation">Paper Presentation</option>
                    <option value="Sports Tournament">Sports Tournament</option>
                    <option value="Internship Interview">Internship Interview</option>
                    <option value="College Representation">College Representation</option>
                    <option value="Other Academic Duty">Other Academic Duty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination / Venue *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IIT Madras Research Park, Chennai"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    OD Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    OD End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Remarks / Team Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Representing college in national round team of 4"
                  value={additionalRemarks}
                  onChange={(e) => setAdditionalRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Type 2: LEAVE Fields */}
          {type === 'LEAVE' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Leave Type *
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e: any) => setLeaveType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="PERSONAL">Personal Leave</option>
                    <option value="MEDICAL">Medical Leave</option>
                    <option value="EMERGENCY">Emergency Family Leave</option>
                    <option value="OTHER">Other Academic Reason</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Leave Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Leave End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent / Guardian Contact Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98111 22233"
                  value={parentContact}
                  onChange={(e) => setParentContact(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Leave *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specify clear medical, emergency, or personal reasons..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Type 3: OUTPASS Fields */}
          {type === 'OUTPASS' && (
            <>
              {!isHosteller ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  <strong>Notice:</strong> You are currently enrolled as a Day Scholar. Hostel Outpasses can only be requested by hosteller students assigned to a campus hostel.
                </div>
              ) : (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between">
                    <span>
                      Hostel Residence: <strong>{user?.studentProfile?.hostel?.name || 'Assigned Hostel'}</strong> (Room {user?.studentProfile?.roomNumber || 'N/A'})
                    </span>
                    <span className="font-semibold text-blue-700">Sequence: Advisor → HOD → Warden</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Outpass Nature *
                      </label>
                      <select
                        value={outpassType}
                        onChange={(e: any) => setOutpassType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="DAY_OUT">Day Out (Return before curfew)</option>
                        <option value="OVERNIGHT">Overnight (Hometown / Weekend)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Emergency Contact Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98111 22233"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Departure Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Expected Return Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={expectedReturnTime}
                        onChange={(e) => setExpectedReturnTime(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Destination Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hometown address or city destination"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Leaving *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Explain purpose of outpass..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Attachments Section */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supporting Document (Optional for Leave / OD invitation, PDF/PNG/JPG)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>{uploading ? 'Uploading...' : 'Attach Document'}</span>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {attachments.map((att, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 rounded-lg"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="truncate max-w-[140px]">{att.originalName}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Workflow Sequence Note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
            <strong>Server Enforced Workflow:</strong> Your request will proceed in sequence:{' '}
            <span className="font-semibold text-blue-700">
              Student → Class Advisor → HOD {type === 'OUTPASS' || isHosteller ? '→ Warden' : ''}
            </span>
            . Rejections stop the process immediately.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (type === 'OUTPASS' && !isHosteller)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 transition"
            >
              {loading ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
