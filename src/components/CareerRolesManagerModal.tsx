import React, { useState } from 'react';
import { 
  X, Briefcase, ExternalLink, Plus, Check, Sparkles, 
  MapPin, IndianRupee, Users, Clock, HelpCircle, CheckCircle2,
  Trash2, Edit3, ShieldAlert
} from 'lucide-react';
import { CareerJobOpening } from '../types';
import { getSavedCareerOpenings, saveCareerOpenings } from '../data/careerRolesData';

interface CareerRolesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRolesUpdated?: (roles: CareerJobOpening[]) => void;
}

export const CareerRolesManagerModal: React.FC<CareerRolesManagerModalProps> = ({
  isOpen,
  onClose,
  onRolesUpdated,
}) => {
  const [roles, setRoles] = useState<CareerJobOpening[]>(getSavedCareerOpenings());
  const [selectedRole, setSelectedRole] = useState<CareerJobOpening>(roles[0] || null);
  const [isAddingRole, setIsAddingRole] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New role state form
  const [newTitle, setNewTitle] = useState('');
  const [newDepartment, setNewDepartment] = useState('Luxury Residential & Commercial Sales');
  const [newLocation, setNewLocation] = useState('6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram');
  const [newOpenings, setNewOpenings] = useState(5);
  const [newMinExp, setNewMinExp] = useState(2);
  const [newMaxExp, setNewMaxExp] = useState(6);
  const [newBudget, setNewBudget] = useState('₹8,00,000 - ₹15,00,000 PA Fixed');
  const [newOte, setNewOte] = useState('₹18,00,000 - ₹28,00,000 OTE');
  const [newStatus, setNewStatus] = useState<'Active' | 'Urgent' | 'Draft'>('Urgent');
  const [newExpLevel, setNewExpLevel] = useState<'Entry' | 'Mid' | 'Senior' | 'Leadership'>('Mid');

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveRoles = (updated: CareerJobOpening[]) => {
    setRoles(updated);
    saveCareerOpenings(updated);
    if (onRolesUpdated) onRolesUpdated(updated);
    showToast('Career job openings updated and synchronized with Arjun AI Recruiter.');
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newRoleObj: CareerJobOpening = {
      id: `wcr-role-${Date.now()}`,
      title: newTitle.trim(),
      code: `WCR-${newTitle.substring(0, 3).toUpperCase()}-2026`,
      department: newDepartment,
      location: newLocation,
      openingsCount: newOpenings,
      minExpYears: newMinExp,
      maxExpYears: newMaxExp,
      budgetBand: newBudget,
      oteBand: newOte,
      status: newStatus,
      careerUrl: 'https://whitecollarrealty.com/career',
      experienceLevel: newExpLevel,
      keyResponsibilities: [
        `Handle end-to-end client engagement and closing for ${newTitle}`,
        'Coordinate site visits at M3M, DLF, and luxury Gurugram developer locations',
        'Achieve monthly revenue targets in alignment with WCR leadership standards',
      ],
      requiredSkills: [
        'Real Estate Domain Expertise in Delhi-NCR / Dubai',
        'High-Impact Spoken Communication & Client Advisory',
        'Negotiation & Deal Closing',
      ],
      mustHaveQualifications: [
        `Minimum ${newMinExp}+ years of relevant industry experience`,
        'Graduate/Post-Graduate degree',
      ],
      screeningQuestions: [
        `How many years have you handled direct responsibilities in ${newTitle}?`,
        'What has been your monthly gross revenue or closure conversion run-rate?',
        'Are you able to join our M3M Urbana Gurugram office within 30 days?',
      ],
    };

    const updated = [newRoleObj, ...roles];
    handleSaveRoles(updated);
    setSelectedRole(newRoleObj);
    setIsAddingRole(false);
    // Reset form
    setNewTitle('');
  };

  const handleDeleteRole = (id: string) => {
    if (roles.length <= 1) {
      alert('At least one active career opening must remain.');
      return;
    }
    const updated = roles.filter((r) => r.id !== id);
    handleSaveRoles(updated);
    if (selectedRole.id === id) {
      setSelectedRole(updated[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-blue-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/15 border border-blue-500/40 rounded-xl text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  White Collar Realty • Career Roles & Job Openings Hub
                </h2>
                <a
                  href="https://whitecollarrealty.com/career"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 hover:bg-blue-500/30 transition"
                >
                  <span>whitecollarrealty.com/career</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live career listings mapped to Arjun AI voice screening prompts, qualification criteria, and CTC budget bands.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingRole(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Job Opening</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body 2-Column */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-slate-900/60">
          {/* Left Column: Role List */}
          <div className="md:col-span-5 border-r border-slate-800 overflow-y-auto p-4 space-y-2.5 bg-slate-950/40">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-1">
              <span>Active Roles ({roles.length})</span>
              <span>Total Vacancies: {roles.reduce((acc, r) => acc + r.openingsCount, 0)}</span>
            </div>

            {roles.map((r) => {
              const isSelected = selectedRole?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedRole(r);
                    setIsAddingRole(false);
                  }}
                  className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/60 shadow-md shadow-blue-950/30'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-white leading-snug">{r.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{r.department}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'Urgent'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300 font-mono">
                      <Users className="w-3 h-3 text-blue-400" />
                      {r.openingsCount} Vacancies
                    </span>
                    <span className="flex items-center gap-1 text-amber-300 font-mono">
                      <IndianRupee className="w-3 h-3 text-amber-400" />
                      {r.budgetBand.split('-')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Role Details or Add Form */}
          <div className="md:col-span-7 overflow-y-auto p-6 bg-slate-900/40">
            {isAddingRole ? (
              <form onSubmit={handleCreateRole} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-400" />
                    Create New Job Opening for White Collar Realty
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingRole(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Job Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Luxury Portfolio Manager"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Department</label>
                      <input
                        type="text"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="Urgent">Urgent Hiring</option>
                        <option value="Active">Active Opening</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Vacancies</label>
                      <input
                        type="number"
                        min={1}
                        value={newOpenings}
                        onChange={(e) => setNewOpenings(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Min Exp (Yrs)</label>
                      <input
                        type="number"
                        min={0}
                        value={newMinExp}
                        onChange={(e) => setNewMinExp(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Max Exp (Yrs)</label>
                      <input
                        type="number"
                        min={1}
                        value={newMaxExp}
                        onChange={(e) => setNewMaxExp(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Budget Band (Fixed)</label>
                      <input
                        type="text"
                        value={newBudget}
                        onChange={(e) => setNewBudget(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">OTE & Incentives</label>
                      <input
                        type="text"
                        value={newOte}
                        onChange={(e) => setNewOte(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Office Location</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md transition"
                    >
                      Publish Role & Sync with Voice Recruiter Agent
                    </button>
                  </div>
                </div>
              </form>
            ) : selectedRole ? (
              <div className="space-y-5">
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {selectedRole.code}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1 font-['Space_Grotesk']">
                      {selectedRole.title}
                    </h3>
                    <p className="text-xs text-slate-400">{selectedRole.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteRole(selectedRole.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Delete this career opening"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Key Metrics Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Vacancies</span>
                    <span className="font-bold text-white font-mono text-sm">{selectedRole.openingsCount} Openings</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Experience</span>
                    <span className="font-bold text-white font-mono text-sm">{selectedRole.minExpYears}-{selectedRole.maxExpYears} Yrs</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Fixed Salary</span>
                    <span className="font-bold text-amber-300 font-mono text-xs">{selectedRole.budgetBand}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Location</span>
                    <span className="font-bold text-slate-200 text-xs truncate block" title={selectedRole.location}>
                      Gurugram HQ
                    </span>
                  </div>
                </div>

                {/* AI Recruiter Screening Questions */}
                <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Arjun AI Live Screening Questions for this Role:
                    </span>
                    <span className="text-[10px] text-slate-400">Auto-Queried in Call</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {selectedRole.screeningQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                        <span className="text-blue-400 font-mono font-bold text-[11px] mt-0.5">Q{idx + 1}:</span>
                        <span className="leading-relaxed">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Must-Have Qualifications */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Must-Have Qualifications & Benchmarks
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRole.mustHaveQualifications.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 border border-slate-800 text-slate-300"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Responsibilities */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200">Key Responsibilities</h4>
                  <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                    {selectedRole.keyResponsibilities.map((resp, idx) => (
                      <li key={idx} className="leading-relaxed">{resp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>AI Voice Screening prompts automatically adopt these career specifications</span>
          </div>
          {toastMessage && (
            <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
              {toastMessage}
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
