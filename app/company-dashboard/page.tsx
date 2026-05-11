"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlatformNavbar from "../components/PlatformNavbar";
import RecruitmentDashboard from "../components/company/RecruitmentDashboard";
import CreateHackathonModal from "../components/dashboard/CreateHackathonModal";
import {
  getToken,
  getProfile,
  getCompetitions,
  createCompetition,
  changeCompetitionStatus,
  deleteCompetition,
  type Competition,
  type CompetitionStatus,
  type CreateCompetitionPayload,
} from "../lib/api";

type View = "OVERVIEW" | "MY_HACKATHONS" | "RECRUITMENT";

type ProfileLite = {
  id?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<View>("OVERVIEW");
  const [user, setUser] = useState<ProfileLite | null>(null);

  // Data
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [compLoading, setCompLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compSuccess, setCompSuccess] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
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

  // Delete modal (two-step, themed — same UX as admin)
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteResultMsg, setDeleteResultMsg] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/signin");
      return;
    }
    setLoading(true);
    getProfile()
      .then((profile: ProfileLite) => {
        if (profile?.role !== "COMPANY" && profile?.role !== "ADMIN") {
          router.push("/hackathon");
          return;
        }
        setUser(profile);
        return loadCompetitions();
      })
      .catch((err) => setError(err?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadCompetitions = async () => {
    setCompLoading(true);
    try {
      const res = await getCompetitions({ limit: 100 });
      setCompetitions(res.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Erreur de chargement des hackathons");
    } finally {
      setCompLoading(false);
    }
  };

  const resetCreateForm = () =>
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

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError(null);
    setCompSuccess(null);
    try {
      await createCompetition(compForm);
      setCompSuccess("Hackathon créé avec succès");
      setShowCreate(false);
      resetCreateForm();
      await loadCompetitions();
      setActiveView("MY_HACKATHONS");
    } catch (err: any) {
      setError(err?.message ?? "Erreur de création");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: CompetitionStatus) => {
    try {
      await changeCompetitionStatus(id, newStatus);
      await loadCompetitions();
    } catch (err: any) {
      alert(err?.message ?? "Erreur");
    }
  };

  // ─── Delete flow ───
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
      setCompetitions((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteResultMsg(
        res.refundedAmount > 0
          ? `Hackathon supprimé. ${res.refundedAmount} ARENA restitués.`
          : `Hackathon supprimé.`,
      );
      setTimeout(() => closeDeleteModal(), 1400);
    } catch (err: any) {
      setDeleteResultMsg("Suppression impossible : " + (err?.message ?? "erreur inconnue"));
    } finally {
      setDeleting(false);
    }
  };

  // ─── Derived ───
  const filteredCompetitions = competitions.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: competitions.length,
    active: competitions.filter((c) => ["OPEN_FOR_ENTRY", "RUNNING", "EVALUATING"].includes(c.status)).length,
    participants: competitions.reduce((acc, c) => acc + (c._count?.participants || 0), 0),
    completed: competitions.filter((c) => c.status === "COMPLETED").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PlatformNavbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <p className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-cyan-500/30 relative">
      <PlatformNavbar />

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 border-r border-white/5 bg-[#0d1117]/80 backdrop-blur-xl hidden md:flex flex-col p-6 gap-8 shrink-0">
          <div className="space-y-2 px-2">
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">Entreprise</p>
            <h2 className="text-lg font-black italic uppercase text-white truncate">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-[9px] text-white/30 font-mono">ID: {user?.id?.slice(-8)}</p>
          </div>

          <div className="space-y-6">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">Navigation</p>
            <nav className="space-y-1">
              <SidebarItem
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                label="Vue d'ensemble"
                active={activeView === "OVERVIEW"}
                onClick={() => setActiveView("OVERVIEW")}
              />
              <SidebarItem
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                label="Mes Hackathons"
                active={activeView === "MY_HACKATHONS"}
                onClick={() => setActiveView("MY_HACKATHONS")}
              />
              <SidebarItem
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                label="Recrutement"
                active={activeView === "RECRUITMENT"}
                onClick={() => setActiveView("RECRUITMENT")}
              />
            </nav>
          </div>

          <div className="mt-auto p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 space-y-2 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Mode Entreprise</p>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed font-mono">
              Création illimitée d'événements et accès au pool de talents.
            </p>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 overflow-auto p-6 lg:p-12 relative z-10">
          {/* Header */}
          <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                Company <span className="text-cyan-400">Control</span> Panel
              </h1>
              <p className="text-[10px] text-white/30 tracking-[0.4em] uppercase mt-2">Arena of Coders · Espace Entreprise</p>
            </div>
            <button
              onClick={() => { setShowCreate(true); setError(null); setCompSuccess(null); }}
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest shadow-lg shadow-cyan-500/20 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              CRÉER HACKATHON
            </button>
          </div>

          {compSuccess && (
            <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-300 animate-in slide-in-from-top-2 fade-in">
              ✓ {compSuccess}
            </div>
          )}

          {/* ─── OVERVIEW ─── */}
          {activeView === "OVERVIEW" && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard label="Total Events" value={stats.total} subValue="Historique complet" color="cyan" />
                <MetricCard label="Actifs" value={stats.active} subValue="En cours" color="emerald" />
                <MetricCard label="Talents Réunis" value={stats.participants} subValue="Inscriptions" color="amber" />
                <MetricCard label="Terminés" value={stats.completed} subValue="Challenges clos" color="violet" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                  <SectionTitle title="État de vos Hackathons" />
                  <div className="space-y-3">
                    {competitions.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-10 text-center">
                        <p className="text-white/60 font-black italic uppercase tracking-tight">Aucun hackathon créé pour l'instant</p>
                        <p className="text-[10px] text-white/30 mt-2 uppercase tracking-widest">Clique sur « Créer hackathon » pour démarrer.</p>
                      </div>
                    ) : (
                      competitions.slice(0, 4).map((c) => (
                        <div
                          key={c.id}
                          className="bg-white/[0.03] border border-white/10 backdrop-blur-xl p-5 rounded-2xl flex items-center justify-between gap-4 hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex gap-2 items-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${STATUS_COLOR[c.status] || "bg-white/10 text-white/60"}`}>
                                {c.status}
                              </span>
                              <span className="text-[8px] border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">{c.specialty}</span>
                            </div>
                            <h3 className="text-base font-black italic uppercase text-white truncate">{c.title}</h3>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Participants</p>
                            <p className="text-xl font-black text-white">{c._count?.participants || 0}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {competitions.length > 4 && (
                    <button
                      onClick={() => setActiveView("MY_HACKATHONS")}
                      className="text-xs font-black text-cyan-400 uppercase tracking-widest hover:text-cyan-300 transition-all inline-flex items-center gap-2"
                    >
                      Voir tous vos hackathons
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  <SectionTitle title="Statistiques Talents" />
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 space-y-5">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Engagements actifs</p>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500/70 rounded-full transition-all duration-1000" style={{ width: `${stats.total ? Math.min(100, (stats.active / Math.max(1, stats.total)) * 100) : 0}%` }} />
                      </div>
                      <p className="text-[9px] font-mono text-white/30">
                        {stats.active} / {stats.total} hackathons actifs
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                      <div>
                        <p className="text-2xl font-black italic text-white">{stats.participants}</p>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Inscrits</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black italic text-cyan-400">{stats.completed}</p>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Complétés</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── MY HACKATHONS ─── */}
          {activeView === "MY_HACKATHONS" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    placeholder="Chercher parmi vos hackathons..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-white placeholder:text-white/20"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 outline-none min-w-[180px] text-white"
                >
                  <option value="">Tous les statuts</option>
                  <option value="OPEN_FOR_ENTRY">Ouvert</option>
                  <option value="RUNNING">En cours</option>
                  <option value="EVALUATING">Évaluation</option>
                  <option value="COMPLETED">Terminé</option>
                  <option value="ARCHIVED">Archivé</option>
                </select>
              </div>

              {compLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                  <p className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Chargement…</p>
                </div>
              ) : filteredCompetitions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-12 text-center">
                  <p className="text-white/60 font-black italic uppercase tracking-tight">Aucun hackathon trouvé</p>
                  <p className="text-[10px] text-white/30 mt-2 uppercase tracking-widest">Modifie tes filtres ou crée-en un nouveau.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCompetitions.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 hover:border-white/20 transition-all"
                    >
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${STATUS_COLOR[c.status] || "bg-white/10 text-white/60"}`}>
                            {c.status}
                          </span>
                          <span className="text-[8px] border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">{c.specialty}</span>
                        </div>
                        <h3 className="text-lg font-black italic uppercase text-white leading-tight">{c.title}</h3>
                        <p className="text-xs text-white/40 font-mono line-clamp-1">{c.description}</p>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Participants</p>
                          <p className="text-xl font-black text-white">{c._count?.participants || 0}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Budget (XC)</p>
                          <p className="text-xl font-black text-cyan-400">{c.rewardPool}</p>
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
                          <Link
                            href={`/hackathon/${c.id}/details`}
                            className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                          >
                            Gérer
                          </Link>
                          <button
                            onClick={() => openDeleteModal(c)}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── RECRUITMENT ─── */}
          {activeView === "RECRUITMENT" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <RecruitmentDashboard />
            </div>
          )}
        </main>
      </div>

      {/* ─── Create Hackathon Modal (shared) ─── */}
      {showCreate && (
        <CreateHackathonModal
          form={compForm}
          setForm={setCompForm}
          loading={createLoading}
          error={error}
          onClose={() => { if (!createLoading) { setShowCreate(false); setError(null); } }}
          onSubmit={handleCreateCompetition}
        />
      )}

      {/* ─── Delete Hackathon Modal (two-step, themed) ─── */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="company-delete-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeDeleteModal(); }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-hidden />
          <div className="relative w-full max-w-lg rounded-3xl border border-red-500/20 bg-[#0a0f1a]/95 backdrop-blur-3xl shadow-[0_0_80px_-20px_rgba(239,68,68,0.4)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" aria-hidden />
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-red-500/10 blur-[80px] pointer-events-none" aria-hidden />
            <div className="relative p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black tracking-[0.3em] text-red-400 uppercase">
                    {deleteStep === 1 ? "Étape 1 / 2" : "Étape 2 / 2 — Confirmation finale"}
                  </p>
                  <h2 id="company-delete-modal-title" className="mt-1 text-2xl font-black italic uppercase tracking-tight text-white leading-tight">
                    Supprimer ce hackathon ?
                  </h2>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-2">
                <p className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase">Cible</p>
                <p className="text-lg font-black italic uppercase text-white break-words">{deleteTarget.title}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/5">{deleteTarget.status}</span>
                  {deleteTarget.specialty && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{deleteTarget.specialty}</span>
                  )}
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-white/40">{deleteTarget._count?.participants || 0} participant(s)</span>
                </div>
              </div>

              {deleteStep === 1 ? (
                <div className="space-y-4">
                  <p className="text-sm text-white/70 leading-relaxed">
                    Cette action est <span className="font-black text-red-400 uppercase tracking-wider">irréversible</span>. Vont être supprimés:
                  </p>
                  <ul className="space-y-2 text-sm text-white/60">
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span> Équipes, membres et invitations</li>
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span> Checkpoints et soumissions</li>
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span> Notifications associées (logs blockchain archivés)</li>
                    {deleteTarget.rewardPool > 0 && deleteTarget.status !== "COMPLETED" && deleteTarget.status !== "ARCHIVED" && (
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">↺</span>
                        <span className="text-emerald-300"><span className="font-black">{deleteTarget.rewardPool} ARENA</span> restitués au créateur.</span>
                      </li>
                    )}
                  </ul>
                  <div className="flex gap-3 pt-2">
                    <button onClick={closeDeleteModal} className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all">Annuler</button>
                    <button onClick={() => setDeleteStep(2)} className="flex-1 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-[11px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-300 transition-all">Continuer →</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-white/70">Pour confirmer, saisis exactement le titre du hackathon:</p>
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
                    className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3.5 text-sm font-mono text-white outline-none transition-all placeholder:text-white/20 disabled:opacity-50"
                    onKeyDown={(e) => { if (e.key === "Enter" && deleteConfirmText.trim() === deleteTarget.title && !deleting) confirmDeleteCompetition(); }}
                  />
                  {deleteResultMsg && (
                    <div className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest ${deleteResultMsg.startsWith("Suppression impossible") ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"}`}>{deleteResultMsg}</div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { setDeleteStep(1); setDeleteConfirmText(""); setDeleteResultMsg(null); }} disabled={deleting} className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all disabled:opacity-50">← Retour</button>
                    <button onClick={confirmDeleteCompetition} disabled={deleting || deleteConfirmText.trim() !== deleteTarget.title} className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-400 text-black text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-red-500/30 disabled:bg-red-500/20 disabled:text-red-300/40 disabled:shadow-none disabled:cursor-not-allowed">
                      {deleting ? "Suppression..." : "Supprimer définitivement"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HELPER COMPONENTS — matched to admin dashboard style
// ─────────────────────────────────────────────────────────────────

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        active
          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
          : "text-white/40 border border-transparent hover:bg-white/5 hover:text-white/80"
      }`}
    >
      <span className={active ? "text-cyan-400" : "text-white/40"}>{icon}</span>
      <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "opacity-100" : "opacity-80"}`}>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
    </button>
  );
}

const METRIC_COLOR: Record<string, { ring: string; text: string; bg: string }> = {
  cyan: { ring: "hover:border-cyan-500/30", text: "text-cyan-400", bg: "bg-cyan-500/10" },
  emerald: { ring: "hover:border-emerald-500/30", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  amber: { ring: "hover:border-amber-500/30", text: "text-amber-400", bg: "bg-amber-500/10" },
  violet: { ring: "hover:border-violet-500/30", text: "text-violet-400", bg: "bg-violet-500/10" },
};

function MetricCard({
  label,
  value,
  subValue,
  color = "cyan",
}: {
  label: string;
  value: string | number;
  subValue: string;
  color?: "cyan" | "emerald" | "amber" | "violet";
}) {
  const c = METRIC_COLOR[color];
  return (
    <div className={`relative p-6 rounded-2xl border bg-white/[0.03] border-white/10 backdrop-blur-xl transition-all duration-300 ${c.ring}`}>
      <div className={`absolute top-0 right-0 w-20 h-20 ${c.bg} blur-2xl rounded-full -z-10`} />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">{label}</p>
      <p className="text-4xl font-black italic tracking-tighter leading-none text-white">{value}</p>
      <p className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${c.text}`}>{subValue}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-4 w-1 bg-cyan-500 rounded-full" />
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{title}</h2>
      <span className="flex-1 h-px bg-white/5" />
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-white/10 text-white/60",
  OPEN_FOR_ENTRY: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
  RUNNING: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/20",
  SUBMISSION_CLOSED: "bg-amber-500/20 text-amber-400 border border-amber-500/20",
  EVALUATING: "bg-violet-500/20 text-violet-400 border border-violet-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/10",
  ARCHIVED: "bg-white/5 text-white/30",
};

function getNextStatus(status: string): CompetitionStatus | null {
  switch (status) {
    case "SCHEDULED": return "OPEN_FOR_ENTRY";
    case "OPEN_FOR_ENTRY": return "RUNNING";
    case "RUNNING": return "SUBMISSION_CLOSED";
    case "SUBMISSION_CLOSED": return "EVALUATING";
    case "EVALUATING": return "COMPLETED";
    case "COMPLETED": return "ARCHIVED";
    default: return null;
  }
}

function getNextStatusLabel(status: string): string {
  switch (status) {
    case "SCHEDULED": return "Ouvrir";
    case "OPEN_FOR_ENTRY": return "Lancer";
    case "RUNNING": return "Clore";
    case "SUBMISSION_CLOSED": return "Évaluer";
    case "EVALUATING": return "Compléter";
    case "COMPLETED": return "Archiver";
    default: return "—";
  }
}
