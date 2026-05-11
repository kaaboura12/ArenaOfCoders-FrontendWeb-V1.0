"use client";

import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../lib/api";
import Link from "next/link";
import PlatformNavbar from "../components/PlatformNavbar";

const SPECIALTIES = [
  "FRONTEND",
  "BACKEND",
  "FULLSTACK",
  "MOBILE",
  "DATA",
  "BI",
  "CYBERSECURITY",
  "DESIGN",
  "DEVOPS",
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mainSpecialty, setMainSpecialty] = useState("");
  const [skillTags, setSkillTags] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    getProfile()
      .then((u) => {
        if (mounted) {
          setFirstName(u.firstName ?? "");
          setLastName(u.lastName ?? "");
          setMainSpecialty(u.mainSpecialty ?? "");
          setSkillTags(Array.isArray(u.skillTags) ? u.skillTags.join(", ") : "");
          setGithubUrl(u.githubUrl ?? "");
          setLinkedinUrl(u.linkedinUrl ?? "");
        }
      })
      .catch(() => {
        if (mounted) setMessage({ type: "error", text: "Erreur de chargement." });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({
        firstName,
        lastName,
        mainSpecialty,
        skillTags: skillTags.split(",").map((s) => s.trim()).filter(Boolean),
        githubUrl: githubUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
      });
      setMessage({ type: "success", text: "Profil mis à jour avec succès." });
    } catch (err: unknown) {
      const text =
        err && typeof err === "object" && "message" in err && typeof (err as { message?: string }).message === "string"
          ? (err as { message: string }).message
          : "Échec de la mise à jour.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PlatformNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-400/30 border-t-cyan-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white font-sans relative">
      <PlatformNavbar />

      <main className="max-w-3xl mx-auto px-6 py-10 md:py-14 relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">Configuration</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black italic uppercase tracking-tight text-white leading-tight">
              Paramètres
            </h1>
            <p className="mt-1 text-sm text-white/40">Modifie ton profil, ta spécialité et tes liens externes.</p>
          </div>
        </div>

        {/* Message banner */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-2xl border backdrop-blur-xl text-sm font-mono tracking-tight flex items-center gap-3 ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            } animate-in slide-in-from-top-2 fade-in duration-200`}
            role="status"
          >
            <span className="text-base">{message.type === "success" ? "✓" : "✕"}</span>
            <span className="flex-1">{message.text}</span>
          </div>
        )}

        {/* Card */}
        <form
          onSubmit={handleSave}
          className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" aria-hidden />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" aria-hidden />

          <div className="relative p-6 md:p-8 space-y-8">
            {/* ── Identity section ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">Identité</span>
                <span className="flex-1 h-px bg-white/5" aria-hidden />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Prénom">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="JOHN"
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.07] rounded-xl px-4 py-3.5 text-white font-mono text-sm outline-none transition-all placeholder:text-white/20"
                  />
                </Field>
                <Field label="Nom">
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="DOE"
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.07] rounded-xl px-4 py-3.5 text-white font-mono text-sm outline-none transition-all placeholder:text-white/20"
                  />
                </Field>
              </div>
            </section>

            {/* ── Specialty section ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">Spécialité principale</span>
                <span className="flex-1 h-px bg-white/5" aria-hidden />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SPECIALTIES.map((s) => {
                  const selected = mainSpecialty === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setMainSpecialty(selected ? "" : s)}
                      className={`px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                        selected
                          ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-500/10 scale-[1.02]"
                          : "bg-white/5 border-white/10 text-white/40 hover:text-white/80 hover:border-white/20"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/30">Sélectionne celle qui te représente le mieux (re-clique pour désélectionner).</p>
            </section>

            {/* ── Skills section ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">Stack technique</span>
                <span className="flex-1 h-px bg-white/5" aria-hidden />
              </div>
              <Field label="Compétences (séparées par des virgules)">
                <input
                  value={skillTags}
                  onChange={(e) => setSkillTags(e.target.value)}
                  placeholder="REACT, NODE, TYPESCRIPT, POSTGRES..."
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.07] rounded-xl px-4 py-3.5 text-white font-mono text-sm outline-none transition-all placeholder:text-white/20"
                />
              </Field>
              {skillTags.trim() && (
                <div className="flex flex-wrap gap-1.5">
                  {skillTags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t, i) => (
                      <span
                        key={`${t}-${i}`}
                        className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black uppercase tracking-widest text-cyan-300"
                      >
                        {t}
                      </span>
                    ))}
                </div>
              )}
            </section>

            {/* ── Links section ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">Liens externes</span>
                <span className="flex-1 h-px bg-white/5" aria-hidden />
              </div>
              <Field label="GitHub" icon={<GithubIcon />}>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.07] rounded-xl pl-11 pr-4 py-3.5 text-white font-mono text-sm outline-none transition-all placeholder:text-white/20"
                />
              </Field>
              <Field label="LinkedIn" icon={<LinkedinIcon />}>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/username"
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.07] rounded-xl pl-11 pr-4 py-3.5 text-white font-mono text-sm outline-none transition-all placeholder:text-white/20"
                />
              </Field>
            </section>
          </div>

          {/* Footer */}
          <div className="relative px-6 md:px-8 py-5 border-t border-white/5 bg-black/30 backdrop-blur-xl flex items-center justify-between gap-3">
            <Link
              href="/profile"
              className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all"
            >
              ← Retour au profil
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-cyan-500/30 disabled:bg-cyan-500/20 disabled:text-cyan-300/40 disabled:shadow-none disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Local primitives
// ─────────────────────────────────────────────────────────────

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-0.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.08c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.11-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.45.11-3.02 0 0 .97-.31 3.18 1.18a11 11 0 015.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.57.23 2.73.11 3.02.73.81 1.18 1.84 1.18 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 0h-14C2.24 0 0 2.24 0 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5V5c0-2.76-2.24-5-5-5zM7.12 19h-3v-9h3v9zm-1.5-10.27c-.97 0-1.75-.78-1.75-1.74S4.65 5.25 5.62 5.25s1.75.78 1.75 1.74-.78 1.74-1.75 1.74zM19.5 19h-3v-4.7c0-1.12-.02-2.56-1.56-2.56-1.56 0-1.8 1.22-1.8 2.48V19h-3v-9h2.88v1.23h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V19z" />
    </svg>
  );
}
