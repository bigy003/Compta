"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PeriodFilter } from "../components/PeriodFilter";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface DeclarationTVA {
  id: string;
  periode: string;
  dateDeclaration: string;
  statut: string;
  tvaCollectee: string | number;
  tvaDeductible: string | number;
  tvaAPayer: string | number;
  montantHTVentes: string | number;
  montantTTCVentes: string | number;
  montantHTAchats: string | number;
  montantTTCAchats: string | number;
}

export default function DeclarationsTVAPage() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const [declarations, setDeclarations] = useState<DeclarationTVA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().getMonth().toString(),
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString(),
  );

  const [periode, setPeriode] = useState<string>("");

  async function initData() {
    try {
      setLoading(true);
      setError(null);

      const resSoc = await fetch(`${API_URL}/societes`);
      if (!resSoc.ok) throw new Error("Impossible de charger les sociétés");
      const societes = await resSoc.json();
      if (!Array.isArray(societes) || societes.length === 0) {
        throw new Error("Aucune société trouvée");
      }
      const firstId = societes[0].id as string;
      setSocieteId(firstId);

      await loadDeclarations(firstId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function loadDeclarations(currentSocieteId: string) {
    const res = await fetch(
      `${API_URL}/societes/${currentSocieteId}/declarations-tva`,
    );
    if (!res.ok) throw new Error("Erreur chargement déclarations");
    const data = await res.json();
    setDeclarations(data);
  }

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      const month = String(parseInt(selectedMonth) + 1).padStart(2, "0");
      setPeriode(`${selectedYear}-${month}`);
    }
  }, [selectedMonth, selectedYear]);

  async function handleCreateDeclaration() {
    if (!societeId || !periode) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/declarations-tva`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ periode }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur création déclaration");
      }
      await loadDeclarations(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleUpdateStatut(id: string, statut: string) {
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/declarations-tva/${id}/statut`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statut }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur mise à jour");
      }
      await loadDeclarations(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleRecalculate(id: string) {
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/declarations-tva/${id}/recalculer`,
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur recalcul");
      }
      await loadDeclarations(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 px-4 py-10 font-sans">
      <main className="w-full max-w-6xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Déclarations TVA
            </h1>
            <p className="text-sm text-zinc-500">
              Gérez vos déclarations de TVA conformes à la réglementation ivoirienne.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Dashboard
            </button>
          </div>
        </header>

        {/* Formulaire de création */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Nouvelle déclaration TVA
          </h2>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Période
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(2024, i).toLocaleDateString("fr-FR", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <button
              onClick={handleCreateDeclaration}
              disabled={!periode}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Créer la déclaration
            </button>
          </div>
        </section>

        {loading && <p className="text-sm text-zinc-500">Chargement...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Liste des déclarations */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Déclarations TVA
          </h2>
          {declarations.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune déclaration TVA pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="py-2 pr-4 text-left">Période</th>
                    <th className="py-2 pr-4 text-right">TVA Collectée</th>
                    <th className="py-2 pr-4 text-right">TVA Déductible</th>
                    <th className="py-2 pr-4 text-right">TVA à Payer</th>
                    <th className="py-2 pr-4 text-left">Statut</th>
                    <th className="py-2 pr-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((d) => (
                    <tr key={d.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 font-medium text-zinc-900">
                        {d.periode}
                      </td>
                      <td className="py-2 pr-4 text-right text-zinc-900">
                        {Number(d.tvaCollectee).toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="py-2 pr-4 text-right text-zinc-900">
                        {Number(d.tvaDeductible).toLocaleString("fr-FR")} FCFA
                      </td>
                      <td
                        className={`py-2 pr-4 text-right font-semibold ${
                          Number(d.tvaAPayer) >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {Number(d.tvaAPayer).toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={d.statut}
                          onChange={(e) =>
                            handleUpdateStatut(d.id, e.target.value)
                          }
                          className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                            d.statut === "VALIDEE"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : d.statut === "ENVOYEE"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-zinc-200 bg-zinc-50 text-zinc-700"
                          }`}
                        >
                          <option value="BROUILLON">Brouillon</option>
                          <option value="ENVOYEE">Envoyée</option>
                          <option value="VALIDEE">Validée</option>
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              window.open(
                                `${API_URL}/societes/${societeId}/declarations-tva/${d.id}/pdf`,
                                '_blank'
                              );
                            }}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          >
                            📄 PDF
                          </button>
                          <button
                            onClick={() => handleRecalculate(d.id)}
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Recalculer
                          </button>
                          <button
                            onClick={() => {
                              // Afficher les détails
                              alert(
                                `Déclaration TVA - ${d.periode}\n\n` +
                                  `TVA Collectée: ${Number(d.tvaCollectee).toLocaleString("fr-FR")} FCFA\n` +
                                  `TVA Déductible: ${Number(d.tvaDeductible).toLocaleString("fr-FR")} FCFA\n` +
                                  `TVA à Payer: ${Number(d.tvaAPayer).toLocaleString("fr-FR")} FCFA\n\n` +
                                  `Ventes HT: ${Number(d.montantHTVentes).toLocaleString("fr-FR")} FCFA\n` +
                                  `Ventes TTC: ${Number(d.montantTTCVentes).toLocaleString("fr-FR")} FCFA\n` +
                                  `Achats HT: ${Number(d.montantHTAchats).toLocaleString("fr-FR")} FCFA\n` +
                                  `Achats TTC: ${Number(d.montantTTCAchats).toLocaleString("fr-FR")} FCFA`
                              );
                            }}
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Détails
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
