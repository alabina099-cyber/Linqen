"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Mail,
  Shield,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  X,
  Save,
  RefreshCw,
} from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  email: string;
  company: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

// Auth via cookie HttpOnly : envoyé automatiquement par le navigateur.
// On garde un helper vide pour ne pas casser les call-sites.
const authHeaders = (): Record<string, string> => ({});

export default function UsersManagement() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<TeamMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "", email: "", company: "", password: "", showPassword: false,
  });

  const [editForm, setEditForm] = useState({
    name: "", email: "", company: "", password: "", showPassword: false,
  });

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/team", { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        // Exclure l'admin du tableau — on n'affiche que les membres (role === 'user')
        setTeam(data.team.filter((m: TeamMember) => m.role !== "admin"));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchTeam();
  }, [isAdmin]);

  // Pré-remplir le formulaire d'édition quand on sélectionne un membre
  useEffect(() => {
    if (showEdit) {
      setEditForm({
        name: showEdit.name,
        email: showEdit.email,
        company: showEdit.company || "",
        password: "",
        showPassword: false,
      });
    }
  }, [showEdit]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users/team", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          company: createForm.company || undefined,
          password: createForm.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateForm({ name: "", email: "", company: "", password: "", showPassword: false });
        setShowCreate(false);
        fetchTeam();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    setSaving(true);
    try {
      const body: Record<string, string> = {
        id: String(showEdit.id),
        name: editForm.name,
        email: editForm.email,
        company: editForm.company,
      };
      if (editForm.password) body.password = editForm.password;

      const res = await fetch("/api/users/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowEdit(null);
        fetchTeam();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      const res = await fetch("/api/users/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id: member.id, is_active: !member.is_active }),
      });
      const data = await res.json();
      if (data.success) fetchTeam();
    } catch {
      // silently fail
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/team?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        fetchTeam();
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  };

  const members = team.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const userCount = team.length;
  const maxUsers = 10;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Admin access only</p>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-indigo-600" />
            Team Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Create and manage up to {maxUsers} team members.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
            <span className="font-semibold text-slate-700">{userCount}</span> / {maxUsers}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(true)}
            disabled={userCount >= maxUsers}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add
          </motion.button>
        </div>
      </div>


      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">User</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Email</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Role</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                    {search ? "No results" : "No members"}
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <motion.tr key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                          {member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{member.name}</p>
                          {member.company && <p className="text-xs text-slate-400">{member.company}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {member.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                        <Shield className="w-3 h-3" />
                        Member
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                          member.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100"
                        }`}
                        title={member.is_active ? "Click to deactivate" : "Click to activate"}
                      >
                        {member.is_active
                          ? <><CheckCircle2 className="w-3 h-3" />Active</>
                          : <><XCircle className="w-3 h-3" />Inactive</>}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setShowEdit(member)}
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(member)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== CREATE MODAL ===== */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-500" />
                    New user
                  </h3>
                  <button onClick={() => setShowCreate(false)} title="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name <span className="text-red-500">*</span></label>
                    <input type="text" required value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                      placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                    <input type="email" required value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                      placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Company (optional)</label>
                    <input type="text" value={createForm.company}
                      onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                      placeholder="My Company" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type={createForm.showPassword ? "text" : "password"} required minLength={6}
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                        placeholder="Min. 6 characters" />
                      <button type="button" onClick={() => setCreateForm({ ...createForm, showPassword: !createForm.showPassword })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {createForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowCreate(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Creating...</> : <><Save className="w-4 h-4" />Create</>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== EDIT MODAL ===== */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowEdit(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-500" />
                    Edit {showEdit.name}
                  </h3>
                  <button onClick={() => setShowEdit(null)} title="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleEdit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name <span className="text-red-500">*</span></label>
                    <input type="text" required value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                    <input type="email" required value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                    <input type="text" value={editForm.company}
                      onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                      placeholder="My Company" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">New password <span className="text-slate-400 font-normal">(leave blank = unchanged)</span></label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type={editForm.showPassword ? "text" : "password"}
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        placeholder="Leave blank to not change" />
                      <button type="button" onClick={() => setEditForm({ ...editForm, showPassword: !editForm.showPassword })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {editForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowEdit(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save</>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500" />
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Delete this user?</h3>
                    <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                      This action is irreversible. The user will lose all access to the account.
                    </p>
                  </div>
                </div>

                <div className="mt-5 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                    {deleteTarget.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">{deleteTarget.name}</div>
                    <div className="text-xs text-slate-500 truncate">{deleteTarget.email}</div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold rounded-xl transition-all text-sm shadow-md shadow-red-500/30 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting
                      ? <><RefreshCw className="w-4 h-4 animate-spin" />Deleting...</>
                      : <><Trash2 className="w-4 h-4" />Delete</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
