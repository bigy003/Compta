"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TEAL = "#14b8a6";

interface ControleAudit {
  type: 'FACTURE_NON_PAYEE' | 'RAPPROCHEMENT_A_VALIDER' | 'DOCUMENT_MANQUANT' | 'DOUBLON_DETECTE';
  severite: 'HAUTE' | 'MOYENNE' | 'BASSE';
  titre: string;
  description: string;
  dateDetection: string;
  lien?: string;
  metadata?: Record<string, any>;
}

interface ResumeControles {
  total: number;
  parType: {
    FACTURE_NON_PAYEE: number;
    RAPPROCHEMENT_A_VALIDER: number;
    DOCUMENT_MANQUANT: number;
    DOUBLON_DETECTE: number;
  };
  parSeverite: {
    HAUTE: number;
    MOYENNE: number;
    BASSE: number;
  };
}

const TYPE_LABELS: Record<string, string> = {
  FACTURE_NON_PAYEE: "Factures non payées",
  RAPPROCHEMENT_A_VALIDER: "Rapprochements à valider",
  DOCUMENT_MANQUANT: "Documents manquants",
  DOUBLON_DETECTE: "Doublons détectés",
};

const SEVERITE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HAUTE: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" },
  MOYENNE: { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" },
  BASSE: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
};

export default function ExpertAuditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const societeId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controles, setControles] = useState<ControleAudit[]>([]);
  const [resume, setResume] = useState<ResumeControles | null>(null);
  const [filtreType, setFiltreType] = useState<string>("");
  const [filtreSeverite, setFiltreSeverite] = useState<string>("");

  async function loadControles() {
    if (!societeId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/audit/resume`,
      );
      if (!res.ok) throw new Error("Erreur chargement contrôles");
      const data = await res.json();
      setControles(data.controles || []);
      setResume(data.resume || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/");
      return;
    }
    if (societeId) {
      loadControles();
    }
  }, [societeId]);

  async function handleDownloadRapportPdf() {
    if (!societeId) return;
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_URL}/societes/${societeId}/audit/rapport-pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Erreur lors du téléchargement");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-audit-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erreur téléchargement PDF");
    }
  }

  const controlesFiltres = controles.filter((controle) => {
    if (filtreType && controle.type !== filtreType) return false;
    if (filtreSeverite && controle.severite !== filtreSeverite) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500 shadow-md">
            Chargement des contrôles d'audit...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
              Audit et Contrôles
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Contrôles automatiques et alertes pour cette société.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 sm:mt-0">
            <button
              onClick={handleDownloadRapportPdf}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              Télécharger rapport PDF
            </button>
            <button
              onClick={() => loadControles()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Actualiser
            </button>
          </div>
        </header>

        {/* Résumé */}
        {resume && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <section className="rounded-xl bg-white p-5 shadow-md">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-zinc-900">
                  {resume.total}
                </span>
                <span className="text-sm text-zinc-500">contrôle{resume.total !== 1 ? "s" : ""}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Total</p>
            </section>
            <section className="rounded-xl bg-white p-5 shadow-md">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-red-600">
                  {resume.parSeverite.HAUTE}
                </span>
                <span className="text-sm text-zinc-500">haute</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Sévérité haute</p>
            </section>
            <section className="rounded-xl bg-white p-5 shadow-md">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-yellow-600">
                  {resume.parSeverite.MOYENNE}
                </span>
                <span className="text-sm text-zinc-500">moyenne</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Sévérité moyenne</p>
            </section>
            <section className="rounded-xl bg-white p-5 shadow-md">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-600">
                  {resume.parSeverite.BASSE}
                </span>
                <span className="text-sm text-zinc-500">basse</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Sévérité basse</p>
            </section>
          </div>
        )}

        {/* Filtres */}
        <section className="rounded-xl bg-white p-5 shadow-md">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Filtrer par type
              </label>
              <select
                value={filtreType}
                onChange={(e) => setFiltreType(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
              >
                <option value="">Tous les types</option>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Filtrer par sévérité
              </label>
              <select
                value={filtreSeverite}
                onChange={(e) => setFiltreSeverite(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
              >
                <option value="">Toutes les sévérités</option>
                <option value="HAUTE">Haute</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="BASSE">Basse</option>
              </select>
            </div>
          </div>
        </section>

        {/* Liste des contrôles */}
        <section className="rounded-xl bg-white shadow-md">
          <div className="border-b border-zinc-100 p-4">
            <h2 className="text-base font-bold text-zinc-900">
              Contrôles détectés ({controlesFiltres.length})
            </h2>
          </div>

          {controlesFiltres.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              {controles.length === 0
                ? "Aucun contrôle détecté. La comptabilité de cette société est en ordre !"
                : "Aucun contrôle ne correspond aux filtres sélectionnés."}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {controlesFiltres.map((controle, index) => {
                const severiteStyle = SEVERITE_COLORS[controle.severite];
                const lienComplet = controle.lien
                  ? controle.lien.startsWith("/expert")
                    ? controle.lien
                    : `/expert/societes/${societeId}${controle.lien}`
                  : undefined;
                return (
                  <div
                    key={index}
                    className={`p-4 transition hover:bg-zinc-50/50 ${severiteStyle.bg}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severiteStyle.border} ${severiteStyle.text}`}
                          >
                            {controle.severite}
                          </span>
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                            {TYPE_LABELS[controle.type]}
                          </span>
                        </div>
                        <h3 className="font-semibold text-zinc-900">
                          {controle.titre}
                        </h3>
                        <p className="text-sm text-zinc-600">
                          {controle.description}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Détecté le: {new Date(controle.dateDetection).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {lienComplet && (
                        <button
                          onClick={() => router.push(lienComplet)}
                          className="mt-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 sm:mt-0"
                        >
                          Voir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
