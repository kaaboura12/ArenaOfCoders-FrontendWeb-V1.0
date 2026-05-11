"use client";

import { useState } from "react";
import type {
  CompetitionDifficulty,
  CreateCompetitionPayload,
  Specialty,
} from "@/app/lib/api";

// ─────────────────────────────────────────────────────────────────
// Visual metadata for specialty / difficulty pickers
// ─────────────────────────────────────────────────────────────────

export const SPECIALTY_META: Record<
  Specialty,
  { label: string; color: string; icon: React.ReactNode }
> = {
  FRONTEND: { label: "Frontend", color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> },
  BACKEND: { label: "Backend", color: "from-violet-500/20 to-indigo-500/10 border-violet-500/30 text-violet-300", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg> },
  FULLSTACK: { label: "Full-stack", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v3H4V6zM4 13a2 2 0 012-2h12a2 2 0 012 2v3H4v-3z"/></svg> },
  MOBILE: { label: "Mobile", color: "from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-300", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg> },
  DATA: { label: "Data", color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> },
  BI: { label: "BI", color: "from-yellow-500/20 to-amber-500/10 border-yellow-500/30 text-yellow-300", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg> },
  CYBERSECURITY: { label: "Cyber", color: "from-red-500/20 to-rose-500/10 border-red-500/30 text-red-300", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> },
  DESIGN: { label: "Design", color: "from-fuchsia-500/20 to-purple-500/10 border-fuchsia-500/30 text-fuchsia-300", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg> },
  DEVOPS: { label: "DevOps", color: "from-sky-500/20 to-cyan-500/10 border-sky-500/30 text-sky-300", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 2 4 4 4h8c2 0 4-2 4-4V7c0-2-2-4-4-4H8C6 3 4 5 4 7zm4 4l3 3 5-5"/></svg> },
  // Open to every user regardless of specialty
  OTHER: { label: "Open / All", color: "from-white/10 to-white/5 border-white/20 text-white", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
};

export const DIFFICULTY_META: Record<
  CompetitionDifficulty,
  { label: string; color: string; ring: string; description: string }
> = {
  EASY: { label: "Easy", color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300", ring: "ring-emerald-500", description: "Niveau accessible — bon pour débutants" },
  MEDIUM: { label: "Medium", color: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300", ring: "ring-amber-500", description: "Standard — challenge équilibré" },
  HARD: { label: "Hard", color: "from-red-500/20 to-red-500/5 border-red-500/30 text-red-300", ring: "ring-red-500", description: "Expert — pour devs confirmés" },
};

export interface CreateHackathonModalProps {
  form: CreateCompetitionPayload;
  setForm: React.Dispatch<React.SetStateAction<CreateCompetitionPayload>>;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function CreateHackathonModal({ form, setForm, loading, error, onClose, onSubmit }: CreateHackathonModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Derived validation
  const now = new Date();
  const start = form.startDate ? new Date(form.startDate) : null;
  const end = form.endDate ? new Date(form.endDate) : null;
  const durationMs = start && end ? end.getTime() - start.getTime() : 0;
  const durationHours = Math.round(durationMs / 36e5);
  const startsInMs = start ? start.getTime() - now.getTime() : 0;
  const startsInHours = Math.round(startsInMs / 36e5);

  const errStartPast = !!start && startsInMs < 0;
  const errEndBeforeStart = !!start && !!end && durationMs <= 0;

  const step1Valid =
    form.title.trim().length >= 3 &&
    form.description.trim().length >= 10 &&
    !!form.specialty &&
    !!form.difficulty;
  const step2Valid = !!form.startDate && !!form.endDate && !errStartPast && !errEndBeforeStart;
  const step3Valid =
    (form.rewardPool ?? 0) >= 0 &&
    (form.topN ?? 0) >= 1 &&
    (!form.maxParticipants || form.maxParticipants >= 1);
  const canSubmit = step1Valid && step2Valid && step3Valid && !loading;

  const formatDuration = (h: number) => {
    if (h < 1) return "< 1h";
    if (h < 48) return `${h}h`;
    return `${Math.round(h / 24)}j`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-hidden />

      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border border-cyan-500/20 bg-[#0a0f1a]/95 backdrop-blur-3xl shadow-[0_0_80px_-20px_rgba(0,212,255,0.4)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" aria-hidden />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" aria-hidden />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" aria-hidden />

        {/* Header + Stepper */}
        <div className="relative px-8 pt-7 pb-5 border-b border-white/5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">Nouveau Hackathon</p>
                <h2 id="create-modal-title" className="mt-1 text-2xl font-black italic uppercase tracking-tight text-white leading-tight truncate">
                  {form.title.trim() || "Sans titre"}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="shrink-0 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all disabled:opacity-30"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="mt-5 flex items-center gap-2" role="tablist" aria-label="Étapes">
            {[
              { n: 1, label: "Identité" },
              { n: 2, label: "Programmation" },
              { n: 3, label: "Récompense" },
            ].map((s, i) => (
              <button
                key={s.n}
                onClick={() => setStep(s.n as 1 | 2 | 3)}
                role="tab"
                aria-selected={step === s.n}
                className="flex-1 group text-left"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                    step === s.n
                      ? "bg-cyan-500 border-cyan-400 text-black shadow-lg shadow-cyan-500/30"
                      : step > s.n
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                      : "bg-white/5 border-white/10 text-white/30"
                  }`}>
                    {step > s.n ? "✓" : s.n}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                    step === s.n ? "text-white" : step > s.n ? "text-cyan-400/70" : "text-white/30"
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div className={`mt-2 h-px transition-colors ${step > s.n ? "bg-cyan-500/40" : "bg-white/5"}`} />}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 1 && step1Valid) { setStep(2); return; }
            if (step === 2 && step2Valid) { setStep(3); return; }
            if (step === 3 && canSubmit) { onSubmit(e); }
          }}
          className="relative flex-1 overflow-y-auto px-8 py-6 space-y-6"
        >
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-400">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Titre du Hackathon *</label>
                  <span className={`text-[10px] font-mono ${form.title.length > 80 ? "text-red-400" : "text-white/30"}`}>
                    {form.title.length}/80
                  </span>
                </div>
                <input
                  required
                  maxLength={80}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="EX: GLOBAL ARENA 2026"
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.07] p-4 rounded-xl text-white font-mono text-sm outline-none transition-all placeholder:text-white/20"
                />
                {form.title.length > 0 && form.title.trim().length < 3 && (
                  <p className="text-[10px] text-amber-400">Au moins 3 caractères.</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Description / Lore *</label>
                  <span className={`text-[10px] font-mono ${form.description.length > 600 ? "text-red-400" : "text-white/30"}`}>
                    {form.description.length}/600
                  </span>
                </div>
                <textarea
                  required
                  maxLength={600}
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Contexte du challenge, objectifs, contraintes techniques…"
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.07] p-4 rounded-xl text-white font-mono text-sm outline-none transition-all resize-none placeholder:text-white/20"
                />
                {form.description.length > 0 && form.description.trim().length < 10 && (
                  <p className="text-[10px] text-amber-400">Au moins 10 caractères.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Niveau de Danger *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["EASY", "MEDIUM", "HARD"] as const).map((d) => {
                    const meta = DIFFICULTY_META[d];
                    const selected = form.difficulty === d;
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                        className={`relative p-4 rounded-xl border bg-gradient-to-br text-left transition-all ${meta.color} ${
                          selected ? `ring-2 ring-offset-2 ring-offset-[#0a0f1a] ${meta.ring} scale-[1.02]` : "opacity-60 hover:opacity-100 hover:scale-[1.01]"
                        }`}
                      >
                        <p className="text-sm font-black uppercase tracking-widest">{meta.label}</p>
                        <p className="text-[9px] mt-1 opacity-80 leading-tight">{meta.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Spécialité Cible *</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(Object.keys(SPECIALTY_META) as Specialty[]).map((s) => {
                    const meta = SPECIALTY_META[s];
                    const selected = form.specialty === s;
                    const isOther = s === "OTHER";
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setForm((f) => ({ ...f, specialty: s }))}
                        title={isOther ? "Ouvert à toutes les spécialités" : meta.label}
                        className={`group p-3 rounded-xl border bg-gradient-to-br flex flex-col items-center gap-1.5 transition-all ${meta.color} ${
                          selected ? "ring-2 ring-offset-2 ring-offset-[#0a0f1a] ring-cyan-500 scale-[1.05]" : "opacity-50 hover:opacity-100 hover:scale-[1.02]"
                        } ${isOther ? "sm:col-span-2" : ""}`}
                      >
                        {meta.icon}
                        <span className="text-[9px] font-black uppercase tracking-widest">{meta.label}</span>
                        {isOther && (
                          <span className="text-[8px] font-bold normal-case tracking-normal opacity-70 text-center leading-tight">
                            Toutes spécialités
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Open-to-all notice */}
                {form.specialty === "OTHER" && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    <svg className="w-4 h-4 text-white/50 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      Ce hackathon sera <strong className="text-white/80">visible et accessible à tous les utilisateurs</strong>, quelle que soit leur spécialité. Tous les profils recevront une notification.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Début *</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className={`w-full bg-white/5 border focus:bg-white/[0.07] p-4 rounded-xl text-white text-sm outline-none transition-all ${
                      errStartPast ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-cyan-500/50"
                    }`}
                  />
                  {start && (
                    <p className={`text-[10px] ${errStartPast ? "text-red-400" : "text-white/30"}`}>
                      {errStartPast ? "⚠ Date dans le passé" : `Démarre dans ${formatDuration(startsInHours)}`}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Fin *</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className={`w-full bg-white/5 border focus:bg-white/[0.07] p-4 rounded-xl text-white text-sm outline-none transition-all ${
                      errEndBeforeStart ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-cyan-500/50"
                    }`}
                  />
                  {end && (
                    <p className={`text-[10px] ${errEndBeforeStart ? "text-red-400" : "text-emerald-400/70"}`}>
                      {errEndBeforeStart ? "⚠ Fin avant le début" : `Durée: ${formatDuration(durationHours)}`}
                    </p>
                  )}
                </div>
              </div>

              {start && !errStartPast && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest self-center mr-2">Raccourcis durée:</span>
                  {[
                    { h: 24, label: "24h" },
                    { h: 48, label: "48h" },
                    { h: 72, label: "72h" },
                    { h: 168, label: "1 semaine" },
                  ].map((opt) => (
                    <button
                      key={opt.h}
                      type="button"
                      onClick={() => {
                        const newEnd = new Date(start.getTime() + opt.h * 36e5);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        const iso = `${newEnd.getFullYear()}-${pad(newEnd.getMonth() + 1)}-${pad(newEnd.getDate())}T${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}`;
                        setForm((f) => ({ ...f, endDate: iso }));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/30 text-[10px] font-black uppercase tracking-widest text-white/60 transition-all"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Capacité max</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Illimité si vide"
                    value={form.maxParticipants ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        maxParticipants: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.07] p-4 rounded-xl text-white text-sm outline-none transition-all placeholder:text-white/20"
                  />
                  <p className="text-[10px] text-white/30">Nombre maximum de participants inscrits.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Top N gagnants</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, topN: Math.max(1, (f.topN ?? 5) - 1) }))}
                      className="w-10 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-black text-lg"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={form.topN ?? 5}
                      onChange={(e) => setForm((f) => ({ ...f, topN: Number(e.target.value) }))}
                      className="flex-1 bg-white/5 border border-white/10 focus:border-cyan-500/50 p-4 rounded-xl text-white text-sm outline-none text-center font-black"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, topN: Math.min(50, (f.topN ?? 5) + 1) }))}
                      className="w-10 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-black text-lg"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[10px] text-white/30">Affichés au leaderboard final.</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <span className="text-amber-400 text-xl">🏆</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black tracking-widest text-amber-400 uppercase">Reward Pool</p>
                    <p className="text-[10px] text-white/40">Arena Coins distribués aux gagnants — bloqués en escrow on-chain.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={form.rewardPool ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, rewardPool: Math.max(0, Number(e.target.value)) }))}
                    className="flex-1 bg-black/30 border border-amber-500/20 focus:border-amber-500/50 p-4 rounded-xl text-white text-2xl outline-none font-black text-center"
                  />
                  <span className="text-xs font-black uppercase tracking-widest text-amber-400">ARENA</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[0, 100, 500, 1000, 5000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, rewardPool: amount }))}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                        form.rewardPool === amount
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : "bg-white/5 border-white/10 text-white/40 hover:text-amber-400 hover:border-amber-500/30"
                      }`}
                    >
                      {amount === 0 ? "Aucune" : amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`space-y-4 rounded-2xl border p-5 transition-all ${
                form.antiCheatEnabled
                  ? "border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent"
                  : "border-white/5 bg-white/[0.02]"
              }`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative shrink-0 mt-1">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.antiCheatEnabled ?? false}
                      onChange={(e) => setForm((f) => ({ ...f, antiCheatEnabled: e.target.checked }))}
                    />
                    <div className="w-11 h-6 rounded-full bg-white/10 peer-checked:bg-orange-500/40 transition-colors" />
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white peer-checked:translate-x-5 transition-transform" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black uppercase tracking-widest text-white">Anti-triche IA</p>
                    <p className="text-[10px] text-white/40 mt-1">Vérification faciale + détection de plagiat + scoring IA sur les soumissions.</p>
                  </div>
                </label>

                {form.antiCheatEnabled && (
                  <div className="space-y-3 pt-2 border-t border-orange-500/10 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-orange-400">Seuil de confiance</span>
                      <span className="text-white font-mono">{form.antiCheatThreshold ?? 70}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={form.antiCheatThreshold ?? 70}
                      onChange={(e) => setForm((f) => ({ ...f, antiCheatThreshold: Number(e.target.value) }))}
                      className="w-full accent-orange-500"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-white/30">
                      <span>0% — permissif</span>
                      <span>100% — strict</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] p-5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Récapitulatif</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <dt className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Titre</dt>
                  <dd className="text-white font-mono truncate">{form.title || "—"}</dd>
                  <dt className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Spécialité</dt>
                  <dd className={`font-mono ${form.specialty === "OTHER" ? "text-white/70" : "text-white"}`}>
                    {form.specialty ? (form.specialty === "OTHER" ? "Open to All 🌐" : SPECIALTY_META[form.specialty].label) : "—"}
                  </dd>
                  <dt className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Difficulté</dt>
                  <dd className="text-white font-mono">{DIFFICULTY_META[form.difficulty].label}</dd>
                  <dt className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Durée</dt>
                  <dd className="text-white font-mono">{end && !errEndBeforeStart ? formatDuration(durationHours) : "—"}</dd>
                  <dt className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Capacité</dt>
                  <dd className="text-white font-mono">{form.maxParticipants ?? "Illimitée"}</dd>
                  <dt className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Top N</dt>
                  <dd className="text-white font-mono">{form.topN ?? 5}</dd>
                  <dt className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Reward</dt>
                  <dd className="text-amber-300 font-black">{form.rewardPool ?? 0} ARENA</dd>
                  <dt className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Anti-triche</dt>
                  <dd className="font-mono">
                    {form.antiCheatEnabled
                      ? <span className="text-orange-400">Activé ({form.antiCheatThreshold ?? 70}%)</span>
                      : <span className="text-white/40">Désactivé</span>}
                  </dd>
                </dl>
              </div>
            </div>
          )}
        </form>

        <div className="relative px-8 py-5 border-t border-white/5 bg-black/30 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as 1 | 2 | 3)}
            disabled={loading}
            className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all disabled:opacity-50"
          >
            {step === 1 ? "Annuler" : "← Précédent"}
          </button>

          <p className="text-[10px] font-mono text-white/30 hidden sm:block">
            Étape {step} / 3
          </p>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if ((step === 1 && step1Valid) || (step === 2 && step2Valid)) {
                  setStep((s) => (s + 1) as 1 | 2 | 3);
                }
              }}
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
              className="py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-cyan-500/30 disabled:bg-cyan-500/20 disabled:text-cyan-300/40 disabled:shadow-none disabled:cursor-not-allowed"
            >
              Suivant →
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={(e) => onSubmit(e as React.FormEvent)}
              className="py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-cyan-500/30 disabled:bg-cyan-500/20 disabled:text-cyan-300/40 disabled:shadow-none disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
                  Création…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  Créer le Hackathon
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
