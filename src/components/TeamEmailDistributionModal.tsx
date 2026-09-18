import React, { useState, useEffect } from 'react';
import {
  X, Mail, Users, Plus, CheckCircle2, Shield, Calendar,
  FileSpreadsheet, HardDrive, MessageSquare, Send, Trash2,
  Edit2, Power, AlertCircle, RefreshCw, Sparkles, Check,
  Copy, ExternalLink, Settings2, Bell, Building
} from 'lucide-react';
import {
  TeamEmailMember,
  TeamAutomationConfig,
  TeamRoleType,
  AutomationDispatchResult,
  Candidate
} from '../types';
import {
  getTeamAutomationConfig,
  saveTeamAutomationConfig,
  getAutomationDispatchLogs,
  executeAutomatedTeamDataShare,
  DEFAULT_TEAM_MEMBERS
} from '../utils/teamAutomationService';

interface TeamEmailDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates?: Candidate[];
  onTriggerCandidateShare?: (candidate: Candidate) => void;
}

export const TeamEmailDistributionModal: React.FC<TeamEmailDistributionModalProps> = ({
  isOpen,
  onClose,
  candidates = [],
}) => {
  const [config, setConfig] = useState<TeamAutomationConfig>(getTeamAutomationConfig());
  const [logs, setLogs] = useState<AutomationDispatchResult[]>(getAutomationDispatchLogs());
  const [activeTab, setActiveTab] = useState<'members' | 'automation_rules' | 'dispatch_history'>('members');
  
  // Add/Edit Member Form State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: TeamRoleType;
    department: string;
    receiveGmailSummaries: boolean;
    receiveCalendarInvites: boolean;
    receiveSheetsSyncAlerts: boolean;
    receiveDriveDossierLinks: boolean;
    receiveWhatsAppAlerts: boolean;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'HR Operations',
    department: 'Talent Acquisition',
    receiveGmailSummaries: true,
    receiveCalendarInvites: true,
    receiveSheetsSyncAlerts: true,
    receiveDriveDossierLinks: true,
    receiveWhatsAppAlerts: false,
  });

  // Test Broadcast state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Sync on modal open
  useEffect(() => {
    if (isOpen) {
      setConfig(getTeamAutomationConfig());
      setLogs(getAutomationDispatchLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = (updatedConfig: TeamAutomationConfig) => {
    setConfig(updatedConfig);
    saveTeamAutomationConfig(updatedConfig);
  };

  const handleToggleMember = (id: string) => {
    const updatedMembers = config.teamMembers.map((m) =>
      m.id === id ? { ...m, isActive: !m.isActive } : m
    );
    const updated = { ...config, teamMembers: updatedMembers };
    handleSaveConfig(updated);
  };

  const handleDeleteMember = (id: string) => {
    if (config.teamMembers.length <= 1) {
      alert('You must keep at least one primary HR or Support email in the distribution list.');
      return;
    }
    const updatedMembers = config.teamMembers.filter((m) => m.id !== id);
    const updated = { ...config, teamMembers: updatedMembers };
    handleSaveConfig(updated);
  };

  const handleStartAdd = () => {
    setEditingMemberId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'HR Operations',
      department: 'Talent Acquisition',
      receiveGmailSummaries: true,
      receiveCalendarInvites: true,
      receiveSheetsSyncAlerts: true,
      receiveDriveDossierLinks: true,
      receiveWhatsAppAlerts: false,
    });
    setIsAddingMember(true);
  };

  const handleStartEdit = (member: TeamEmailMember) => {
    setEditingMemberId(member.id);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      department: member.department,
      receiveGmailSummaries: member.receiveGmailSummaries,
      receiveCalendarInvites: member.receiveCalendarInvites,
      receiveSheetsSyncAlerts: member.receiveSheetsSyncAlerts,
      receiveDriveDossierLinks: member.receiveDriveDossierLinks,
      receiveWhatsAppAlerts: member.receiveWhatsAppAlerts,
    });
    setIsAddingMember(true);
  };

  const handleSubmitMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Please provide a valid name and email address.');
      return;
    }

    // Basic email format check
    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      alert('Please enter a valid email format (e.g. hr@whitecollarrealty.com).');
      return;
    }

    if (editingMemberId) {
      // Update existing
      const updatedMembers = config.teamMembers.map((m) =>
        m.id === editingMemberId
          ? {
              ...m,
              name: formData.name.trim(),
              email: formData.email.trim().toLowerCase(),
              phone: formData.phone.trim(),
              role: formData.role,
              department: formData.department.trim(),
              receiveGmailSummaries: formData.receiveGmailSummaries,
              receiveCalendarInvites: formData.receiveCalendarInvites,
              receiveSheetsSyncAlerts: formData.receiveSheetsSyncAlerts,
              receiveDriveDossierLinks: formData.receiveDriveDossierLinks,
              receiveWhatsAppAlerts: formData.receiveWhatsAppAlerts,
            }
          : m
      );
      handleSaveConfig({ ...config, teamMembers: updatedMembers });
    } else {
      // Add new
      const newMember: TeamEmailMember = {
        id: `team_${Date.now()}`,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role,
        department: formData.department.trim(),
        isActive: true,
        receiveGmailSummaries: formData.receiveGmailSummaries,
        receiveCalendarInvites: formData.receiveCalendarInvites,
        receiveSheetsSyncAlerts: formData.receiveSheetsSyncAlerts,
        receiveDriveDossierLinks: formData.receiveDriveDossierLinks,
        receiveWhatsAppAlerts: formData.receiveWhatsAppAlerts,
        addedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      handleSaveConfig({ ...config, teamMembers: [...config.teamMembers, newMember] });
    }

    setIsAddingMember(false);
    setEditingMemberId(null);
  };

  const handleTestBroadcast = async () => {
    const candidateToShare = candidates[0] || {
      id: 'demo_1',
      name: 'Rahul Sharma',
      phone: '+91 98112 34567',
      email: 'rahul.sharma@example.com',
      appliedRole: 'Senior Property Consultant',
      status: 'Interview Scheduled',
      interviewDate: 'Tomorrow',
      interviewTime: '11:00 AM',
      interviewVenue: '6th Floor, Tower-A, M3M Urbana Business Park, Sector 67, Gurugram',
      screening: {
        currentCompany: 'Signature Global',
        currentDesignation: 'Assistant Manager - Sales',
        totalExperienceYears: 4.5,
        realEstateExperienceYears: 3.5,
        gurgaonDubaiExperience: { gurgaon: true, dubai: false },
        currentSalaryLPA: '8.5 LPA',
        expectedSalaryLPA: '11 LPA',
        noticePeriodDays: 15,
        earliestJoiningDate: 'Immediate',
      },
      interviewStatus: 'Scheduled',
      callCount: 1,
      unansweredAttempts: 0,
      callHistory: [],
    } as Candidate;

    setIsBroadcasting(true);
    setBroadcastSuccess(null);

    try {
      const res = await executeAutomatedTeamDataShare(candidateToShare, 'Manual Data Share', config);
      setLogs(getAutomationDispatchLogs());
      setBroadcastSuccess(
        `Successfully broadcasted candidate data to ${res.dispatchedToEmails.length} active team emails! Google Sheets & Calendar events synchronized.`
      );
      setTimeout(() => setBroadcastSuccess(null), 6000);
    } catch (e) {
      console.error('Error during broadcast:', e);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset team distribution members to default configuration?')) {
      handleSaveConfig({ ...config, teamMembers: DEFAULT_TEAM_MEMBERS });
    }
  };

  const activeCount = config.teamMembers.filter((m) => m.isActive).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/40">
              <Users className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk'] tracking-tight">
                  Team & Shared Emails Distribution Hub
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {activeCount} Active Recipient{activeCount !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connect multiple HR emails, support desks, and hiring managers for zero-touch automated data sharing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toast Banner */}
        {broadcastSuccess && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-6 py-3 flex items-center justify-between text-xs text-emerald-200 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{broadcastSuccess}</span>
            </div>
            <button onClick={() => setBroadcastSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Integration Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-6 py-3 bg-slate-900/60 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-slate-400">Google Sheets</div>
              <div className="font-semibold text-emerald-300 truncate">Auto-Sync Active</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
            <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-slate-400">Google Calendar</div>
              <div className="font-semibold text-blue-300 truncate">All Emails Invited</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
            <Mail className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-slate-400">Gmail Broadcast</div>
              <div className="font-semibold text-amber-300 truncate">Instant Summaries</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
            <HardDrive className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-slate-400">Google Drive</div>
              <div className="font-semibold text-purple-300 truncate">Dossier Archive</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50 col-span-2 sm:col-span-1">
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-slate-400">WhatsApp Dispatch</div>
              <div className="font-semibold text-emerald-300 truncate">Direct Candidate Links</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Main Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-3 border-b border-slate-800 bg-[#0d1527]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('members'); setIsAddingMember(false); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'members'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team & Support Emails ({config.teamMembers.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('automation_rules'); setIsAddingMember(false); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'automation_rules'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Automation Rules & Workflows</span>
            </button>

            <button
              onClick={() => { setActiveTab('dispatch_history'); setIsAddingMember(false); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'dispatch_history'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Dispatch Logs ({logs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleTestBroadcast}
              disabled={isBroadcasting}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 px-3.5 py-2 rounded-lg transition active:scale-95 disabled:opacity-50"
              title="Test multi-channel broadcast with sample candidate data"
            >
              {isBroadcasting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Send className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isBroadcasting ? 'Broadcasting...' : '1-Click Data Share'}</span>
            </button>

            <button
              onClick={handleStartAdd}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-3.5 py-2 rounded-lg shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Support / HR Email</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ADD / EDIT MEMBER DRAWER / FORM */}
          {isAddingMember && (
            <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-5 shadow-xl animate-fadeIn space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {editingMemberId ? 'Edit Team Recipient' : 'Add New Support / HR Email Recipient'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingMember(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmitMember} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Recipient Name / Desk Label <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gurgaon HR Desk / Sachin Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. hr@whitecollarrealty.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Team Role Type
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as TeamRoleType })}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="HR Operations">HR Operations</option>
                      <option value="Support & Logistics">Support & Logistics</option>
                      <option value="Hiring Manager">Hiring Manager</option>
                      <option value="Director / Executive">Director / Executive</option>
                      <option value="Branch Desk">Branch Desk (Dubai / Gurgaon)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Department / Function
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Talent Acquisition, Candidate Logistics"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Phone / WhatsApp Number (Optional for SMS/WhatsApp sync)
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Automation Subscriptions */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-200">
                    Automated Data Sharing Preferences for this Recipient:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={formData.receiveGmailSummaries}
                        onChange={(e) => setFormData({ ...formData, receiveGmailSummaries: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                      />
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>Receive Gmail Candidate Summaries</span>
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={formData.receiveCalendarInvites}
                        onChange={(e) => setFormData({ ...formData, receiveCalendarInvites: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                      />
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>Add as Attendee on Google Calendar</span>
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={formData.receiveSheetsSyncAlerts}
                        onChange={(e) => setFormData({ ...formData, receiveSheetsSyncAlerts: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                      />
                      <span className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Include in Google Sheets Sync Notifications</span>
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={formData.receiveDriveDossierLinks}
                        onChange={(e) => setFormData({ ...formData, receiveDriveDossierLinks: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                      />
                      <span className="flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                        <span>Receive Drive Dossier & Transcript Links</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-md shadow-amber-500/20"
                  >
                    {editingMemberId ? 'Update Recipient' : 'Save & Add Recipient'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 1: TEAM MEMBERS LIST */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Active Multi-Recipient Distribution List
                  </h3>
                  <p className="text-xs text-slate-400">
                    Candidate data, screening notes, and interview calendar invites are automatically shared with these addresses.
                  </p>
                </div>

                <button
                  onClick={handleResetDefaults}
                  className="text-xs text-slate-400 hover:text-amber-400 underline transition"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {config.teamMembers.map((member) => {
                  const roleBadgeColors: Record<TeamRoleType, string> = {
                    'HR Operations': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    'Support & Logistics': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                    'Hiring Manager': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    'Director / Executive': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                    'Branch Desk': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                  };

                  return (
                    <div
                      key={member.id}
                      className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        member.isActive
                          ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-900/40 border-slate-800/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-sm shrink-0">
                          {member.name.charAt(0)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-100">{member.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${roleBadgeColors[member.role]}`}>
                              {member.role}
                            </span>
                            {member.department && (
                              <span className="text-xs text-slate-400">• {member.department}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                            <span className="text-slate-200 font-mono flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {member.email}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleCopyEmail(member.email)}
                              className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-0.5"
                              title="Copy email address"
                            >
                              {copiedEmail === member.email ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedEmail === member.email ? 'Copied' : 'Copy'}</span>
                            </button>

                            {member.phone && (
                              <span className="text-slate-400">• {member.phone}</span>
                            )}
                          </div>

                          {/* Channel Subscriptions Badges */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
                            {member.receiveGmailSummaries && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" /> Gmail Summary
                              </span>
                            )}
                            {member.receiveCalendarInvites && (
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> Calendar Attendee
                              </span>
                            )}
                            {member.receiveSheetsSyncAlerts && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <FileSpreadsheet className="w-2.5 h-2.5" /> Sheets Sync
                              </span>
                            )}
                            {member.receiveDriveDossierLinks && (
                              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                <HardDrive className="w-2.5 h-2.5" /> Drive Dossier
                              </span>
                            )}
                            {member.receiveWhatsAppAlerts && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                                <MessageSquare className="w-2.5 h-2.5" /> WhatsApp Alert
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Member Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleToggleMember(member.id)}
                          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                            member.isActive
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                          title={member.isActive ? 'Active - click to pause' : 'Paused - click to activate'}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-semibold">{member.isActive ? 'Active' : 'Paused'}</span>
                        </button>

                        <button
                          onClick={() => handleStartEdit(member)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          title="Edit recipient details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 transition"
                          title="Remove from distribution"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: AUTOMATION RULES & WORKFLOWS */}
          {activeTab === 'automation_rules' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  Zero-Touch HR Workflow Rules
                </h3>
                <p className="text-xs text-slate-400">
                  Configure automated triggers so the CRM operates autonomously without manual human intervention.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Google Sheets Automation */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Google Sheets Master Sync</div>
                        <div className="text-[11px] text-slate-400">Live candidate row appending</div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={config.autoSyncGoogleSheets}
                      onChange={(e) => handleSaveConfig({ ...config, autoSyncGoogleSheets: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Target Google Sheet Name</label>
                    <input
                      type="text"
                      value={config.googleSheetName}
                      onChange={(e) => handleSaveConfig({ ...config, googleSheetName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                {/* Google Calendar Automation */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Google Calendar Auto-Booking</div>
                        <div className="text-[11px] text-slate-400">Creates event with team attendees</div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={config.autoBookGoogleCalendar}
                      onChange={(e) => handleSaveConfig({ ...config, autoBookGoogleCalendar: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Automatically books interview slot on the Director's calendar and includes all configured HR & Support emails in the invite.
                  </p>
                </div>

                {/* Gmail Broadcast Automation */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Gmail Team Broadcast</div>
                        <div className="text-[11px] text-slate-400">Comprehensive screening summaries</div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={config.autoSendGmailTeamSummaries}
                      onChange={(e) => handleSaveConfig({ ...config, autoSendGmailTeamSummaries: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Sends high-level candidate scorecard, audio transcription, notice period, and CTC expectations to all active HR/Support addresses immediately.
                  </p>
                </div>

                {/* Google Drive Archive Automation */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Google Drive Dossier Archive</div>
                        <div className="text-[11px] text-slate-400">Structured candidate folders</div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={config.autoArchiveDriveDossier}
                      onChange={(e) => handleSaveConfig({ ...config, autoArchiveDriveDossier: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Target Google Drive Folder</label>
                    <input
                      type="text"
                      value={config.googleDriveFolderName}
                      onChange={(e) => handleSaveConfig({ ...config, googleDriveFolderName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: DISPATCH LOGS */}
          {activeTab === 'dispatch_history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Automated Data Sharing Audit Trail
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chronological history of all automated broadcasts across Google Sheets, Gmail, Calendar, and WhatsApp.
                  </p>
                </div>

                {logs.length > 0 && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('wcr_hr_automation_dispatch_logs_v1');
                      setLogs([]);
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 transition"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
                  <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No automated dispatches logged yet.</p>
                  <button
                    onClick={handleTestBroadcast}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Run test broadcast now</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{log.candidateName}</span>
                          <span className="text-slate-400">({log.candidateRole})</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {log.event}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">{log.timestamp}</span>
                      </div>

                      <div className="text-slate-300 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                        {log.details}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap pt-1">
                        <span className="text-slate-500">Recipients ({log.dispatchedToEmails.length}):</span>
                        {log.dispatchedToEmails.map((em) => (
                          <span key={em} className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                            {em}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90 text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>All added HR & Support emails will automatically collaborate on candidate updates.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-md shadow-amber-500/20"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
