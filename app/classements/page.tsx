"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PlatformNavbar from "../components/PlatformNavbar";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { translations } from "../lib/translations";
import { getLeaderboard, getProfile, type LeaderboardUser, type UserProfile } from "../lib/api";

export default function ClassementsPage() {
  const { lang } = useAccessibility();
  const t = translations[lang];

  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 20;

  useEffect(() => {
    getProfile()
      .then((profile: UserProfile) => setCurrentUserId(profile.id ?? null))
      .catch(() => setCurrentUserId(null));
  }, []);

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    const TIMEOUT_MS = 25_000;
    const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    setError(null);

    getLeaderboard(ctrl.signal)
      .then((data) => {
        if (!alive) return;
        const raw = data && typeof data === "object" && "users" in data ? (data as { users: unknown }).users : [];
        setUsers(Array.isArray(raw) ? raw : []);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const name = err instanceof DOMException ? err.name : "";
        const isAbort =
          name === "AbortError" ||
          (err && typeof err === "object" && "message" in err && typeof (err as { message?: string }).message === "string" && /abort/i.test((err as { message: string }).message));
        const msg = isAbort
          ? "Délai dépassé ou API injoignable."
          : err && typeof err === "object" && "message" in err && typeof (err as { message?: string }).message === "string"
            ? (err as { message: string }).message
            : "Impossible de charger le classement";
        setError(msg);
        setUsers([]);
      })
      .finally(() => {
        clearTimeout(timer);
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      ctrl.abort();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
    setPage((p) => Math.min(Math.max(1, p), tp));
  }, [users.length]);

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const paginatedUsers = users.slice(startIndex, endIndex);

  const top3 = users.slice(0, 3);

  const getInitials = (firstName: string, lastName: string) => {
    const a = (firstName ?? "").trim();
    const b = (lastName ?? "").trim();
    return `${a.charAt(0) || "?"}${b.charAt(0) || ""}`.toUpperCase();
  };

  const getColor = (index: number) => {
    const colors = [
      "from-cyan-400 to-blue-600",
      "from-violet-500 to-purple-600",
      "from-emerald-500 to-green-600",
      "from-orange-500 to-amber-600",
      "from-blue-600 to-indigo-600",
      "from-pink-500 to-rose-600",
      "from-teal-500 to-cyan-600",
    ];
    return colors[index % colors.length];
  };

  const podiumMeta = (rank: number) => {
    if (rank === 1) return { medal: "🥇", ring: "ring-amber-400/60", glow: "shadow-[0_0_60px_-10px_rgba(251,191,36,0.5)]", color: "from-amber-400 to-yellow-600", border: "border-amber-400/40", label: t.ranking.firstPlace };
    if (rank === 2) return { medal: "🥈", ring: "ring-slate-300/50", glow: "shadow-[0_0_40px_-12px_rgba(203,213,225,0.4)]", color: "from-slate-300 to-slate-500", border: "border-slate-300/30", label: t.ranking.secondPlace };
    if (rank === 3) return { medal: "🥉", ring: "ring-amber-700/50", glow: "shadow-[0_0_40px_-12px_rgba(180,83,9,0.4)]", color: "from-amber-700 to-orange-800", border: "border-amber-700/30", label: t.ranking.thirdPlace };
    return { medal: "", ring: "ring-white/10", glow: "", color: "from-white/10 to-white/5", border: "border-white/10", label: `#${rank}` };
  };

  return (
    <div className="min-h-screen text-white font-sans relative">
      <PlatformNavbar />

      <main className="max-w-5xl mx-auto px-6 md:px-8 py-10 relative z-10">
        {/* Header */}
        <div className="mb-10 flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.3em] text-amber-400 uppercase">Hall of Fame</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black italic uppercase tracking-tight text-white leading-tight">
              {t.ranking.weekly}
            </h1>
            <p className="mt-1 text-sm text-white/40">{t.ranking.subtitle}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Chargement…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-xl p-8 text-center">
            <p className="text-red-300 font-mono text-sm">{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center mb-4">
              <span className="text-3xl opacity-60">🏆</span>
            </div>
            <p className="text-white/80 text-lg font-black italic uppercase tracking-tight">
              {lang === "fr" && "Aucun codeur dans le classement"}
              {lang === "en" && "No developers on the leaderboard yet"}
              {lang === "ar" && "لا يوجد مطورون في التصنيف بعد"}
            </p>
            <p className="mt-2 text-sm text-white/40">
              {lang === "fr" && "Reviens plus tard ou inscris-toi pour apparaître ici."}
              {lang === "en" && "Check back later or sign up to appear here."}
              {lang === "ar" && "عد لاحقًا أو سجّل لتظهر في القائمة."}
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <div className="relative mb-16">
                <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" aria-hidden />
                <div className="relative flex items-end justify-center gap-3 sm:gap-6 md:gap-10">
                  {top3.map((coder) => {
                    const meta = podiumMeta(coder.rank);
                    const sizeClass = coder.rank === 1 ? "w-24 h-24 md:w-28 md:h-28 text-2xl" : "w-20 h-20 md:w-24 md:h-24 text-xl";
                    const heightOffset = coder.rank === 1 ? "-mt-6 md:-mt-10" : coder.rank === 2 ? "mt-2" : "mt-4";
                    const order = coder.rank === 1 ? "order-2" : coder.rank === 2 ? "order-1" : "order-3";
                    return (
                      <div key={coder.id} className={`flex flex-col items-center ${order} ${heightOffset}`}>
                        <span className="text-3xl md:text-4xl mb-2" aria-hidden>{meta.medal}</span>
                        <div className={`relative ${meta.glow}`}>
                          <div className={`${sizeClass} rounded-full bg-gradient-to-br ${meta.color} flex items-center justify-center font-black text-white/95 ring-4 ${meta.ring} ring-offset-4 ring-offset-[#0a0f1a] transition-transform hover:scale-105`}>
                            {getInitials(coder.firstName, coder.lastName)}
                          </div>
                        </div>
                        <p className="mt-4 text-sm md:text-base font-black italic uppercase tracking-tight text-white text-center px-2 truncate max-w-[140px]">
                          {coder.firstName} {(coder.lastName ?? "").charAt(0)}
                          {(coder.lastName ?? "").length > 0 ? "." : ""}
                        </p>
                        <p className="text-[10px] font-mono text-amber-400/80 tracking-widest mt-0.5">
                          {Number(coder.xp ?? 0).toLocaleString()} XP
                        </p>
                        {coder.mainSpecialty && (
                          <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/40">
                            {coder.mainSpecialty}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leaderboard list */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" aria-hidden />

              {/* Header row */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 bg-black/20">
                <div className="col-span-1 text-[10px] font-black text-white/30 uppercase tracking-widest">{t.ranking.rank}</div>
                <div className="col-span-5 text-[10px] font-black text-white/30 uppercase tracking-widest">{t.ranking.coder}</div>
                <div className="col-span-2 text-[10px] font-black text-white/30 uppercase tracking-widest">{t.ranking.experience}</div>
                <div className="col-span-2 text-[10px] font-black text-white/30 uppercase tracking-widest">Spécialité</div>
                <div className="col-span-2 text-[10px] font-black text-white/30 uppercase tracking-widest text-right">{t.ranking.actions}</div>
              </div>

              <ul className="divide-y divide-white/5">
                {paginatedUsers.map((user) => {
                  const isCurrentUser = user.id === currentUserId;
                  const meta = podiumMeta(user.rank);
                  return (
                    <li
                      key={user.id}
                      className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center px-6 py-4 transition-all ${
                        isCurrentUser
                          ? "bg-cyan-500/10 border-l-2 border-l-cyan-400"
                          : "hover:bg-white/5"
                      }`}
                    >
                      {/* Rank */}
                      <div className="md:col-span-1 flex items-center gap-2">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest md:hidden">Rang</span>
                        <span className={`text-sm font-black ${user.rank <= 3 ? "text-amber-400" : "text-white/60"} font-mono`}>
                          #{String(user.rank).padStart(2, "0")}
                        </span>
                        {user.rank <= 3 && <span aria-hidden>{meta.medal}</span>}
                      </div>

                      {/* Coder */}
                      <div className="md:col-span-5 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getColor(user.rank)} flex items-center justify-center text-xs font-black text-white shrink-0`}>
                          {getInitials(user.firstName, user.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm flex items-center gap-2 truncate">
                            <span className="truncate">{user.firstName} {user.lastName}</span>
                            {isCurrentUser && (
                              <span className="shrink-0 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase tracking-widest border border-cyan-500/30">
                                {t.ranking.you}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-white/30 font-mono tracking-tight truncate">{user.mainSpecialty}</p>
                        </div>
                      </div>

                      {/* XP */}
                      <div className="md:col-span-2 flex items-center gap-2">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest md:hidden">XP</span>
                        <span className="text-sm font-black text-cyan-400 font-mono tracking-tight">
                          {Number(user.xp ?? 0).toLocaleString()} <span className="text-[10px] text-cyan-400/60">XP</span>
                        </span>
                      </div>

                      {/* Specialty */}
                      <div className="md:col-span-2">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50">
                          {user.mainSpecialty}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="md:col-span-2 flex items-center justify-end">
                        {isCurrentUser ? (
                          <Link
                            href="/profile"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 text-black font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                          >
                            {t.ranking.viewStats}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
                            aria-label="Menu"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/5 bg-black/20">
                <p className="text-[10px] font-mono text-white/40 tracking-tight">
                  {t.ranking.showing} <span className="text-white/70">{startIndex + 1}-{Math.min(endIndex, users.length)}</span> {t.ranking.coders} <span className="text-white/70">{users.length}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                    aria-label="Page précédente"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="px-3 text-[10px] font-black font-mono text-white/80 tracking-widest uppercase min-w-[5rem] text-center">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                    aria-label="Page suivante"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
