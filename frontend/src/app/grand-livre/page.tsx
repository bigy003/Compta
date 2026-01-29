"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PeriodFilter } from "../components/PeriodFilter";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface EcritureComptable {
  id: string;
  date: string;
  montant: string | number;
  libelle: string;
  pieceJustificative?: string | null;
  journal?: string | null;
  compteDebit: {
    id: string;
    code: string;
    libelle: string;
  };
  compteCredit: {
    id: string;
    code: string;
    libelle: string;
  };
}

interface CompteComptable {
  id: string;
  code: string;
  libelle: string;
  classe: number;
  type: string;
}

export default function GrandLivrePage() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [comptes, setComptes] = useState<CompteComptable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedCompte, setSelectedCompte] = useState<string>("");
  const [selectedExercice, setSelectedExercice] = useState<string>("");
  const [exercices, setExercices] = useState<Array<{ id: string; annee: number; statut: string }>>([]);

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

      await Promise.all([
        loadEcritures(firstId),
        loadComptes(),
        loadExercices(firstId),
      ]);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function loadExercices(currentSocieteId: string) {
    const res = await fetch(`${API_URL}/societes/${currentSocieteId}/exercices`);
    if (res.ok) {
      const data = await res.json();
      setExercices(data);
    }
  }

  async function loadEcritures(currentSocieteId: string) {
    let url = `${API_URL}/plan-comptable/societes/${currentSocieteId}/ecritures`;
    const params = new URLSearchParams();
    
    if (selectedExercice) {
      params.append("exerciceId", selectedExercice);
    } else if (selectedMonth && selectedYear) {
      const fromDate = `${selectedYear}-${selectedMonth}-01`;
      const lastDay = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
      const toDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      params.append("from", fromDate);
      params.append("to", toDate);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur chargement écritures");
    const data = await res.json();
    setEcritures(data);
  }

  async function loadComptes() {
    const res = await fetch(`${API_URL}/plan-comptable/comptes`);
    if (res.ok) {
      const data = await res.json();
      setComptes(data);
    }
  }

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (societeId) {
      loadEcritures(societeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, selectedCompte, selectedExercice, societeId]);

  async function loadSoldeCompte(compteId: string) {
    if (!societeId) return;
    try {
      let url = `${API_URL}/plan-comptable/societes/${societeId}/comptes/${compteId}/solde`;
      const params = new URLSearchParams();
      
      if (selectedMonth && selectedYear) {
        const fromDate = `${selectedYear}-${selectedMonth}-01`;
        const lastDay = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
        const toDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
        params.append("from", fromDate);
        params.append("to", toDate);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        alert(
          `Compte ${data.compte.code} - ${data.compte.libelle}\n` +
          `Débit: ${data.debit.toLocaleString("fr-FR")} FCFA\n` +
          `Crédit: ${data.credit.toLocaleString("fr-FR")} FCFA\n` +
          `Solde: ${data.solde.toLocaleString("fr-FR")} FCFA\n` +
          `Nombre d'écritures: ${data.nombreEcritures}`
        );
      }
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
              Grand livre
            </h1>
            <p className="text-sm text-zinc-500">
              Consultez toutes les écritures comptables de votre société.
            </p>
          </div>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Exercice
              </label>
              <select
                value={selectedExercice}
                onChange={(e) => {
                  setSelectedExercice(e.target.value);
                  setSelectedMonth("");
                  setSelectedYear("");
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              >
                <option value="">Tous les exercices</option>
                {exercices.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.annee} {ex.statut === "OUVERT" ? "(Ouvert)" : "(Fermé)"}
                  </option>
                ))}
              </select>
            </div>
            <PeriodFilter
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={(month) => {
                setSelectedMonth(month);
                setSelectedExercice("");
              }}
              onYearChange={(year) => {
                setSelectedYear(year);
                setSelectedExercice("");
              }}
              onReset={() => {
                setSelectedMonth("");
                setSelectedYear("");
                setSelectedExercice("");
              }}
            />
          </div>
        </header>

        {/* Résumé rapide */}
        {!loading && ecritures.length > 0 && (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Total écritures
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {ecritures.length}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/plan-comptable")}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Plan comptable
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Recherche par compte */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Consulter le solde d'un compte
              </label>
              <select
                value={selectedCompte}
                onChange={(e) => {
                  setSelectedCompte(e.target.value);
                  if (e.target.value) {
                    loadSoldeCompte(e.target.value);
                  }
                }}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              >
                <option value="">Sélectionner un compte...</option>
                {comptes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.libelle}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {loading && <p className="text-sm text-zinc-500">Chargement...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Liste des écritures */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Écritures comptables
          </h2>
          {ecritures.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune écriture comptable pour cette période.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="py-2 pr-4 text-left">Date</th>
                    <th className="py-2 pr-4 text-left">Journal</th>
                    <th className="py-2 pr-4 text-left">Libellé</th>
                    <th className="py-2 pr-4 text-left">Compte Débit</th>
                    <th className="py-2 pr-4 text-left">Compte Crédit</th>
                    <th className="py-2 pr-4 text-right">Montant</th>
                    <th className="py-2 pr-4 text-left">Pièce</th>
                  </tr>
                </thead>
                <tbody>
                  {ecritures.map((e) => (
                    <tr key={e.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 text-zinc-600">
                        {new Date(e.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600">
                        {e.journal || "-"}
                      </td>
                      <td className="py-2 pr-4 text-zinc-900">
                        {e.libelle}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="font-mono text-xs text-zinc-700">
                          {e.compteDebit.code}
                        </span>
                        <span className="ml-2 text-xs text-zinc-500">
                          {e.compteDebit.libelle}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className="font-mono text-xs text-zinc-700">
                          {e.compteCredit.code}
                        </span>
                        <span className="ml-2 text-xs text-zinc-500">
                          {e.compteCredit.libelle}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right font-medium text-zinc-900">
                        {Number(e.montant).toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="py-2 pr-4 text-xs text-zinc-500">
                        {e.pieceJustificative || "-"}
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
