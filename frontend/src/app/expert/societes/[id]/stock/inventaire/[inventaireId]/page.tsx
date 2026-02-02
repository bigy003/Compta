"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TEAL = "#14b8a6";

interface Produit {
  id: string;
  reference: string;
  designation: string;
  unite: string;
  quantiteEnStock: number | string;
}

interface LigneInventaire {
  id: string;
  produitId: string;
  quantiteComptee: number | string;
  quantiteSysteme: number | string;
  produit: Produit;
}

interface Inventaire {
  id: string;
  societeId: string;
  dateInventaire: string;
  statut: string;
  commentaire: string | null;
  lignesInventaire: LigneInventaire[];
}

export default function ExpertInventaireDetailPage() {
  const params = useParams<{ id: string; inventaireId: string }>();
  const router = useRouter();
  const societeId = params.id;
  const inventaireId = params.inventaireId;

  const [inventaire, setInventaire] = useState<Inventaire | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduitId, setSelectedProduitId] = useState("");
  const [quantiteComptee, setQuantiteComptee] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function loadInventaire() {
    if (!societeId || !inventaireId) return;
    const res = await fetch(`${API_URL}/societes/${societeId}/stock/inventaires/${inventaireId}`);
    if (res.ok) setInventaire(await res.json());
    else setInventaire(null);
  }

  async function loadProduits() {
    if (!societeId) return;
    const res = await fetch(`${API_URL}/societes/${societeId}/stock/produits`);
    if (res.ok) setProduits(await res.json());
  }

  async function initData() {
    if (!societeId || !inventaireId) return;
    try {
      setLoading(true);
      setError(null);
      await loadInventaire();
      await loadProduits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function ajouterLigne(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId || !inventaireId || !selectedProduitId || !quantiteComptee) return;
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/stock/inventaires/${inventaireId}/lignes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            produitId: selectedProduitId,
            quantiteComptee: Number(quantiteComptee),
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur");
      }
      setNotification({ type: "success", message: "Ligne ajoutée" });
      setQuantiteComptee("");
      setSelectedProduitId("");
      await loadInventaire();
    } catch (err: unknown) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Erreur" });
    }
  }

  async function cloturer() {
    if (!societeId || !inventaire) return;
    if (!confirm("Clôturer cet inventaire va ajuster les stocks selon les quantités comptées. Continuer ?")) return;
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/stock/inventaires/${inventaireId}/cloturer`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur clôture");
      }
      setNotification({ type: "success", message: "Inventaire clôturé" });
      await loadInventaire();
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
    initData();
  }, [societeId, inventaireId]);

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
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
        </div>
      </div>
    );
  }
  if (!inventaire) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">Inventaire introuvable</div>
        </div>
      </div>
    );
  }

  const canEdit = inventaire.statut === "BROUILLON";
  const backUrl = `/expert/societes/${societeId}/stock`;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push(backUrl)}
              className="mb-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              ← Retour Stock
            </button>
            <h1 className="text-xl font-bold text-zinc-900">Inventaire du {new Date(inventaire.dateInventaire).toLocaleDateString("fr-FR")}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  inventaire.statut === "CLOTURE" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {inventaire.statut}
              </span>
            </p>
          </div>
          {canEdit && inventaire.lignesInventaire.length > 0 && (
            <button
              type="button"
              onClick={cloturer}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Clôturer l'inventaire
            </button>
          )}
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

        {canEdit && (
          <section className="rounded-xl bg-white p-5 shadow-md">
            <h2 className="mb-3 text-base font-bold text-zinc-900">Ajouter une ligne (quantité comptée)</h2>
            <form onSubmit={ajouterLigne} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px]">
                <label className="mb-1 block text-xs font-medium text-zinc-600">Produit</label>
                <select
                  value={selectedProduitId}
                  onChange={(e) => setSelectedProduitId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                  required
                >
                  <option value="">Choisir</option>
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.reference} - {p.designation} (système: {Number(p.quantiteEnStock)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-medium text-zinc-600">Quantité comptée</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={quantiteComptee}
                  onChange={(e) => setQuantiteComptee(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                  required
                />
              </div>
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm"
                style={{ backgroundColor: TEAL }}
              >
                Ajouter
              </button>
            </form>
          </section>
        )}

        <section className="rounded-xl bg-white shadow-md">
          <div className="border-b border-zinc-100 p-4">
            <h2 className="text-base font-bold text-zinc-900">Lignes d'inventaire ({inventaire.lignesInventaire.length})</h2>
          </div>
          {inventaire.lignesInventaire.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Aucune ligne. Ajoutez des quantités comptées puis clôturez l'inventaire.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase text-zinc-600">
                    <th className="px-4 py-3">Produit</th>
                    <th className="px-4 py-3">Quantité système</th>
                    <th className="px-4 py-3">Quantité comptée</th>
                    <th className="px-4 py-3">Écart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {inventaire.lignesInventaire.map((l) => {
                    const sys = Number(l.quantiteSysteme);
                    const cpt = Number(l.quantiteComptee);
                    const ecart = cpt - sys;
                    return (
                      <tr key={l.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          {l.produit.reference} - {l.produit.designation}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">{sys.toLocaleString("fr-FR")}</td>
                        <td className="px-4 py-3 text-sm font-medium text-zinc-900">{cpt.toLocaleString("fr-FR")}</td>
                        <td
                          className={`px-4 py-3 text-sm font-medium ${ecart >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {ecart >= 0 ? "+" : ""}
                          {ecart.toLocaleString("fr-FR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
