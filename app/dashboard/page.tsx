"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PlatformNavbar from "../components/PlatformNavbar";
import CreateHackathonModal from "../components/dashboard/CreateHackathonModal";
import {
  getToken,
  getProfile,
  getAdminDashboardStats,
  getAdminRecentUsers,
  getAdminUsers,
  triggerN8nWebhookTest,
  getCompetitions,
  createCompetition,
  changeCompetitionStatus,
  deleteCompetition,
  adminGenerateCertificate,
  adminListCertificates,
  type AdminCertificate,
  getCompanyRequests,
  reviewCompanyRequest,
  type AdminUserRow,
  type Competition,
  type CompetitionStatus,
  type CompetitionDifficulty,
  type Specialty,
  type CreateCompetitionPayload,
} from "../lib/api";

const PAGE_SIZE = 10;

type Stats = {
  users: {
    total: number;
    verified: number;
    banned?: number;
    noSpecialty?: number;
    byRole: Record<string, number>;
  };
  specialties: { list: string[]; bySpecialty: Record<string, number> };
  rooms: { total: number; description: string };
};

type View = "OVERVIEW" | "USERS" | "COMPANIES" | "HACKATHONS" | "WORKFLOWS" | "CERTIFICATES";

export default function DashboardPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<View>("OVERVIEW");
  
  // Dashboard Data
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Users View
  const [usersSearch, setUsersSearch] = useState("");
  const [usersQuery, setUsersQuery] = useState("");
  const [usersRole, setUsersRole] = useState<string>("");
  const [usersResult, setUsersResult] = useState<{
    users: AdminUserRow[];
    total: number;
  } | null>(null);
  const [usersPage, setUsersPage] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Auto-filter for users (debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setUsersQuery(usersSearch);
      setUsersPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [usersSearch]);

  // Companies View
  const [companyRequests, setCompanyRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Hackathons View
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compSearch, setCompSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Delete hackathon modal (two-step)
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteResultMsg, setDeleteResultMsg] = useState<string | null>(null);

  // Certificates NFT view
  const [certForm, setCertForm] = useState({
    identifier: "", // email or userId
    hackathonName: "",
  });
  const [certLoading, setCertLoading] = useState(false);
  const [certResult, setCertResult] = useState<
    | (Awaited<ReturnType<typeof adminGenerateCertificate>>)
    | null
  >(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [showCertList, setShowCertList] = useState(false);
  const [certList, setCertList] = useState<AdminCertificate[]>([]);
  const [certListLoading, setCertListLoading] = useState(false);
  const [certListError, setCertListError] = useState<string | null>(null);
  const [certListQuery, setCertListQuery] = useState("");

  const [createLoading, setCreateLoading] = useState(false);
  const [compSuccess, setCompSuccess] = useState<string | null>(null);
  const [compForm, setCompForm] = useState<CreateCompetitionPayload>({
    title: "",
    description: "",
    difficulty: "MEDIUM",
    specialty: undefined,
    startDate: "",
    endDate: "",
    rewardPool: 0,
    maxParticipants: undefined,
    antiCheatEnabled: false,
    antiCheatThreshold: 70,
    topN: 5,
  });

  // n8n
  const [n8nLoading, setN8nLoading] = useState(false);
  const [n8nMsg, setN8nMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/signin");
      return;
    }
    setLoading(true);
    getProfile()
      .then((profile: any) => {
        if (profile?.role !== "ADMIN") {
          router.replace("/hackathon");
          return;
        }
        return Promise.all([
          getAdminDashboardStats(),
          getAdminRecentUsers(8),
          getCompetitions({ limit: 10 })
        ]);
      })
      .then((results: any) => {
        if (results) {
          setStats(results[0]);
          setRecentUsers(results[1]);
          setCompetitions(results[2]?.data ?? []);
        }
      })
      .catch((err) => setError(err?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [router]);

  // Load section-specific data
  useEffect(() => {
    if (activeView === "USERS") {
      setLoadingUsers(true);
      getAdminUsers({
        limit: PAGE_SIZE,
        offset: usersPage * PAGE_SIZE,
        search: usersQuery || undefined,
        role: usersRole || undefined
      })
        .then(setUsersResult)
        .finally(() => setLoadingUsers(false));
    } else if (activeView === "COMPANIES") {
      setLoadingRequests(true);
      getCompanyRequests("PENDING")
        .then(setCompanyRequests)
        .finally(() => setLoadingRequests(false));
    } else if (activeView === "HACKATHONS") {
      setCompLoading(true);
      getCompetitions({ limit: 50 })
        .then((res) => setCompetitions(res.data ?? []))
        .finally(() => setCompLoading(false));
    }
  }, [activeView, usersPage, usersQuery, usersRole]);

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError(null);
    setCompSuccess(null);
    try {
      await createCompetition(compForm);
      setCompSuccess("Hackathon créé avec succès !");
      setShowCreateForm(false);
      setCompForm({
        title: "",
        description: "",
        difficulty: "MEDIUM",
        specialty: undefined,
        startDate: "",
        endDate: "",
        rewardPool: 0,
        maxParticipants: undefined,
        antiCheatEnabled: false,
        antiCheatThreshold: 70,
        topN: 5,
      });
      // reload competitions
      getCompetitions({ limit: 50 }).then((res) => setCompetitions(res.data ?? []));
    } catch (err: any) {
      setError(err?.message ?? "Erreur de création");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: CompetitionStatus) => {
    try {
      await changeCompetitionStatus(id, newStatus);
      setCompetitions(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const openDeleteModal = (c: Competition) => {
    setDeleteTarget(c);
    setDeleteStep(1);
    setDeleteConfirmText("");
    setDeleteResultMsg(null);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteStep(1);
    setDeleteConfirmText("");
    setDeleteResultMsg(null);
  };

  const confirmDeleteCompetition = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteResultMsg(null);
    try {
      const res = await deleteCompetition(deleteTarget.id);
      setCompetitions(prev => prev.filter(x => x.id !== deleteTarget.id));
      setDeleteResultMsg(
        res.refundedAmount > 0
          ? `Hackathon supprimé. ${res.refundedAmount} ARENA restitués au créateur.`
          : `Hackathon supprimé.`,
      );
      setTimeout(() => closeDeleteModal(), 1400);
    } catch (err: any) {
      setDeleteResultMsg("Suppression impossible : " + (err?.message ?? "erreur inconnue"));
    } finally {
      setDeleting(false);
    }
  };

  // ───── Certificate NFT (admin) ─────
  const handleGenerateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = certForm.identifier.trim();
    const hackathonName = certForm.hackathonName.trim();
    if (!identifier || !hackathonName) return;
    setCertLoading(true);
    setCertError(null);
    setCertResult(null);
    try {
      // detect identifier kind: email if contains "@", else assume userId
      const payload = identifier.includes("@")
        ? { email: identifier.toLowerCase(), hackathonName }
        : { userId: identifier, hackathonName };
      const res = await adminGenerateCertificate(payload);
      setCertResult(res);
      // Reload the list if it was already open
      if (showCertList) {
        adminListCertificates({ limit: 100 })
          .then((d) => setCertList(d.certificates))
          .catch(() => {});
      }
    } catch (err: any) {
      setCertError(err?.message ?? "Échec de la génération du certificat.");
    } finally {
      setCertLoading(false);
    }
  };

  const openCertList = async () => {
    setShowCertList(true);
    setCertListLoading(true);
    setCertListError(null);
    try {
      const data = await adminListCertificates({ limit: 100 });
      setCertList(data.certificates);
    } catch (err: any) {
      setCertListError(err?.message ?? "Impossible de charger la liste.");
    } finally {
      setCertListLoading(false);
    }
  };

  const handleReviewRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await reviewCompanyRequest(id, status);
      setCompanyRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleRunN8n = async () => {
    setN8nLoading(true);
    setN8nMsg(null);
    try {
      const res = await triggerN8nWebhookTest();
      if (res.success) setN8nMsg({ type: 'success', text: "Workflow executed successfully!" });
      else setN8nMsg({ type: 'error', text: res.message || "Execution failed." });
    } catch (err: any) {
      setN8nMsg({ type: 'error', text: err.message });
    } finally {
      setN8nLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
        <PlatformNavbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-cyan-400 font-mono text-sm tracking-[0.3em] uppercase">Initializing secure area...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col selection:bg-cyan-500/30">
      <PlatformNavbar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 border-r border-white/5 bg-[#0d1117] hidden md:flex flex-col p-6 gap-8">
          <div className="space-y-6">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">Navigation</p>
            <nav className="space-y-1">
              <SidebarItem 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>}
                label="Vue d'ensemble" active={activeView === "OVERVIEW"} onClick={() => setActiveView("OVERVIEW")} 
              />
              <SidebarItem 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>}
                label="Utilisateurs" active={activeView === "USERS"} onClick={() => setActiveView("USERS")} 
              />
              <SidebarItem 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>}
                label="Entreprises" active={activeView === "COMPANIES"} onClick={() => setActiveView("COMPANIES")} 
              />
              <SidebarItem 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>}
                label="Hackathons" active={activeView === "HACKATHONS"} onClick={() => setActiveView("HACKATHONS")} 
              />
              <SidebarItem
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>}
                label="Certificats NFT" active={activeView === "CERTIFICATES"} onClick={() => setActiveView("CERTIFICATES")}
              />
              <SidebarItem
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
                label="Workflows n8n" active={activeView === "WORKFLOWS"} onClick={() => setActiveView("WORKFLOWS")} 
              />
            </nav>
          </div>
          
          <div className="mt-auto p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10">
            <p className="text-xs font-bold text-cyan-400 mb-1">Status Admin</p>
            <p className="text-[10px] text-white/50">Vous avez un accès complet à la gestion système.</p>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-auto p-6 md:p-10">
          
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              System <span className="text-cyan-400">Control</span> Panel
            </h1>
            <p className="text-[10px] text-white/40 tracking-[0.5em] uppercase mt-2">Arena of Coders · Administrative Terminal</p>
          </div>

          {/* Dynamic Content Views */}
          {activeView === "OVERVIEW" && stats && (
            <div className="space-y-10 animate-in fade-in duration-500">
              {/* Metric Grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard label="Total Talent" value={stats.users.total} subValue={`${stats.users.verified} vérifiés`} color="cyan" />
                <MetricCard label="Companies" value={stats.users.byRole?.COMPANY ?? 0} subValue="Partenaires actifs" color="emerald" />
                <MetricCard label="Admins" value={stats.users.byRole?.ADMIN ?? 0} subValue="Opérateurs système" color="amber" />
                <MetricCard label="Live Rooms" value={stats.rooms.total} subValue="Salles actives" color="violet" />
              </div>

              {/* Two Column Layout for Recent Data */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <SectionTitle title="Dernières Inscriptions" />
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/[0.02] border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Identité</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Rôle</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Spécialité</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Inscrit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentUsers.map(u => (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-white">{u.firstName} {u.lastName}</p>
                              <p className="text-[10px] text-white/40 font-mono">{u.email}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-400' : u.role === 'COMPANY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/60'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-cyan-400">{u.mainSpecialty || "—"}</td>
                            <td className="px-6 py-4 text-[10px] text-white/30 font-mono">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={() => setActiveView("USERS")} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-2">
                    VOIR TOUS LES UTILISATEURS <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <SectionTitle title="Répartition Spécialités" />
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
                    {stats.specialties.list.map(s => {
                      const count = stats.specialties.bySpecialty[s] ?? 0;
                      const pct = Math.round((count / stats.users.total) * 100);
                      return (
                        <div key={s} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-white/60 uppercase">
                            <span>{s}</span>
                            <span>{count}</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500/60 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === "USERS" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input 
                    placeholder="Chercher par nom, email..."
                    value={usersSearch}
                    onChange={e => setUsersSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                </div>
                <select 
                  value={usersRole}
                  onChange={e => { setUsersRole(e.target.value); setUsersPage(0); }}
                  className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 outline-none min-w-[160px]"
                >
                  <option value="">Tous les rôles</option>
                  <option value="USER">User</option>
                  <option value="COMPANY">Company</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {loadingUsers ? (
                <div className="py-20 text-center"><div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-cyan-400 text-xs font-mono animate-pulse">QUERYING TALENT DATABASE...</p></div>
              ) : usersResult && (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/[0.02] border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Email</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Identité</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Rôle</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Statut</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersResult.users.map(u => (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-white/80">{u.email}</td>
                            <td className="px-6 py-4 font-bold text-white">{u.firstName} {u.lastName}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-400' : u.role === 'COMPANY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/60'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                {u.isEmailVerified && <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-black">VÉRIFIÉ</span>}
                                {u.isBanned && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black">BANNI</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <button className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest">Éditer</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {usersResult.total > PAGE_SIZE && (
                    <div className="flex justify-center gap-4 pt-4">
                      <button disabled={usersPage === 0} onClick={() => setUsersPage(p => p - 1)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold disabled:opacity-30">PRÉCÉDENT</button>
                      <button disabled={(usersPage + 1) * PAGE_SIZE >= usersResult.total} onClick={() => setUsersPage(p => p + 1)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold disabled:opacity-30">SUIVANT</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeView === "COMPANIES" && (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-6">
                <SectionTitle title="Demandes de Rôle Entreprise" />
                {loadingRequests ? (
                  <div className="py-20 text-center text-white/30 font-mono text-sm uppercase animate-pulse">Fetching verification requests...</div>
                ) : companyRequests.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                    <p className="text-white/40 font-mono text-xs uppercase tracking-widest">Aucune demande en attente</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {companyRequests.map(r => (
                      <div key={r.id} className="bg-[#1a1f26] border border-white/10 rounded-2xl p-6 space-y-4 hover:border-cyan-500/30 transition-all shadow-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-black italic uppercase text-white leading-tight">{r.companyName}</h3>
                            <p className="text-[10px] text-cyan-400 font-mono mt-1">SOUHAITÉ PAR: {r.user?.firstName} {r.user?.lastName}</p>
                          </div>
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase rounded tracking-widest animate-pulse">En attente</span>
                        </div>
                        <p className="text-sm text-white/60 line-clamp-3 leading-relaxed">{r.description}</p>
                        <div className="flex gap-3 pt-2">
                          <button 
                            onClick={() => handleReviewRequest(r.id, 'APPROVED')}
                            className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-black uppercase py-3 rounded-xl transition-all"
                          >
                            Accepter
                          </button>
                          <button 
                            onClick={() => handleReviewRequest(r.id, 'REJECTED')}
                            className="flex-1 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white hover:text-red-400 text-[10px] font-black uppercase py-3 rounded-xl transition-all"
                          >
                            Refuser
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === "HACKATHONS" && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col md:flex-row gap-4 items-end">
                 <div className="flex-1 space-y-4">
                   <SectionTitle title="Système de Compétitions" />
                   <div className="relative">
                     <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                     <input 
                      placeholder="RECHERCHER UN HACKATHON..."
                      value={compSearch}
                      onChange={e => setCompSearch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                    />
                   </div>
                 </div>
                 <button
                    onClick={() => { setShowCreateForm(true); setError(null); }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest shadow-lg shadow-cyan-500/20 whitespace-nowrap inline-flex items-center gap-2"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                   CRÉER HACKATHON
                 </button>
               </div>

               <div className="space-y-4">
                 {competitions
                  .filter(c => c.title.toLowerCase().includes(compSearch.toLowerCase()))
                  .map(c => (
                    <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 hover:border-white/20 transition-all">
                       <div className="flex-1 space-y-2">
                         <div className="flex items-center gap-3">
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${STATUS_COLOR[c.status] || 'bg-white/10 text-white/60'}`}>
                             {c.status}
                           </span>
                           <span className="text-[8px] border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">{c.specialty}</span>
                         </div>
                         <h3 className="text-lg font-black italic uppercase text-white leading-tight">{c.title}</h3>
                         <p className="text-xs text-white/40 font-mono tracking-tighter line-clamp-1">{c.description}</p>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Participants</p>
                            <p className="text-xl font-black text-white">{c._count?.participants || 0}</p>
                          </div>
                          <div className="flex gap-2">
                            {getNextStatus(c.status) && getNextStatusLabel(c.status) !== "Lancer" && (
                              <button 
                                onClick={() => handleStatusChange(c.id, getNextStatus(c.status)!)}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                              >
                                {getNextStatusLabel(c.status)}
                              </button>
                            )}
                            <button onClick={() => router.push(`/hackathon/${c.id}/details`)} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Gérer</button>
                            <button
                              onClick={() => openDeleteModal(c)}
                              title="Supprimer définitivement ce hackathon"
                              aria-label={`Supprimer ${c.title}`}
                              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                              Supprimer
                            </button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeView === "CERTIFICATES" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black tracking-[0.3em] text-amber-400 uppercase">NFT Certificates</p>
                    <h2 className="mt-1 text-2xl md:text-3xl font-black italic uppercase tracking-tight text-white leading-tight">
                      Émission de certificats
                    </h2>
                    <p className="mt-1 text-sm text-white/40">
                      Génère un certificat NFT (image IPFS + mint Hedera) pour n'importe quel utilisateur.
                    </p>
                  </div>
                </div>
                <button
                  onClick={openCertList}
                  className="inline-flex items-center gap-2 py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 text-[11px] font-black uppercase tracking-[0.2em] text-white/70 hover:text-cyan-300 transition-all whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Voir les certificats émis
                </button>
              </div>

              {/* Form card */}
              <div className="relative rounded-3xl border border-amber-500/20 bg-white/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" aria-hidden />
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" aria-hidden />

                <form onSubmit={handleGenerateCertificate} className="relative p-6 md:p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-0.5">
                      Identifiant du destinataire (email ou userId)
                    </label>
                    <input
                      required
                      value={certForm.identifier}
                      onChange={(e) => setCertForm((f) => ({ ...f, identifier: e.target.value }))}
                      placeholder="alice@arena.dev   ou   69f5cfbd4a151711c9499d5c"
                      className="w-full bg-white/5 border border-white/10 focus:border-amber-500/50 focus:bg-white/[0.07] rounded-xl px-4 py-3.5 text-white font-mono text-sm outline-none transition-all placeholder:text-white/20"
                    />
                    <p className="text-[10px] text-white/30">
                      Détection automatique: si l'identifiant contient <span className="font-mono text-amber-400">@</span>, on cherche par email; sinon par userId Mongo.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-0.5">
                      Nom du hackathon
                    </label>
                    <input
                      required
                      value={certForm.hackathonName}
                      onChange={(e) => setCertForm((f) => ({ ...f, hackathonName: e.target.value }))}
                      placeholder="Ex : Arena Spring Hackathon 2026"
                      className="w-full bg-white/5 border border-white/10 focus:border-amber-500/50 focus:bg-white/[0.07] rounded-xl px-4 py-3.5 text-white font-mono text-sm outline-none transition-all placeholder:text-white/20"
                    />
                  </div>

                  {certError && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-400">
                      ✕ {certError}
                    </div>
                  )}

                  {certResult && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
                        ✓ NFT minté pour {certResult.user.firstName} {certResult.user.lastName}
                      </p>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                        <dt className="text-white/40 font-bold uppercase tracking-widest">Token</dt>
                        <dd className="text-white font-mono truncate">{certResult.tokenId}</dd>
                        <dt className="text-white/40 font-bold uppercase tracking-widest">Serial</dt>
                        <dd className="text-white font-mono">#{certResult.serial}</dd>
                        {certResult.transferredToWallet !== undefined && (
                          <>
                            <dt className="text-white/40 font-bold uppercase tracking-widest">Transfert wallet</dt>
                            <dd className={certResult.transferredToWallet ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>
                              {certResult.transferredToWallet ? "OUI" : "EN ATTENTE"}
                            </dd>
                          </>
                        )}
                      </dl>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <a
                          href={certResult.imageIpfsUrl.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${certResult.imageIpfsUrl.replace("ipfs://", "")}` : certResult.imageIpfsUrl}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
                        >
                          Image IPFS ↗
                        </a>
                        <a
                          href={certResult.metadataIpfsUrl.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${certResult.metadataIpfsUrl.replace("ipfs://", "")}` : certResult.metadataIpfsUrl}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
                        >
                          Metadata ↗
                        </a>
                        <a
                          href={`https://hashscan.io/testnet/token/${certResult.tokenId}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] font-black uppercase tracking-widest text-violet-300 hover:text-violet-200 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20"
                        >
                          HashScan ↗
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={certLoading || !certForm.identifier.trim() || !certForm.hackathonName.trim()}
                      className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-amber-500/30 disabled:bg-amber-500/20 disabled:text-amber-300/40 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      {certLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
                          Mint en cours…
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Générer le certificat
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeView === "WORKFLOWS" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-3xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] -z-10 animate-pulse"></div>
                  <div className="max-w-2xl space-y-6">
                    <h2 className="text-3xl font-black italic uppercase text-white tracking-widest">Startup <span className="text-cyan-400">Idea</span> Scraper</h2>
                    <p className="text-white/60 leading-relaxed font-mono text-sm lowercase tracking-tighter">
                      Ce workflow connecte Reddit, une analyse IA par Claude et un envoi automatisé via Gmail. Idéal pour monitorer les tendances en temps réel.
                    </p>
                    <div className="flex items-center gap-6 pt-4">
                      <button 
                        onClick={handleRunN8n}
                        disabled={n8nLoading}
                        className="bg-cyan-500 hover:bg-cyan-400 text-black px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {n8nLoading ? "EXÉCUTION EN COURS..." : "DÉCLENCHER WORKFLOW"}
                      </button>
                      <div className="flex items-center gap-3">
                         <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                         <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Connecté à n8n Instance</span>
                      </div>
                    </div>

                    {n8nMsg && (
                      <div className={`mt-6 p-4 rounded-xl font-mono text-[10px] tracking-widest uppercase ${n8nMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                        [{n8nMsg.type === 'success' ? 'SUCCESS' : 'FAILURE'}] {n8nMsg.text}
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>

      {/* ───── Delete Hackathon Modal (two-step, themed) ───── */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDeleteModal();
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-hidden />

          {/* Card */}
          <div className="relative w-full max-w-lg rounded-3xl border border-red-500/20 bg-[#0a0f1a]/95 backdrop-blur-3xl shadow-[0_0_80px_-20px_rgba(239,68,68,0.4)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            {/* Red glow ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" aria-hidden />
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-red-500/10 blur-[80px] pointer-events-none" aria-hidden />

            <div className="relative p-8 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black tracking-[0.3em] text-red-400 uppercase">
                    {deleteStep === 1 ? "Étape 1 / 2 — Avertissement" : "Étape 2 / 2 — Confirmation finale"}
                  </p>
                  <h2 id="delete-modal-title" className="mt-1 text-2xl font-black italic uppercase tracking-tight text-white leading-tight">
                    Supprimer ce hackathon ?
                  </h2>
                </div>
              </div>

              {/* Target summary */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-2">
                <p className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase">Cible</p>
                <p className="text-lg font-black italic uppercase text-white leading-tight break-words">
                  {deleteTarget.title}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/5">
                    {deleteTarget.status}
                  </span>
                  {deleteTarget.specialty && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {deleteTarget.specialty}
                    </span>
                  )}
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-white/40">
                    {deleteTarget._count?.participants || 0} participant{(deleteTarget._count?.participants || 0) > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Step 1 — warning */}
              {deleteStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-white/70 leading-relaxed">
                    Cette action est <span className="font-black text-red-400 uppercase tracking-wider">irréversible</span>. Vont être supprimés:
                  </p>
                  <ul className="space-y-2 text-sm text-white/60">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">▸</span>
                      <span>Toutes les équipes, membres et invitations liées</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">▸</span>
                      <span>Tous les checkpoints et soumissions ({deleteTarget._count?.participants || 0} participant(s))</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">▸</span>
                      <span>Les notifications associées (les logs blockchain restent archivés)</span>
                    </li>
                    {deleteTarget.rewardPool > 0 &&
                      deleteTarget.status !== "COMPLETED" &&
                      deleteTarget.status !== "ARCHIVED" && (
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-0.5">↺</span>
                          <span className="text-emerald-300">
                            <span className="font-black">{deleteTarget.rewardPool} ARENA</span> seront restitués au créateur (refund escrow on-chain).
                          </span>
                        </li>
                      )}
                  </ul>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={closeDeleteModal}
                      className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-[11px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-300 transition-all"
                    >
                      Continuer →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 — type-to-confirm */}
              {deleteStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-white/70 leading-relaxed">
                    Pour confirmer, saisis exactement le titre du hackathon ci-dessous:
                  </p>
                  <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-xs font-mono text-cyan-400 break-words select-all">{deleteTarget.title}</p>
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Saisir le titre ici..."
                    disabled={deleting}
                    className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 focus:bg-white/[0.07] rounded-xl px-4 py-3.5 text-sm font-mono text-white outline-none transition-all placeholder:text-white/20 disabled:opacity-50"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        deleteConfirmText.trim() === deleteTarget.title &&
                        !deleting
                      ) {
                        confirmDeleteCompetition();
                      }
                    }}
                  />

                  {deleteResultMsg && (
                    <div
                      className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest ${
                        deleteResultMsg.startsWith("Suppression impossible")
                          ? "bg-red-500/10 border border-red-500/30 text-red-400"
                          : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      {deleteResultMsg}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setDeleteStep(1);
                        setDeleteConfirmText("");
                        setDeleteResultMsg(null);
                      }}
                      disabled={deleting}
                      className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all disabled:opacity-50"
                    >
                      ← Retour
                    </button>
                    <button
                      onClick={confirmDeleteCompetition}
                      disabled={
                        deleting ||
                        deleteConfirmText.trim() !== deleteTarget.title
                      }
                      className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-400 text-black text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-red-500/30 disabled:bg-red-500/20 disabled:text-red-300/40 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      {deleting ? "Suppression..." : "Supprimer définitivement"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───── Create Hackathon Modal (enhanced, themed) ───── */}
      {showCreateForm && (
        <CreateHackathonModal
          form={compForm}
          setForm={setCompForm}
          loading={createLoading}
          error={error}
          onClose={() => { if (!createLoading) { setShowCreateForm(false); setError(null); } }}
          onSubmit={handleCreateCompetition}
        />
      )}

      {/* ───── Certificates List Modal ───── */}
      {showCertList && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-list-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCertList(false); }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-hidden />

          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-amber-500/20 bg-[#0a0f1a]/95 backdrop-blur-3xl shadow-[0_0_80px_-20px_rgba(245,158,11,0.4)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" aria-hidden />
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" aria-hidden />

            {/* Header */}
            <div className="relative px-6 md:px-8 pt-6 pb-4 border-b border-white/5 shrink-0 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black tracking-[0.3em] text-amber-400 uppercase">Audit</p>
                  <h2 id="cert-list-modal-title" className="mt-1 text-xl md:text-2xl font-black italic uppercase tracking-tight text-white leading-tight">
                    Certificats émis ({certList.length})
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setShowCertList(false)}
                className="shrink-0 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="px-6 md:px-8 py-3 border-b border-white/5 shrink-0 bg-black/20">
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input
                  value={certListQuery}
                  onChange={(e) => setCertListQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setCertListLoading(true);
                      adminListCertificates({ limit: 100, q: certListQuery })
                        .then((d) => setCertList(d.certificates))
                        .catch((err) => setCertListError(err?.message ?? "Erreur"))
                        .finally(() => setCertListLoading(false));
                    }
                  }}
                  placeholder="Filtrer par nom, email, hackathon, tokenId... (Enter pour appliquer)"
                  className="w-full bg-white/5 border border-white/10 focus:border-amber-500/50 pl-10 pr-4 py-2.5 rounded-xl text-sm font-mono text-white outline-none placeholder:text-white/20 transition-all"
                />
              </div>
            </div>

            {/* List body */}
            <div className="relative flex-1 overflow-y-auto px-6 md:px-8 py-5">
              {certListLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  <p className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Chargement…</p>
                </div>
              ) : certListError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center text-red-300 text-sm font-mono">
                  {certListError}
                </div>
              ) : certList.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
                  <p className="text-white/60 font-black italic uppercase tracking-tight text-lg">Aucun certificat émis</p>
                  <p className="text-[10px] text-white/30 mt-2 uppercase tracking-widest">Ils apparaîtront ici après le premier mint.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {certList.map((c) => (
                    <li key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] hover:border-amber-500/30 hover:bg-white/[0.05] transition-all p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      {/* User */}
                      <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-600/20 border border-amber-500/30 flex items-center justify-center text-sm font-black text-amber-200 shrink-0">
                          {(c.user.firstName?.[0] || "?")}{(c.user.lastName?.[0] || "")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate">{c.user.firstName} {c.user.lastName}</p>
                          <p className="text-[10px] text-white/40 font-mono truncate">{c.user.email}</p>
                        </div>
                      </div>

                      {/* Hackathon */}
                      <div className="md:col-span-3 min-w-0">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Hackathon</p>
                        <p className="text-sm font-black italic uppercase text-cyan-300 truncate">{c.hackathonName}</p>
                      </div>

                      {/* Token */}
                      <div className="md:col-span-2">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Token / Serial</p>
                        <p className="text-xs font-mono text-white/70 truncate">{c.tokenId}</p>
                        <p className="text-[10px] font-mono text-amber-400">#{c.serial}</p>
                      </div>

                      {/* Date */}
                      <div className="md:col-span-1">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Date</p>
                        <p className="text-[10px] font-mono text-white/60">
                          {new Date(c.mintedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-1.5">
                        <a
                          href={c.imageIpfsUrl.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${c.imageIpfsUrl.replace("ipfs://", "")}` : c.imageIpfsUrl}
                          target="_blank" rel="noopener noreferrer"
                          title="Voir l'image IPFS"
                          className="px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-cyan-300 transition-all"
                        >
                          IPFS
                        </a>
                        <a
                          href={`https://hashscan.io/testnet/token/${c.tokenId}`}
                          target="_blank" rel="noopener noreferrer"
                          title="Voir sur HashScan"
                          className="px-2 py-1.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-[9px] font-black uppercase tracking-widest text-violet-300"
                        >
                          Hash
                        </a>
                        <span
                          className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${c.transferredToWallet ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-amber-500/10 border-amber-500/30 text-amber-300"}`}
                          title={c.transferredToWallet ? `Transféré à ${c.recipientAccountId}` : "En attente d'association du token"}
                        >
                          {c.transferredToWallet ? "✓ Sent" : "Pending"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="relative px-6 md:px-8 py-4 border-t border-white/5 bg-black/30 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                {certList.length} certificat{certList.length > 1 ? "s" : ""}
              </p>
              <button
                onClick={() => setShowCertList(false)}
                className="py-2.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────────

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${active ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
    >
      {icon}
      <span className={`text-[11px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
      {active && <div className="ml-auto w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>}
    </button>
  );
}

function MetricCard({ label, value, subValue, color }: { label: string, value: string | number, subValue: string, color: 'cyan' | 'emerald' | 'amber' | 'violet' }) {
  const colorMap = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  };
  return (
    <div className={`p-6 rounded-3xl border backdrop-blur-xl ${colorMap[color]} transition-transform hover:scale-[1.02] duration-300 cursor-default`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-4xl font-black italic tracking-tighter leading-none">{value}</p>
        <span className="text-[8px] font-bold opacity-40 uppercase mb-1">{subValue}</span>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-4 w-1 bg-cyan-500"></div>
      <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white/40">{title}</h2>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-amber-500/20 text-amber-300",
  OPEN_FOR_ENTRY: "bg-emerald-500/20 text-emerald-300",
  RUNNING: "bg-cyan-500/20 text-cyan-300",
  SUBMISSION_CLOSED: "bg-orange-500/20 text-orange-300",
  EVALUATING: "bg-violet-500/20 text-violet-300",
  COMPLETED: "bg-blue-500/20 text-blue-300",
  ARCHIVED: "bg-white/10 text-white/40",
};

function getNextStatus(status: string): CompetitionStatus | null {
  const flow: Record<string, CompetitionStatus | null> = {
    SCHEDULED: "OPEN_FOR_ENTRY",
    OPEN_FOR_ENTRY: "RUNNING",
    RUNNING: "SUBMISSION_CLOSED",
    SUBMISSION_CLOSED: "EVALUATING",
    EVALUATING: "COMPLETED",
    COMPLETED: "ARCHIVED",
    ARCHIVED: null,
  };
  return flow[status] || null;
}

function getNextStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: "Ouvrir",
    OPEN_FOR_ENTRY: "Lancer",
    RUNNING: "Fermer",
    SUBMISSION_CLOSED: "Évaluer",
    EVALUATING: "Calculer",
    COMPLETED: "Archiver",
  };
  return labels[status] || "Suivant";
}
