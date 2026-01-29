"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PeriodFilter } from "../../../../components/PeriodFilter";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Mouvement {
  id: string;
  date: string;
  montant: string | number;
  description?: string | null;
}

interface MouvementForm {
  date: string;
  montant: number;
  description: string;
}

export default function ExpertTresoreriePage() {
  const params = useParams<{ id: string }>();
  const societeId = params.id;

  const [recettes, setRecettes] = useState<Mouvement[]>([]);
  const [depenses, setDepenses] = useState<Mouvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const [recetteForm, setRecetteForm] = useState<MouvementForm>({
    date: "",
    montant: 0,
    description: "",
  });
  const [depenseForm, setDepenseForm] = useState<MouvementForm>({
    date: "",
    montant: 0,
    description: "",
  });

  async function loadRecettes(currentSocieteId: string) {
    let url = `${API_URL}/societes/${currentSocieteId}/recettes`;
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
    if (!res.ok) throw new Error("Erreur chargement recettes");
    const data = await res.json();
    setRecettes(data);
  }

  async function loadDepenses(currentSocieteId: string) {
    let url = `${API_URL}/societes/${currentSocieteId}/depenses`;
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
    if (!res.ok) throw new Error("Erreur chargement dépenses");
    const data = await res.json();
    setDepenses(data);
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (societeId) {
          await Promise.all([
            loadRecettes(societeId),
            loadDepenses(societeId),
          ]);
        }
      } catch (err: any) {
        setError(err.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societeId, selectedMonth, selectedYear]);

  async function handleSubmitRecette(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;
    try {
      setError(null);
      const isoDate =
        recetteForm.date && recetteForm.date.length > 0
          ? new Date(recetteForm.date).toISOString()
          : new Date().toISOString();

      const res = await fetch(
        `${API_URL}/societes/${societeId}/recettes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: isoDate,
            montant: Number(recetteForm.montant),
            description: recetteForm.description,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur création recette");
      }
      setRecetteForm({ date: "", montant: 0, description: "" });
      await loadRecettes(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleSubmitDepense(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;
    try {
      setError(null);
      const isoDate =
        depenseForm.date && depenseForm.date.length > 0
          ? new Date(depenseForm.date).toISOString()
          : new Date().toISOString();

      const res = await fetch(
        `${API_URL}/societes/${societeId}/depenses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: isoDate,
            montant: Number(depenseForm.montant),
            description: depenseForm.description,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur création dépense");
      }
      setDepenseForm({ date: "", montant: 0, description: "" });
      await loadDepenses(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 px-4 py-10 font-sans">
      <main className="w-full max-w-5xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Trésorerie (vue expert)
            </h1>
            <p className="text-sm text-zinc-500">
              Gérez les encaissements et décaissements de cette société.
            </p>
          </div>
          <PeriodFilter
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onReset={() => {
              setSelectedMonth("");
              setSelectedYear("");
            }}
          />
        </header>

        {/* Résumé rapide */}
        {!loading && (recettes.length > 0 || depenses.length > 0) && (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-3 gap-4 flex-1">
                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Recettes
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-600">
                    {recettes.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Dépenses
                  </p>
                  <p className="mt-1 text-lg font-semibold text-red-600">
                    {depenses.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Solde
                  </p>
                  <p className={`mt-1 text-lg font-semibold ${
                    (recettes.reduce((sum, r) => sum + Number(r.montant), 0) - 
                     depenses.reduce((sum, d) => sum + Number(d.montant), 0)) >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}>
                    {(recettes.reduce((sum, r) => sum + Number(r.montant), 0) - 
                      depenses.reduce((sum, d) => sum + Number(d.montant), 0)).toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {loading && (
          <p className="text-sm text-zinc-500">Chargement...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Formulaires de création */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium text-zinc-800">
              Nouvelle recette
            </h2>
            <form onSubmit={handleSubmitRecette} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={recetteForm.date}
                  onChange={(e) =>
                    setRecetteForm({ ...recetteForm, date: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={recetteForm.montant || ""}
                  onChange={(e) =>
                    setRecetteForm({
                      ...recetteForm,
                      montant: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={recetteForm.description}
                  onChange={(e) =>
                    setRecetteForm({
                      ...recetteForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: Vente de produits"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Ajouter recette
              </button>
            </form>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium text-zinc-800">
              Nouvelle dépense
            </h2>
            <form onSubmit={handleSubmitDepense} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={depenseForm.date}
                  onChange={(e) =>
                    setDepenseForm({ ...depenseForm, date: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={depenseForm.montant || ""}
                  onChange={(e) =>
                    setDepenseForm({
                      ...depenseForm,
                      montant: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={depenseForm.description}
                  onChange={(e) =>
                    setDepenseForm({
                      ...depenseForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: Achat de matériel"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Ajouter dépense
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium text-zinc-800">
              Recettes
            </h2>
            {recettes.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Aucune recette enregistrée.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 text-sm">
                {recettes.map((r) => (
                  <li key={r.id} className="flex justify-between py-2">
                    <div>
                      <p className="text-zinc-900">
                        {new Date(r.date).toLocaleDateString("fr-FR")}
                      </p>
                      {r.description && (
                        <p className="text-xs text-zinc-500">
                          {r.description}
                        </p>
                      )}
                    </div>
                    <p className="font-medium text-emerald-700">
                      {Number(r.montant).toLocaleString("fr-FR")} FCFA
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium text-zinc-800">
              Dépenses
            </h2>
            {depenses.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Aucune dépense enregistrée.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 text-sm">
                {depenses.map((d) => (
                  <li key={d.id} className="flex justify-between py-2">
                    <div>
                      <p className="text-zinc-900">
                        {new Date(d.date).toLocaleDateString("fr-FR")}
                      </p>
                      {d.description && (
                        <p className="text-xs text-zinc-500">
                          {d.description}
                        </p>
                      )}
                    </div>
                    <p className="font-medium text-red-700">
                      {Number(d.montant).toLocaleString("fr-FR")} FCFA
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
