"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TEAL = "#14b8a6";

interface BudgetAvecComparaison {
  id: string;
  societeId: string;
  annee: number;
  budgetRecettes: number;
  budgetDepenses: number;
  reelRecettes: number;
  reelDepenses: number;
  ecartRecettes: number;
  ecartDepenses: number;
  ecartResultat: number;
}

function formatFCFA(n: number): string {
  return `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA`;
}

export default function BudgetPage() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<BudgetAvecComparaison[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [budgetRecettes, setBudgetRecettes] = useState("");
  const [budgetDepenses, setBudgetDepenses] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
      await loadBudgets(firstId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function loadBudgets(currentSocieteId: string) {
    try {
      const res = await fetch(
        `${API_URL}/societes/${currentSocieteId}/budgets/comparaison`,
      );
      if (!res.ok) throw new Error("Erreur chargement budgets");
      const data = await res.json();
      setBudgets(data);
    } catch (err: unknown) {
      console.error("Erreur:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;
    try {
      const res = await fetch(`${API_URL}/societes/${societeId}/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annee: Number(annee),
          budgetRecettes: Number(budgetRecettes) || 0,
          budgetDepenses: Number(budgetDepenses) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de l'enregistrement");
      }
      setNotification({ type: "success", message: "Budget enregistré" });
      setShowForm(false);
      setBudgetRecettes("");
      setBudgetDepenses("");
      await loadBudgets(societeId);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Erreur",
      });
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/");
      return;
    }
    initData();
  }, []);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500 shadow-md">
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
              Budget et prévisions
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Définissez vos budgets annuels et comparez au réel.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 sm:mt-0"
            style={{ backgroundColor: TEAL }}
          >
            {showForm ? "Annuler" : "Nouveau budget"}
          </button>
        </header>

        {notification && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              notification.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {notification.message}
          </div>
        )}

        {showForm && (
          <section className="rounded-xl bg-white p-5 shadow-md">
            <h2 className="mb-4 text-base font-bold text-zinc-900">
              Créer ou modifier un budget annuel
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Année
                </label>
                <input
                  type="number"
                  min={2020}
                  max={2030}
                  value={annee}
                  onChange={(e) => setAnnee(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Budget recettes (FCFA)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={budgetRecettes}
                  onChange={(e) => setBudgetRecettes(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Budget dépenses (FCFA)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={budgetDepenses}
                  onChange={(e) => setBudgetDepenses(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-xl bg-white shadow-md">
          <div className="border-b border-zinc-100 p-4">
            <h2 className="text-base font-bold text-zinc-900">
              Comparaison réel / budget
            </h2>
          </div>
          {budgets.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              Aucun budget défini. Cliquez sur « Nouveau budget » pour en créer un.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase tracking-wider text-zinc-600">
                    <th className="px-4 py-3">Année</th>
                    <th className="px-4 py-3">Recettes</th>
                    <th className="px-4 py-3">Dépenses</th>
                    <th className="px-4 py-3">Résultat</th>
                    <th className="px-4 py-3">Écarts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {budgets.map((b) => (
                    <tr key={b.id} className="transition hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {b.annee}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>Réel: {formatFCFA(b.reelRecettes)}</div>
                        <div className="text-zinc-500">
                          Budget: {formatFCFA(b.budgetRecettes)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>Réel: {formatFCFA(b.reelDepenses)}</div>
                        <div className="text-zinc-500">
                          Budget: {formatFCFA(b.budgetDepenses)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        Réel:{" "}
                        <span
                          className={
                            b.reelRecettes - b.reelDepenses >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {formatFCFA(b.reelRecettes - b.reelDepenses)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div
                          className={
                            b.ecartRecettes >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          Recettes: {b.ecartRecettes >= 0 ? "+" : ""}
                          {formatFCFA(b.ecartRecettes)}
                        </div>
                        <div
                          className={
                            b.ecartDepenses <= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          Dépenses: {b.ecartDepenses <= 0 ? "" : "+"}
                          {formatFCFA(b.ecartDepenses)}
                        </div>
                        <div
                          className={
                            b.ecartResultat >= 0
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          Résultat: {b.ecartResultat >= 0 ? "+" : ""}
                          {formatFCFA(b.ecartResultat)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
