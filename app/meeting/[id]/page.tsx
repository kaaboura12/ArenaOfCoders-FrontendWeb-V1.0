"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PlatformNavbar from "@/app/components/PlatformNavbar";
import RecruitmentMeetingRoom from "@/app/components/company/RecruitmentMeetingRoom";
import {
  getToken,
  getRecruitmentMeeting,
  markMeetingStarted,
  completeMeeting,
  type RecruitmentMeeting,
} from "@/app/lib/api";

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [meeting, setMeeting] = useState<RecruitmentMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/signin?next=${encodeURIComponent(`/meeting/${id}`)}`);
      return;
    }
    if (!id) return;
    getRecruitmentMeeting(id)
      .then(setMeeting)
      .catch((err: any) => setError(err?.message ?? "Meeting introuvable."))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleEnter = async () => {
    if (!meeting) return;
    try {
      await markMeetingStarted(meeting.id);
      setActive(true);
    } catch {
      // proceed anyway (status update is best-effort)
      setActive(true);
    }
  };

  const handleMeetingEnd = async (results: any[]) => {
    if (!meeting) return;
    // Average the soft skills across all snapshots to send a single payload
    const summary = computeAverageScores(results);
    try {
      await completeMeeting(meeting.id, summary);
    } catch (err) {
      console.error("Failed to persist final soft-skills:", err);
    }
    setActive(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PlatformNavbar />
        <div className="flex-1 flex items-center justify-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <p className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Chargement du meeting…</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex flex-col">
        <PlatformNavbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl border border-red-500/20 bg-red-500/5 backdrop-blur-xl p-8 text-center space-y-4">
            <p className="text-[10px] font-black tracking-[0.3em] text-red-400 uppercase">Accès refusé</p>
            <h1 className="text-xl font-black italic uppercase text-white">Meeting introuvable</h1>
            <p className="text-sm text-white/60 font-mono">{error || "Ce lien n'est pas valide ou tu n'es pas invité à ce meeting."}</p>
            <Link href="/hackathon" className="inline-block px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-black uppercase tracking-[0.2em] transition-all">
              Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const scheduledDate = new Date(meeting.scheduledFor);
  const youAre = meeting.role === "COMPANY" ? "Recruteur" : "Candidat";
  const otherParty =
    meeting.role === "COMPANY"
      ? `${meeting.candidate?.firstName ?? meeting.candidateName}`
      : meeting.companyName;

  return (
    <div className="min-h-screen flex flex-col">
      <PlatformNavbar />
      <main className="flex-1 relative z-10">
        {!active ? (
          // ─── Lobby / pre-meeting card ───
          <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
            <div className="relative rounded-3xl border border-cyan-500/20 bg-white/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" aria-hidden />
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" aria-hidden />

              <div className="relative p-8 md:p-10 space-y-7">

                {/* "You've been selected" banner — candidate only */}
                {meeting.role === "CANDIDATE" && meeting.status === "SCHEDULED" && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl">🎯</div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black tracking-[0.3em] text-emerald-400 uppercase mb-1">Félicitations !</p>
                      <p className="text-sm font-black italic uppercase text-white leading-tight">
                        Tu as été sélectionné(e) par {meeting.companyName}
                      </p>
                      {meeting.positionTitle && (
                        <p className="text-xs text-emerald-300/80 mt-1">
                          Pour le poste de <strong className="text-emerald-300">{meeting.positionTitle}</strong>
                        </p>
                      )}
                      <p className="text-[11px] text-white/50 mt-1.5 leading-relaxed">
                        Ton profil Arena of Coders a retenu leur attention. Prépare-toi pour cet entretien !
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">Entretien de Recrutement</p>
                    <h1 className="mt-1 text-3xl md:text-4xl font-black italic uppercase tracking-tight text-white leading-tight">
                      {meeting.companyName} <span className="text-cyan-400">×</span> {meeting.candidate?.firstName ?? meeting.candidateName.split(" ")[0]}
                    </h1>
                    {meeting.positionTitle && (
                      <p className="mt-1 text-sm font-black text-cyan-300/70 uppercase tracking-wider">{meeting.positionTitle}</p>
                    )}
                    <p className="mt-1 text-sm text-white/40">Soft-skills analysis intégrée · webcam + audio</p>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoBlock label="Tu es" value={youAre} accent="cyan" />
                  <InfoBlock label={meeting.role === "COMPANY" ? "Candidat" : "Entreprise"} value={otherParty} accent="violet" />
                  <InfoBlock
                    label="Date"
                    value={scheduledDate.toLocaleDateString("fr-FR", {
                      weekday: "long", day: "2-digit", month: "long", year: "numeric",
                    })}
                  />
                  <InfoBlock
                    label="Heure"
                    value={`${scheduledDate.toLocaleTimeString("fr-FR", {
                      hour: "2-digit", minute: "2-digit",
                    })} · ${meeting.durationMinutes} min`}
                  />
                  <InfoBlock label="Statut" value={meeting.status} accent={meeting.status === "COMPLETED" ? "emerald" : meeting.status === "CANCELLED" ? "red" : "cyan"} />
                  {meeting.candidate?.mainSpecialty && (
                    <InfoBlock label="Spécialité" value={meeting.candidate.mainSpecialty} accent="cyan" />
                  )}
                </dl>

                {meeting.notes && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <p className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase mb-3">
                      {meeting.role === "CANDIDATE" ? "À propos de cette opportunité" : "Description de l'entretien"}
                    </p>
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{meeting.notes}</p>
                  </div>
                )}

                {meeting.status === "CANCELLED" ? (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-400 text-center">
                    Ce meeting a été annulé.
                  </div>
                ) : meeting.status === "COMPLETED" ? (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-400 text-center">
                    Meeting terminé — soft-skills enregistrés.
                  </div>
                ) : (
                  <button
                    onClick={handleEnter}
                    className="w-full inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black p-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-xl shadow-cyan-500/30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    Entrer dans la salle
                  </button>
                )}

                <p className="text-[10px] text-white/30 text-center font-mono">
                  Assure-toi que ta caméra et ton micro fonctionnent avant d'entrer.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // ─── Active meeting room ───
          <div className="px-6 py-6 max-w-7xl mx-auto">
            <RecruitmentMeetingRoom
              candidateName={meeting.candidate?.firstName + " " + meeting.candidate?.lastName || meeting.candidateName}
              onMeetingEnd={handleMeetingEnd}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "cyan" | "violet" | "emerald" | "red";
}) {
  const accentClass =
    accent === "cyan"
      ? "text-cyan-400"
      : accent === "violet"
      ? "text-violet-400"
      : accent === "emerald"
      ? "text-emerald-400"
      : accent === "red"
      ? "text-red-400"
      : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase">{label}</p>
      <p className={`mt-1 text-sm font-black italic uppercase ${accentClass}`}>{value}</p>
    </div>
  );
}

function computeAverageScores(results: any[]): Record<string, number> | undefined {
  if (!results?.length) return undefined;
  const keys = Object.keys(results[0]?.soft_skills ?? {});
  if (!keys.length) return undefined;
  const sums: Record<string, number> = {};
  let n = 0;
  for (const r of results) {
    if (!r?.soft_skills) continue;
    n++;
    for (const k of keys) sums[k] = (sums[k] ?? 0) + (r.soft_skills[k] ?? 0);
  }
  if (!n) return undefined;
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = Math.round((sums[k] / n) * 10) / 10;
  return out;
}
