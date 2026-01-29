"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Exercice {
  id: string;
  annee: number;
  dateDebut: string;
  dateFin: string;
  statut: "OUVERT" | "FERME";
  dateCloture?: string | null;
  createdAt: string;
}

export default function ExercicesPage() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    annee: new Date().getFullYear(),
    dateDebut: `${new Date().getFullYear()}-01-01`,
    dateFin: `${new Date().getFullYear()}-12-31`,
  });

  async function initData() {
    try {
      setLoading(true);
      setError(null);

      const resSoc = await fetch(`${API_URL}/societes`);
      if (!resSoc.ok) throw new Error("Impossible de charger les sociétés");
      const societes = await resSoc.json();
      if (!Array.isArray(societes) || societes.length === 0) {
        router.push("/");
        return;
      }
      const firstId = societes[0].id;
      setSocieteId(firstId);

      await loadExercices(firstId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function loadExercices(currentSocieteId: string) {
    const res = await fetch(
      `${API_URL}/societes/${currentSocieteId}/exercices`,
    );
    if (!res.ok) throw new Error("Erreur chargement exercices");
    const data = await res.json();
    setExercices(data);
  }

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/exercices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur création exercice");
      }

      setNotification({
        message: `Exercice ${form.annee} créé avec succès`,
        type: 'success',
      });
      setTimeout(() => setNotification(null), 5000);
      
      setShowCreateModal(false);
      setForm({
        annee: new Date().getFullYear(),
        dateDebut: `${new Date().getFullYear()}-01-01`,
        dateFin: `${new Date().getFullYear()}-12-31`,
      });
      await loadExercices(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleFermer(exerciceId: string) {
    if (!societeId) return;
    if (!confirm("Êtes-vous sûr de vouloir fermer cet exercice ? Cette action est irréversible.")) {
      return;
    }
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/exercices/${exerciceId}/fermer`,
        {
          method: "PATCH",
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur fermeture exercice");
      }

      setNotification({
        message: "Exercice fermé avec succès",
        type: 'success',
      });
      setTimeout(() => setNotification(null), 5000);
      
      await loadExercices(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleRouvrir(exerciceId: string) {
    if (!societeId) return;
    if (!confirm("Êtes-vous sûr de vouloir rouvrir cet exercice ?")) {
      return;
    }
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/exercices/${exerciceId}/rouvrir`,
        {
          method: "PATCH",
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur réouverture exercice");
      }

      setNotification({
        message: "Exercice rouvert avec succès",
        type: 'success',
      });
      setTimeout(() => setNotification(null), 5000);
      
      await loadExercices(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  const exerciceCourant = exercices.find((e) => e.statut === "OUVERT");

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 px-4 py-10 font-sans">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[9999] flex min-w-[300px] max-w-[500px] items-center gap-3 rounded-lg border-2 px-4 py-3 shadow-xl animate-slide-in-right ${
            notification.type === 'success'
              ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
              : notification.type === 'warning'
              ? 'border-yellow-300 bg-yellow-100 text-yellow-900'
              : 'border-red-300 bg-red-100 text-red-900'
          }`}
        >
          <span className="text-2xl flex-shrink-0">
            {notification.type === 'success' ? '✅' : notification.type === 'warning' ? '⚠️' : '❌'}
          </span>
          <p className="text-sm font-semibold flex-1">{notification.message}</p>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 flex-shrink-0 text-zinc-500 hover:text-zinc-800 text-lg font-bold"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      <main className="w-full max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Gestion des exercices comptables
          </h1>
          <p className="text-sm text-zinc-500">
            Créez et gérez vos exercices comptables annuels.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Exercice courant */}
        {exerciceCourant && (
          <section className="rounded-xl bg-blue-50 border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-blue-900 mb-1">
                  📅 Exercice en cours
                </h2>
                <p className="text-sm text-blue-700">
                  Année {exerciceCourant.annee} - Du{" "}
                  {new Date(exerciceCourant.dateDebut).toLocaleDateString("fr-FR")} au{" "}
                  {new Date(exerciceCourant.dateFin).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <span className="rounded-full bg-blue-200 px-3 py-1 text-xs font-medium text-blue-800">
                OUVERT
              </span>
            </div>
          </section>
        )}

        {/* Liste des exercices */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-800">
              Liste des exercices
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              + Nouvel exercice
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Chargement...</p>
          ) : exercices.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucun exercice créé. Créez votre premier exercice pour commencer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="py-2 pr-4 text-left">Année</th>
                    <th className="py-2 pr-4 text-left">Date début</th>
                    <th className="py-2 pr-4 text-left">Date fin</th>
                    <th className="py-2 pr-4 text-left">Statut</th>
                    <th className="py-2 pr-4 text-left">Date clôture</th>
                    <th className="py-2 pr-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exercices.map((exercice) => (
                    <tr key={exercice.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 font-medium text-zinc-900">
                        {exercice.annee}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600">
                        {new Date(exercice.dateDebut).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600">
                        {new Date(exercice.dateFin).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            exercice.statut === "OUVERT"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {exercice.statut}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-zinc-600">
                        {exercice.dateCloture
                          ? new Date(exercice.dateCloture).toLocaleDateString("fr-FR")
                          : "-"}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2">
                          {exercice.statut === "OUVERT" ? (
                            <button
                              onClick={() => handleFermer(exercice.id)}
                              className="text-xs text-orange-600 hover:text-orange-800"
                            >
                              Fermer
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRouvrir(exercice.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Rouvrir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal création */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900">
                Créer un nouvel exercice
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Année *
                  </label>
                  <input
                    type="number"
                    value={form.annee}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        annee: parseInt(e.target.value),
                        dateDebut: `${e.target.value}-01-01`,
                        dateFin: `${e.target.value}-12-31`,
                      })
                    }
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    min={2020}
                    max={2100}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    value={form.dateDebut}
                    onChange={(e) =>
                      setForm({ ...form, dateDebut: e.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    value={form.dateFin}
                    onChange={(e) =>
                      setForm({ ...form, dateFin: e.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
