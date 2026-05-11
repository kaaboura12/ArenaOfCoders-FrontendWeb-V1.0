"use client";

import React, { useState, useEffect, useCallback } from "react";
import VideoCall from "../stream/VideoCall";
import { RoomChatChannel } from "./RoomChatChannel";
import {
  type Competition,
  type CheckpointSubmission,
  submitWork,
  getMyParticipation,
  getMyCheckpointSubmissions,
} from "../../lib/api";

type Tab = "chat" | "video";

type RoomStreamPanelProps = {
  roomId: string;
  roomName: string;
  competition?: Competition;
  layout?: "tabs" | "split";
};

// ─────────────────────────────────────────────────────────────────
// Checkpoint progress panel — shared between layouts
// ─────────────────────────────────────────────────────────────────
function CheckpointProgressPanel({ submissions }: { submissions: CheckpointSubmission[] }) {
  const mandatory = submissions.filter((s) => s.checkpoint.isMandatory);
  const approved = mandatory.filter((s) => s.status === "APPROVED");
  const total = mandatory.length;
  const completed = approved.length;
  const allDone = total > 0 && completed === total;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statusMeta: Record<
    CheckpointSubmission["status"],
    { label: string; color: string; icon: string }
  > = {
    APPROVED: { label: "Validé", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: "✓" },
    REJECTED: { label: "Rejeté", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: "✕" },
    MISSED:   { label: "Raté",   color: "text-red-500/80 bg-red-500/5  border-red-500/10",  icon: "✕" },
    SUBMITTED:{ label: "En cours", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: "↻" },
    PENDING:  { label: "En attente", color: "text-white/30 bg-white/5 border-white/10", icon: "○" },
  };

  if (total === 0) return null;

  return (
    <div className="space-y-2.5">
      {/* Header + bar */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em]">
          Checkpoints mobiles
        </p>
        <span className={`text-[9px] font-black uppercase tracking-widest ${allDone ? "text-emerald-400" : "text-amber-400"}`}>
          {completed}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-emerald-400" : "bg-amber-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Checkpoint pills */}
      <div className="flex flex-wrap gap-1.5">
        {submissions
          .sort((a, b) => a.checkpoint.order - b.checkpoint.order)
          .map((s) => {
            const meta = statusMeta[s.status];
            return (
              <div
                key={s.id}
                title={`CP${s.checkpoint.order}: ${s.checkpoint.title} — ${meta.label}`}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${meta.color}`}
              >
                <span>{meta.icon}</span>
                <span>CP{s.checkpoint.order}</span>
                {!s.checkpoint.isMandatory && (
                  <span className="opacity-50 normal-case font-normal">opt</span>
                )}
              </div>
            );
          })}
      </div>

      {!allDone && (
        <p className="text-[9px] text-amber-400/80 leading-relaxed">
          Complétez tous les checkpoints obligatoires depuis l&apos;application mobile avant de soumettre.
        </p>
      )}
      {allDone && (
        <p className="text-[9px] text-emerald-400/90 leading-relaxed">
          ✓ Tous les checkpoints validés — vous pouvez soumettre le travail final.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Submit form — only rendered for leaders, gated by checkpoints
// ─────────────────────────────────────────────────────────────────
function SubmitForm({
  competition,
  checkpoints,
  checkpointsLoading,
}: {
  competition: Competition;
  checkpoints: CheckpointSubmission[];
  checkpointsLoading: boolean;
}) {
  const [githubUrl, setGithubUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mandatoryAll = checkpoints.filter((s) => s.checkpoint.isMandatory);
  const allApproved = mandatoryAll.length > 0 && mandatoryAll.every((s) => s.status === "APPROVED");
  const canSubmit = allApproved && !submitting && githubUrl.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      await submitWork(competition.id, githubUrl.trim());
      setSubmitMsg({ type: "success", text: "Travail soumis avec succès ! ✅" });
    } catch (err: any) {
      setSubmitMsg({ type: "error", text: err.message || "Échec de la soumission." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Checkpoint progress */}
      {checkpointsLoading ? (
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 border border-white/20 border-t-cyan-400 rounded-full animate-spin" />
          <p className="text-[9px] text-white/30 uppercase tracking-widest">Vérification des checkpoints…</p>
        </div>
      ) : (
        <CheckpointProgressPanel submissions={checkpoints} />
      )}

      {/* Submit form */}
      <form onSubmit={handleSubmit} className="space-y-2 pt-1">
        <input
          type="url"
          placeholder="Lien GitHub du projet…"
          required
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          disabled={!allApproved || submitting}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-white/20 font-mono"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          title={!allApproved ? "Complétez d'abord tous les checkpoints sur l'app mobile" : ""}
          className="w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed
            enabled:bg-cyan-500 enabled:hover:bg-cyan-400 enabled:text-black enabled:shadow-lg enabled:shadow-cyan-500/20
            disabled:bg-white/5 disabled:text-white/30 disabled:border disabled:border-white/10"
        >
          {submitting ? "ENVOI EN COURS…" : allApproved ? "SOUMETTRE LE TRAVAIL FINAL" : "CHECKPOINTS REQUIS"}
        </button>
      </form>

      {submitMsg && (
        <div className={`px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest ${
          submitMsg.type === "success"
            ? "bg-emerald-500/15 border border-emerald-500/20 text-emerald-400"
            : "bg-red-500/15 border border-red-500/20 text-red-400"
        }`}>
          {submitMsg.text}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────
export default function RoomStreamPanel({
  roomId,
  roomName,
  competition,
  layout = "tabs",
}: RoomStreamPanelProps) {
  const [isLeader, setIsLeader] = useState<boolean | null>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointSubmission[]>([]);
  const [checkpointsLoading, setCheckpointsLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [showSubmission, setShowSubmission] = useState(false);

  const safeRoomId = roomId.replace(/[^a-z0-9-_]/gi, "") || "default-room";

  // Determine if current user is the team leader (or solo — also allowed)
  useEffect(() => {
    if (!competition) return;
    getMyParticipation(competition.id)
      .then((p) => {
        if (p) {
          const role = (p as any).equipeRole;
          setIsLeader(role === "LEADER" || !p.equipeId);
        } else {
          setIsLeader(false);
        }
      })
      .catch(() => setIsLeader(false));
  }, [competition]);

  // Fetch checkpoint status — only for leaders once we know they are leaders
  const fetchCheckpoints = useCallback(async () => {
    if (!competition || !isLeader) return;
    setCheckpointsLoading(true);
    try {
      const data = await getMyCheckpointSubmissions(competition.id);
      setCheckpoints(data);
    } catch {
      // fail silently — the backend will block the submit if needed
    } finally {
      setCheckpointsLoading(false);
    }
  }, [competition, isLeader]);

  useEffect(() => {
    fetchCheckpoints();
  }, [fetchCheckpoints]);

  // Show submission panel in the last 20 min of the hackathon (+ 2h grace)
  useEffect(() => {
    if (!competition) return;
    const check = () => {
      const diffMin = (new Date(competition.endDate).getTime() - Date.now()) / 60_000;
      setShowSubmission(diffMin <= 20 && diffMin >= -120);
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [competition]);

  // ── Split layout ──────────────────────────────────────────────
  if (layout === "split") {
    return (
      <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-6 p-4 md:p-6">
        {/* Video panel */}
        <div className="flex-[2] min-w-0 min-h-[280px] md:min-h-0 flex flex-col rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-cyan-500/20 transition-colors">
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3 bg-gradient-to-r from-cyan-500/5 to-transparent">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Visio & partage d&apos;écran</p>
              <p className="text-xs text-white/50">Rejoignez l&apos;appel avec votre équipe</p>
            </div>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <VideoCall callId={safeRoomId} />
          </div>
        </div>

        {/* Chat + submission panel */}
        <div className="flex-1 min-w-[280px] md:max-w-[380px] min-h-[260px] md:min-h-0 flex flex-col rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-cyan-500/20 transition-colors">
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3 bg-gradient-to-r from-violet-500/5 to-transparent">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0-4.418-4.03-8-9-8s-9 3.582-9 8 4.03 8 9 8 9-3.582 9-8z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Chat</p>
              <p className="text-xs text-white/50">Échangez en temps réel</p>
            </div>
          </div>

          {showSubmission && competition && (
            <div className="px-5 py-4 border-b border-white/10 space-y-3 animate-in slide-in-from-top-4 duration-500 bg-gradient-to-b from-cyan-500/5 to-transparent">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                  Fenêtre de Soumission
                </p>
              </div>
              {isLeader ? (
                <SubmitForm
                  competition={competition}
                  checkpoints={checkpoints}
                  checkpointsLoading={checkpointsLoading}
                />
              ) : (
                <p className="text-[10px] text-amber-400/80 font-semibold leading-relaxed">
                  Seul le leader de votre équipe peut soumettre le travail final.
                </p>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#0d1117]/50">
            <RoomChatChannel roomId={safeRoomId} />
          </div>
        </div>
      </div>
    );
  }

  // ── Tabs layout ───────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {showSubmission && competition && (
        <div className="mx-4 mt-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/8 to-transparent overflow-hidden animate-in slide-in-from-top-4 duration-500">
          {/* Banner header */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-cyan-500/10">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
              Fenêtre de Soumission Finale
            </p>
          </div>

          <div className="px-5 py-4">
            {isLeader ? (
              <SubmitForm
                competition={competition}
                checkpoints={checkpoints}
                checkpointsLoading={checkpointsLoading}
              />
            ) : (
              <p className="text-[10px] text-amber-400/80 font-semibold leading-relaxed">
                Seul le leader de votre équipe peut soumettre le travail final.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex border-b border-white/10 mt-3">
        <button
          type="button"
          onClick={() => setTab("chat")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === "chat"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-white/60 hover:text-white"
          }`}
        >
          Chat
        </button>
        <button
          type="button"
          onClick={() => setTab("video")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === "video"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-white/60 hover:text-white"
          }`}
        >
          Visio & partage d&apos;écran
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {tab === "chat" ? (
          <RoomChatChannel roomId={safeRoomId} />
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <VideoCall callId={safeRoomId} />
          </div>
        )}
      </div>
    </div>
  );
}
