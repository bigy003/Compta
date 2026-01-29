"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface CompteComptable {
  id: string;
  code: string;
  libelle: string;
  classe: number;
  type: string;
  collectif: boolean;
}

export default function PlanComptablePage() {
  const router = useRouter();
  const [comptes, setComptes] = useState<CompteComptable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClasse, setSelectedClasse] = useState<string>("");
  const [search, setSearch] = useState("");

  async function loadComptes() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedClasse) params.append("classe", selectedClasse);
      if (search) params.append("search", search);

      const res = await fetch(
        `${API_URL}/plan-comptable/comptes?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Erreur chargement plan comptable");
      const data = await res.json();
      setComptes(data);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function initializePlan() {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/plan-comptable/initialize`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Erreur initialisation");
      await loadComptes();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  useEffect(() => {
    loadComptes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClasse, search]);

  const classes = [
    { value: "1", label: "Classe 1 - Financement permanent" },
    { value: "2", label: "Classe 2 - Actif immobilisé" },
    { value: "3", label: "Classe 3 - Stocks" },
    { value: "4", label: "Classe 4 - Tiers" },
    { value: "5", label: "Classe 5 - Trésorerie" },
    { value: "6", label: "Classe 6 - Charges" },
    { value: "7", label: "Classe 7 - Produits" },
    { value: "8", label: "Classe 8 - Résultats" },
  ];

  const comptesParClasse = comptes.reduce((acc, compte) => {
    if (!acc[compte.classe]) {
      acc[compte.classe] = [];
    }
    acc[compte.classe].push(compte);
    return acc;
  }, {} as Record<number, CompteComptable[]>);

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 px-4 py-10 font-sans">
      <main className="w-full max-w-6xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Plan comptable SYSCOHADA
            </h1>
            <p className="text-sm text-zinc-500">
              Consultez le plan comptable conforme au SYSCOHADA.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push("/grand-livre")}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Grand livre
            </button>
          </div>
        </header>

        {/* Filtres */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Recherche
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Code ou libellé..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Classe
              </label>
              <select
                value={selectedClasse}
                onChange={(e) => setSelectedClasse(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              >
                <option value="">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {loading && <p className="text-sm text-zinc-500">Chargement...</p>}
        {error && (
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
            {error.includes("introuvable") && (
              <button
                onClick={initializePlan}
                className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Initialiser le plan comptable
              </button>
            )}
          </div>
        )}

        {/* Liste des comptes par classe */}
        {!loading && comptes.length === 0 && (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500 mb-4">
              Le plan comptable n'a pas encore été initialisé.
            </p>
            <button
              onClick={initializePlan}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Initialiser le plan comptable SYSCOHADA
            </button>
          </section>
        )}

        {!loading && comptes.length > 0 && (
          <div className="space-y-6">
            {Object.entries(comptesParClasse)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([classe, comptesClasse]) => (
                <section
                  key={classe}
                  className="rounded-xl bg-white p-4 shadow-sm"
                >
                  <h2 className="mb-3 text-sm font-semibold text-zinc-900">
                    {classes.find((c) => c.value === classe)?.label ||
                      `Classe ${classe}`}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200">
                          <th className="py-2 pr-4 text-left">Code</th>
                          <th className="py-2 pr-4 text-left">Libellé</th>
                          <th className="py-2 pr-4 text-left">Type</th>
                          <th className="py-2 pr-4 text-center">Collectif</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comptesClasse.map((compte) => (
                          <tr
                            key={compte.id}
                            className="border-b border-zinc-100 last:border-0"
                          >
                            <td className="py-2 pr-4 font-mono font-medium text-zinc-900">
                              {compte.code}
                            </td>
                            <td className="py-2 pr-4 text-zinc-700">
                              {compte.libelle}
                            </td>
                            <td className="py-2 pr-4">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-medium ${
                                  compte.type === "ACTIF" ||
                                  compte.type === "CHARGE"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {compte.type}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-center">
                              {compte.collectif ? (
                                <span className="text-xs text-zinc-500">Oui</span>
                              ) : (
                                <span className="text-xs text-zinc-400">Non</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
