"use client";

import { useEffect, useState } from "react";
import { getProfile } from "../lib/api";
import Link from "next/link";
import PlatformNavbar from "../components/PlatformNavbar";
import { useAccessibility } from "../contexts/AccessibilityContext";

const RADAR_AXES = ["FRONTEND", "BACK", "SECUI", "DEVOPS", "U/ML", "MOBILE"] as const;
/** Mots-clés par axe pour dériver les scores du radar à partir des skillTags. */
const AXIS_KEYWORDS: Record<(typeof RADAR_AXES)[number], string[]> = {
  FRONTEND: ["react", "vue", "angular", "next", "html", "css", "javascript", "typescript", "frontend", "ui", "sass", "tailwind"],
  BACK: ["node", "nestjs", "express", "api", "backend", "java", "spring", "python", "django", "fastapi", "php", "ruby"],
  SECUI: ["security", "cybersec", "sécurité", "oauth", "jwt", "pentest", "cryptography"],
  DEVOPS: ["devops", "docker", "kubernetes", "ci/cd", "aws", "azure", "gcp", "linux", "terraform", "ansible"],
  "U/ML": ["machine learning", "ml", "ai", "tensorflow", "pytorch", "data", "pandas", "numpy", "nlp", "deep learning"],
  MOBILE: ["react native", "flutter", "ios", "android", "mobile", "kotlin", "swift"],
};

function computeRadarScores(mainSpecialty: string | null | undefined, skillTags: string[]): number[] {
  const tags = (skillTags || []).map((s) => s.toLowerCase());
  const specialty = (mainSpecialty || "").toUpperCase();
  return RADAR_AXES.map((axis) => {
    let score = 25;
    const keywords = AXIS_KEYWORDS[axis];
    const matchCount = keywords.filter((kw) => tags.some((t) => t.includes(kw) || kw.includes(t))).length;
    score += Math.min(50, matchCount * 12);
    if (specialty === axis || (axis === "BACK" && specialty === "BACKEND")) score += 25;
    return Math.min(100, Math.round(score));
  });
}

type ProfileUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  mainSpecialty?: string;
  skillTags?: string[];
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  globalRank?: number;
  level?: number;
  xp?: number;
  linkedinPosts?: Array<{
    text: string;
    publishedAt: string;
    url?: string;
    likes?: number;
    comments?: number;
  }>;
  githubRepos?: Array<{
    name: string;
    description?: string;
    url: string;
    stars?: number;
    readme?: string;
    language?: string;
    updatedAt?: string;
    topics?: string[];
    languages?: Record<string, number>;
    watchers?: number;
    forks?: number;
    openIssues?: number;
    lastCommit?: {
      message: string;
      author: string;
      date: string;
    };
    license?: string;
  }>;
};

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const {
    themeType, setThemeType,
    zoom, setZoom,
    highContrast, setHighContrast,
    voiceGuideActive, setVoiceGuideActive,
    isTourRunning, startTour, stopTour
  } = useAccessibility();

  const isDarkMode = themeType !== "standardLight";

  useEffect(() => {
    let mounted = true;
    getProfile()
      .then((u) => { if (mounted) setUser(u as ProfileUser); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white relative">
        <p>Erreur de chargement du profil. <Link href="/signin" className="text-cyan-400 underline">Se connecter</Link></p>
      </div>
    );
  }

  const skills = user.skillTags ?? [];
  const radarValues = computeRadarScores(user.mainSpecialty, skills);
  const competenceScore = Math.min(100, 50 + Math.min(30, skills.length * 3) + (user.mainSpecialty ? 15 : 0));

  return (
    <div className={`min-h-screen font-sans relative ${isDarkMode ? "text-white" : "bg-gray-50 text-slate-900"}`}>
      <PlatformNavbar />

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carte 1 : Résumé profil */}
          <div className={`rounded-2xl border p-6 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-lg"}`}>
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-black">
                  {user?.firstName?.[0] || "?"}{user?.lastName?.[0] || ""}
                </div>
                <span className="absolute bottom-0 right-0 flex h-5 w-5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-cyan-500 border-2 border-[#0a0f1e]" />
                </span>
              </div>
              <h1 className="text-xl font-bold">{user?.firstName} {user?.lastName}</h1>
              <p className="text-sm text-cyan-500 font-semibold uppercase tracking-wider mt-1">{user?.mainSpecialty || "Développeur"}</p>
              <div className="flex gap-3 mt-4 w-full justify-center flex-wrap">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${isDarkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700"}`}>
                  RANG MONDIAL #{user?.globalRank ?? "—"}
                </span>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${isDarkMode ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}>
                  NIVEAU {user?.level ?? "1"}
                </span>
              </div>
              {(user.githubUrl || user.linkedinUrl) && (
                <div className="flex flex-wrap gap-2 mt-3 justify-center">
                  {user.githubUrl && (
                    <a href={user.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/90 hover:bg-white/20 text-xs font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                      GitHub
                    </a>
                  )}
                  {user.linkedinUrl && (
                    <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/90 hover:bg-white/20 text-xs font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                      LinkedIn
                    </a>
                  )}
                </div>
              )}
              <div className="w-full mt-4 text-left">
                <p className="text-xs text-white/60 mb-1">Expérience (XP)</p>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${Math.min(100, ((user?.xp ?? 0) / 15000) * 100)}%` }} />
                </div>
                <p className="text-xs text-white/50 mt-1">{(user?.xp ?? 0).toLocaleString()} / 15,000</p>
              </div>
              <Link
                href="/settings"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 5.232z" /></svg>
                Modifier le profil
              </Link>
            </div>
          </div>

          {/* Carte 2 : Radar d'expertise (dynamique CV + LinkedIn + GitHub) */}
          <div className={`rounded-2xl border p-6 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-lg"}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold">Radar d&apos;Expertise</h2>
                <p className="text-xs text-white/50 mt-0.5">À partir de CV, LinkedIn et GitHub</p>
              </div>
              {skills.length > 0 && <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-400">{skills.length} compétences</span>}
            </div>
            <div className="flex justify-center">
              <RadarChart values={radarValues} labels={[...RADAR_AXES]} />
            </div>
          </div>

          {/* Carte 3 : Preuve de compétence (score dynamique) */}
          <div className={`rounded-2xl border p-6 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-lg"}`}>
            <div className="mb-4">
              <h2 className="text-lg font-bold">Preuve de Compétence</h2>
              <p className="text-xs text-white/50 mt-0.5">Synthèse des 3 sources (CV, LinkedIn, GitHub)</p>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-black">{competenceScore}</span>
              <span className="text-2xl font-bold text-white/60">/100</span>
            </div>
            <p className="text-xs text-emerald-400 flex items-center gap-1 mb-4">
              Score basé sur vos compétences déclarées et votre spécialité
            </p>
            {skills.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <p className="text-xs text-white/60 mb-1">Compétences fusionnées (meilleures des 3 sources)</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.slice(0, 24).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-xs font-medium">{tag}</span>
                  ))}
                  {skills.length > 24 && <span className="text-white/50 text-xs">+{skills.length - 24}</span>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/50">Ajoutez un CV et/ou des liens LinkedIn et GitHub (inscription ou paramètres) pour afficher vos compétences.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Carte 4 : Classement mondial */}
          <div className={`rounded-2xl border p-6 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-lg"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Classement mondial
              </h2>
              <Link href="/classements" prefetch={true} className="text-xs font-semibold text-cyan-400 hover:underline">Voir le classement complet →</Link>
            </div>
            <ul className="space-y-2">
              {[
                { rank: 40, name: "Sarah Jenkins", score: "28.4k" },
                { rank: 41, name: "Liam Vogt", score: "28.1k" },
                { rank: 42, name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Vous", score: "27.9k", highlight: true },
                { rank: 43, name: "Elena Rose", score: "27.6k" },
              ].map((row) => (
                <li
                  key={row.rank}
                  className={`flex items-center gap-4 py-2 px-3 rounded-xl ${row.highlight ? "bg-cyan-500/20 border border-cyan-500/40" : isDarkMode ? "bg-white/5" : "bg-slate-50"}`}
                >
                  <span className="w-8 text-sm font-bold text-white/70">#{row.rank}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400/50 to-blue-500/50 flex items-center justify-center text-xs font-bold">
                    {row.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="flex-1 font-medium">{row.name}</span>
                  <span className="text-sm font-bold text-cyan-400">{row.score}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Carte 5 : Badges obtenus */}
          <div className={`rounded-2xl border p-6 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-lg"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Badges obtenus</h2>
              <button type="button" className="text-xs font-semibold text-cyan-400 hover:underline">Voir tout</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[
                { icon: "✓", title: "Mentor Certifié", sub: "Niveau 3", color: "cyan" },
                { icon: "🚀", title: "Speed Demon", sub: "Top 50 Speed", color: "cyan" },
                { icon: "⚙", title: "Code Architect", sub: "Design Patterns", color: "cyan" },
                { icon: "🐛", title: "Bug Hunter", sub: "100+ Fixes", color: "violet" },
                { icon: "🔒", title: "Prochain Badge", sub: "Bloqué", locked: true },
              ].map((badge) => (
                <div
                  key={badge.title}
                  className={`flex-shrink-0 w-32 rounded-xl border p-4 text-center ${badge.locked ? "border-white/20 bg-white/5 opacity-60" : isDarkMode ? "bg-cyan-500/10 border-cyan-500/30" : "bg-cyan-50 border-cyan-200"}`}
                >
                  <span className="text-2xl mb-2 block">{badge.icon}</span>
                  <p className="text-xs font-bold truncate">{badge.title}</p>
                  <p className="text-[10px] text-white/50 mt-0.5">{badge.sub}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-1 mt-2">
              <button type="button" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/10">−</button>
              <button type="button" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/10">+</button>
            </div>
          </div>
        </div>

        {/* Section LinkedIn Posts */}
        {user.linkedinPosts && user.linkedinPosts.length > 0 && (
          <div className={`rounded-2xl border p-6 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-lg"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-blue-500">📱</span>
                Derniers Posts LinkedIn
              </h2>
              {user.linkedinUrl && (
                <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-cyan-400 hover:underline">Voir le profil</a>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {user.linkedinPosts.map((post, idx) => (
                <div key={idx} className={`rounded-xl border p-4 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                  <p className="text-sm text-white/80 line-clamp-4 mb-3">{post.text}</p>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{new Date(post.publishedAt).toLocaleDateString('fr-FR')}</span>
                    <div className="flex gap-3">
                      {post.likes !== undefined && <span>👍 {post.likes}</span>}
                      {post.comments !== undefined && <span>💬 {post.comments}</span>}
                    </div>
                  </div>
                  {post.url && (
                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline mt-2 inline-block">Voir le post →</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section GitHub Repos */}
        {user.githubRepos && user.githubRepos.length > 0 && (
          <div className={`rounded-2xl border p-6 ${isDarkMode ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 backdrop-blur-sm" : "bg-white border-slate-200 shadow-lg"}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">🐙</span>
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Derniers Repos GitHub
                </span>
              </h2>
              {user.githubUrl && (
                <a href={user.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                  Voir le profil <span>→</span>
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.githubRepos.map((repo, idx) => (
                <div
                  key={idx}
                  className={`group rounded-xl border p-5 transition-all duration-300 hover:scale-[1.02] ${isDarkMode
                    ? "bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-white/10 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10"
                    : "bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-cyan-500/50 hover:shadow-xl"
                    }`}
                >
                  {/* Header with name and stars */}
                  <div className="flex items-start justify-between mb-3 pb-3 border-b border-white/10">
                    <h3 className="font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors text-base flex-1 line-clamp-1">{repo.name}</h3>
                    {repo.stars !== undefined && repo.stars > 0 && (
                      <span className="text-sm text-yellow-400 flex items-center gap-1 flex-shrink-0 ml-2 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                        ⭐ {repo.stars}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {repo.description && (
                    <p className="text-sm text-white/80 mb-4 line-clamp-2 min-h-[2.5rem] leading-relaxed">{repo.description}</p>
                  )}

                  {/* Topics/Tags */}
                  {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {repo.topics.slice(0, 4).map((topic, topicIdx) => (
                        <span
                          key={topicIdx}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all hover:scale-105 ${isDarkMode
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30"
                            : "bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200"
                            }`}
                        >
                          #{topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Language breakdown */}
                  {repo.languages && Object.keys(repo.languages).length > 0 ? (
                    <div className="mb-4">
                      <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden mb-2 shadow-inner">
                        {Object.entries(repo.languages).map(([lang, percent], langIdx) => (
                          <div
                            key={langIdx}
                            className={`transition-all hover:opacity-80 ${langIdx === 0 ? 'bg-gradient-to-r from-violet-500 to-violet-600' :
                              langIdx === 1 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                langIdx === 2 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                  'bg-gradient-to-r from-orange-500 to-orange-600'
                              }`}
                            style={{ width: `${percent}%` }}
                            title={`${lang}: ${percent}%`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        {Object.entries(repo.languages).slice(0, 3).map(([lang, percent], langIdx) => (
                          <span key={langIdx} className="text-white/60 flex items-center gap-1">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${langIdx === 0 ? 'bg-violet-500' :
                              langIdx === 1 ? 'bg-blue-500' :
                                'bg-green-500'
                              }`}></span>
                            <span className="font-medium">{lang}</span>
                            <span className="text-white/40">{percent}%</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : repo.language ? (
                    <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold mb-4 ${isDarkMode ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-violet-100 text-violet-700 border border-violet-200"
                      }`}>
                      {repo.language}
                    </span>
                  ) : null}

                  {/* Stats Row - Watchers, Forks, Issues */}
                  <div className={`flex items-center gap-4 text-xs mb-4 pb-4 border-b ${isDarkMode ? "border-white/10" : "border-slate-200"
                    }`}>
                    <span className="flex items-center gap-1.5 text-white/60 hover:text-white/80 transition-colors" title="Watchers">
                      <span className="text-sm">👁️</span> {repo.watchers}
                    </span>
                    <span className="flex items-center gap-1.5 text-white/60 hover:text-white/80 transition-colors" title="Forks">
                      <span className="text-sm">🍴</span> {repo.forks}
                    </span>
                    {repo.openIssues !== undefined && repo.openIssues > 0 && (
                      <span className="flex items-center gap-1.5 text-orange-400/80 hover:text-orange-400 transition-colors" title="Open Issues">
                        <span className="text-sm">⚠️</span> {repo.openIssues}
                      </span>
                    )}
                  </div>

                  {/* Last commit info */}
                  {repo.lastCommit && (
                    <div className={`mb-4 p-3 rounded-lg transition-all ${isDarkMode
                      ? "bg-black/30 border border-white/5 hover:bg-black/40"
                      : "bg-slate-100 border border-slate-200 hover:bg-slate-50"
                      }`}>
                      <div className="text-[10px] text-white/40 mb-1.5 font-medium uppercase tracking-wide">Dernier commit</div>
                      <div className="text-xs text-white/80 mb-2 line-clamp-2 leading-relaxed">{repo.lastCommit.message}</div>
                      <div className="flex justify-between items-center text-[10px] text-white/50">
                        <span className="flex items-center gap-1">
                          <span className="text-xs">👤</span> {repo.lastCommit.author}
                        </span>
                        <span>{new Date(repo.lastCommit.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  )}

                  {/* License */}
                  {repo.license && (
                    <div className="text-[10px] text-white/40 mb-3 flex items-center gap-1">
                      <span>📜</span> {repo.license}
                    </div>
                  )}

                  {/* README preview */}
                  {repo.readme && (
                    <details className="mb-3 group/details">
                      <summary className={`cursor-pointer text-xs font-semibold transition-colors flex items-center gap-2 py-2 px-3 rounded-lg ${isDarkMode
                        ? "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                        : "text-cyan-600 hover:text-cyan-500 hover:bg-cyan-50"
                        }`}>
                        <span className="text-sm">📄</span>
                        <span>Voir README</span>
                        <span className="ml-auto text-[10px] opacity-60">Cliquez pour lire</span>
                      </summary>
                      <div className={`mt-3 p-4 rounded-lg border text-xs leading-relaxed overflow-auto max-h-64 ${isDarkMode
                        ? "bg-black/40 border-white/10 text-white/70"
                        : "bg-white border-slate-200 text-slate-700"
                        }`}>
                        {(() => {
                          // Nettoyer le README: enlever les balises HTML et markdown
                          let cleaned = repo.readme
                            .replace(/<[^>]*>/g, ' ') // Enlever les balises HTML
                            .replace(/!\[.*?\]\(.*?\)/g, '') // Enlever les images markdown
                            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convertir les liens en texte
                            .replace(/#{1,6}\s/g, '') // Enlever les # de titres
                            .replace(/\*\*([^*]+)\*\*/g, '$1') // Enlever le bold markdown
                            .replace(/\*([^*]+)\*/g, '$1') // Enlever l'italic markdown
                            .replace(/`([^`]+)`/g, '$1') // Enlever les backticks
                            .replace(/\n{3,}/g, '\n\n') // Réduire les sauts de ligne multiples
                            .replace(/\s{2,}/g, ' ') // Réduire les espaces multiples
                            .trim();

                          // Limiter la longueur
                          if (cleaned.length > 600) {
                            cleaned = cleaned.substring(0, 600) + '...';
                          }

                          // Diviser en paragraphes
                          return cleaned.split('\n\n').map((para, i) => (
                            <p key={i} className="mb-2 last:mb-0">{para}</p>
                          ));
                        })()}
                      </div>
                    </details>
                  )}

                  {/* Footer - Dates and link */}
                  <div className={`flex justify-between items-center pt-3 border-t ${isDarkMode ? "border-white/10" : "border-slate-200"
                    }`}>
                    <div className="text-[10px] text-white/30">
                      Mise à jour: {repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs font-semibold transition-all hover:gap-2 flex items-center gap-1 px-3 py-1.5 rounded-lg ${isDarkMode
                        ? "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                        : "text-cyan-600 hover:text-cyan-500 hover:bg-cyan-50"
                        }`}
                    >
                      Voir le repo <span>→</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Accessibility Engine */}
        <div className="rounded-2xl border p-6 bg-white/5 border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              ACCESSIBILITY ENGINE
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visual Interface */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">Visual Interface</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    id: "standardDark", label: "DARK", icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    )
                  },
                  {
                    id: "standardLight", label: "LIGHT", icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    )
                  },
                  {
                    id: "protanopia", label: "PROTAN", icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )
                  },
                  {
                    id: "deuteranopia", label: "DEUTAN", icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                    )
                  },
                  {
                    id: "tritanopia", label: "TRITAN", icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485" /></svg>
                    )
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setThemeType(t.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${themeType === t.id
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                      }`}
                  >
                    <div className="mb-2">{t.icon}</div>
                    <span className="text-[10px] font-bold uppercase">{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-white/40 uppercase">Interface Scale</span>
                  <span className="text-xs font-bold text-cyan-400">{100 + zoom * 15}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={zoom}
                  onChange={(e) => setZoom(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>

            {/* Support Systems */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">Support Systems</h3>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-white/90">Voice Command Center</h4>
                      <p className="text-xs text-white/40 mt-1">Guided system tour with neural narration</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => isTourRunning ? stopTour() : startTour()}
                  className={`w-full mt-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${isTourRunning
                    ? "bg-red-500/20 border border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    : "bg-cyan-500 text-black hover:bg-cyan-400"
                    }`}
                >
                  {isTourRunning ? "Terminate Neural Link" : "Launch System Tour"}
                </button>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-white/90">High Contrast</h4>
                    <button
                      onClick={() => setHighContrast(!highContrast)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${highContrast ? "bg-cyan-500" : "bg-white/10"}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${highContrast ? "right-1" : "left-1"}`} />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">Reinforce text legibility and edge definition</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-white/90">Voice Guide</h4>
                    <button
                      onClick={() => setVoiceGuideActive(!voiceGuideActive)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${voiceGuideActive ? "bg-cyan-500" : "bg-white/10"}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${voiceGuideActive ? "right-1" : "left-1"}`} />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">Activate voice commands ("go home", "go hackathon")</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

function RadarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const size = 160;
  const center = size / 2;
  const maxR = center - 20;
  const n = values.length;
  const points = values.map((v, i) => {
    const angle = (i * 360 / n - 90) * (Math.PI / 180);
    const r = (v / 100) * maxR;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  });
  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z";
  const axisPoints = labels.map((_, i) => {
    const angle = (i * 360 / n - 90) * (Math.PI / 180);
    return [center + maxR * Math.cos(angle), center + maxR * Math.sin(angle)];
  });
  return (
    <svg width={size} height={size} className="overflow-visible">
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          points={axisPoints.map((p) => `${center + (p[0] - center) * scale},${center + (p[1] - center) * scale}`).join(" ")}
          fill="none"
          stroke="rgba(14, 230, 255, 0.2)"
          strokeWidth="1"
        />
      ))}
      {axisPoints.map((p, i) => (
        <line key={i} x1={center} y1={center} x2={p[0]} y2={p[1]} stroke="rgba(14, 230, 255, 0.25)" strokeWidth="1" />
      ))}
      <path d={pathData} fill="rgba(14, 230, 255, 0.35)" stroke="rgba(14, 230, 255, 0.6)" strokeWidth="1.5" />
      {labels.map((label, i) => {
        const angle = (i * 360 / n - 90) * (Math.PI / 180);
        const x = center + (maxR + 14) * Math.cos(angle);
        const y = center + (maxR + 14) * Math.sin(angle);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" className="fill-white/70 text-[9px] font-bold" style={{ dominantBaseline: "central" }}>{label}</text>
        );
      })}
    </svg>
  );
}
