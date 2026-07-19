import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, UserPlus, Shield, Trash2, Mail } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  role: string;
  joined_at: string;
}

export default function Team() {
  const { org, role, user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManage = role === 'admin' || role === 'owner';

  useEffect(() => {
    if (org) {
      fetchMembers();
    }
  }, [org]);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('org_members')
      .select(`
        role,
        joined_at,
        users ( id, email )
      `);
      
    if (!error && data) {
      setMembers(data.map((m: any) => ({
        id: m.users.id,
        email: m.users.email,
        role: m.role,
        joined_at: m.joined_at,
      })));
    }
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setInviting(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email_to_invite: inviteEmail, role: inviteRole }
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!canManage || !confirm('Are you sure you want to remove this member?')) return;
    
    // Deleting from users or org_members (cascade will handle it depending on setup)
    // Here we'll delete from org_members, and the trigger/schema can cascade if needed.
    // Or we delete the auth user via admin API, but that requires service key.
    // Standard approach: delete the org_members row.
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('user_id', userId);
      
    if (!error) {
      setMembers(members.filter(m => m.id !== userId));
    } else {
      alert('Error removing member: ' + error.message);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!canManage) return;
    const { error } = await supabase
      .from('org_members')
      .update({ role: newRole })
      .eq('user_id', userId);
      
    if (!error) {
       // Also update users table for convenience
       await supabase.from('users').update({ role: newRole }).eq('id', userId);
       setMembers(members.map(m => m.id === userId ? { ...m, role: newRole } : m));
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2 text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="text-blue-500" />
          Team & Collaboration
        </h1>
        <p className="text-slate-500">Manage members for {org?.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900 dark:text-white">Organization Members</h2>
              <span className="text-sm text-slate-500">{members.length} / {org?.seat_limit} seats used</span>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading members...</div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center font-bold">
                        {member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {member.email} {member.id === user?.id && <span className="text-xs ml-2 bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">You</span>}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Shield size={12} /> {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {canManage && member.id !== user?.id && member.role !== 'owner' && (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none focus:border-blue-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                      
                      {canManage && member.id !== user?.id && member.role !== 'owner' && (
                        <button 
                          onClick={() => handleRemove(member.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Remove user"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {canManage && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <UserPlus size={18} className="text-blue-500" />
                Invite Member
              </h3>
              
              <form onSubmit={handleInvite} className="space-y-4">
                {error && <div className="text-xs p-2 bg-red-50 text-red-600 rounded">{error}</div>}
                {success && <div className="text-xs p-2 bg-emerald-50 text-emerald-600 rounded">{success}</div>}
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="colleague@company.com"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="admin">Admin (Can edit pipelines)</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={inviting || members.length >= (org?.seat_limit || 1)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : <><Mail size={16} /> Send Invite</>}
                </button>
                
                {members.length >= (org?.seat_limit || 1) && (
                  <p className="text-xs text-amber-600 mt-2 text-center">Seat limit reached. Upgrade to invite more.</p>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
