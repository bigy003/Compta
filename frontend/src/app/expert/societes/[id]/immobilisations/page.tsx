"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TEAL = "#14b8a6";

interface Immobilisation {
  id: string;
  designation: string;
  categorie: string;
  dateAcquisition: string;
  valeurOrigine: number | string;
  dureeAnnees: number;
  methode: string;
  commentaire: string | null;
}

const CATEGORIES = [
  { value: "VEHICULE", label: "Véhicule" },
  { value: "MATERIEL_INFORMATIQUE", label: "Matériel informatique" },
  { value: "MOBILIER", label: "Mobilier" },
  { value: "BATIMENT", label: "Bâtiment" },
  { value: "AUTRE", label: "Autre" },
];

function formatFCFA(n: number): string {
  return `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA`;
}

export default function ExpertImmobilisationsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const societeId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<Immobilisation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [designation, setDesignation] = useState("");
  const [categorie, setCategorie] = useState("VEHICULE");
  const [dateAcquisition, setDateAcquisition] = useState(new Date().toISOString().split("T")[0]);
  const [valeurOrigine, setValeurOrigine] = useState("");
  const [dureeAnnees, setDureeAnnees] = useState("5");
  const [commentaire, setCommentaire] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function loadList() {
    if (!societeId) return;
    const res = await fetch(`${API_URL}/societes/${societeId}/immobilisations`);
    if (res.ok) setList(await res.json());
  }

  async function initData() {
    if (!societeId) return;
    try {
      setLoading(true);
      setError(null);
      await loadList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;
    try {
      const res = await fetch(`${API_URL}/societes/${societeId}/immobilisations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation,
          categorie,
          dateAcquisition,
          valeurOrigine: Number(valeurOrigine) || 0,
          dureeAnnees: Number(dureeAnnees) || 5,
          commentaire: commentaire || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur création");
      }
      setNotification({ type: "success", message: "Immobilisation créée" });
      setShowForm(false);
      setDesignation("");
      setValeurOrigine("");
      setCommentaire("");
      await loadList();
    } catch (err: unknown) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Erreur" });
    }
  }

  async function handleDelete(id: string) {
    if (!societeId || !confirm("Supprimer cette immobilisation ?")) return;
    try {
      const res = await fetch(`${API_URL}/societes/${societeId}/immobilisations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      setNotification({ type: "success", message: "Immobilisation supprimée" });
      await loadList();
    } catch (err: unknown) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Erreur" });
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/");
      return;
    }
    if (societeId) initData();
  }, [societeId]);

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
          <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500 shadow-md">Chargement...</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  const detailUrl = (immoId: string) => `/expert/societes/${societeId}/immobilisations/${immoId}`;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Immobilisations</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Suivi des actifs et plans d&apos;amortissement pour cette société (SYSCOHADA).</p>
        </header>

        {notification && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              notification.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {notification.message}
          </div>
        )}

        <section className="rounded-xl bg-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 p-4">
            <h2 className="text-base font-bold text-zinc-900">Liste des immobilisations</h2>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              {showForm ? "Annuler" : "Nouvelle immobilisation"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="border-b border-zinc-100 bg-zinc-50/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-800">Créer une immobilisation</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  type="text"
                  placeholder="Désignation *"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                  required
                />
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateAcquisition}
                  onChange={(e) => setDateAcquisition(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                  required
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Valeur d'origine (FCFA) *"
                  value={valeurOrigine}
                  onChange={(e) => setValeurOrigine(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                  required
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  placeholder="Durée (années) *"
                  value={dureeAnnees}
                  onChange={(e) => setDureeAnnees(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                  required
                />
                <input
                  type="text"
                  placeholder="Commentaire (optionnel)"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6] sm:col-span-2"
                />
              </div>
              <button type="submit" className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm" style={{ backgroundColor: TEAL }}>
                Enregistrer
              </button>
            </form>
          )}

          <div className="p-4">
            {list.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucune immobilisation. Créez une immobilisation pour commencer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase text-zinc-600">
                      <th className="px-4 py-3">Désignation</th>
                      <th className="px-4 py-3">Catégorie</th>
                      <th className="px-4 py-3">Date acquisition</th>
                      <th className="px-4 py-3">Valeur d&apos;origine</th>
                      <th className="px-4 py-3">Durée</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {list.map((immo) => (
                      <tr key={immo.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-medium text-zinc-900">{immo.designation}</td>
                        <td className="px-4 py-3 text-sm text-zinc-600">
                          {CATEGORIES.find((c) => c.value === immo.categorie)?.label ?? immo.categorie}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">
                          {new Date(immo.dateAcquisition).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                          {formatFCFA(Number(immo.valeurOrigine))}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">{immo.dureeAnnees} an(s)</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => router.push(detailUrl(immo.id))}
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                              Plan d&apos;amortissement
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(immo.id)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
