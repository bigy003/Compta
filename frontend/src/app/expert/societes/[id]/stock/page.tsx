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
  seuilAlerte: number | string | null;
}

interface Inventaire {
  id: string;
  dateInventaire: string;
  statut: string;
  commentaire: string | null;
  lignesInventaire: Array<{
    id: string;
    quantiteComptee: number | string;
    quantiteSysteme: number | string;
    produit: Produit;
  }>;
}

const UNITES = ["PIECE", "KG", "LITRE", "METRE", "CARTON", "AUTRE"];

export default function ExpertStockPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const societeId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [activeTab, setActiveTab] = useState<"produits" | "inventaires">("produits");
  const [showFormProduit, setShowFormProduit] = useState(false);
  const [ref, setRef] = useState("");
  const [designation, setDesignation] = useState("");
  const [unite, setUnite] = useState("PIECE");
  const [seuilAlerte, setSeuilAlerte] = useState("");
  const [showFormMouvement, setShowFormMouvement] = useState(false);
  const [mvtProduitId, setMvtProduitId] = useState("");
  const [mvtType, setMvtType] = useState<"ENTREE" | "SORTIE">("ENTREE");
  const [mvtQuantite, setMvtQuantite] = useState("");
  const [mvtDate, setMvtDate] = useState(new Date().toISOString().split("T")[0]);
  const [mvtLibelle, setMvtLibelle] = useState("");
  const [showFormInventaire, setShowFormInventaire] = useState(false);
  const [invDate, setInvDate] = useState(new Date().toISOString().split("T")[0]);
  const [invCommentaire, setInvCommentaire] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function loadProduits() {
    if (!societeId) return;
    const res = await fetch(`${API_URL}/societes/${societeId}/stock/produits`);
    if (res.ok) setProduits(await res.json());
  }

  async function loadInventaires() {
    if (!societeId) return;
    const res = await fetch(`${API_URL}/societes/${societeId}/stock/inventaires`);
    if (res.ok) setInventaires(await res.json());
  }

  async function initData() {
    if (!societeId) return;
    try {
      setLoading(true);
      setError(null);
      await loadProduits();
      await loadInventaires();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduit(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;
    try {
      const res = await fetch(`${API_URL}/societes/${societeId}/stock/produits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: ref,
          designation,
          unite,
          quantiteEnStock: 0,
          seuilAlerte: seuilAlerte ? Number(seuilAlerte) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur création produit");
      }
      setNotification({ type: "success", message: "Produit créé" });
      setShowFormProduit(false);
      setRef("");
      setDesignation("");
      setSeuilAlerte("");
      await loadProduits();
    } catch (err: unknown) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Erreur" });
    }
  }

  async function handleCreateMouvement(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId || !mvtProduitId || !mvtQuantite) return;
    try {
      const res = await fetch(`${API_URL}/societes/${societeId}/stock/mouvements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produitId: mvtProduitId,
          type: mvtType,
          quantite: Number(mvtQuantite),
          date: mvtDate,
          libelle: mvtLibelle || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur mouvement");
      }
      setNotification({ type: "success", message: "Mouvement enregistré" });
      setShowFormMouvement(false);
      setMvtQuantite("");
      setMvtLibelle("");
      await loadProduits();
    } catch (err: unknown) {
      setNotification({ type: "error", message: err instanceof Error ? err.message : "Erreur" });
    }
  }

  async function handleCreateInventaire(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;
    try {
      const res = await fetch(`${API_URL}/societes/${societeId}/stock/inventaires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateInventaire: invDate, commentaire: invCommentaire || undefined }),
      });
      if (!res.ok) throw new Error("Erreur création inventaire");
      setNotification({ type: "success", message: "Inventaire créé" });
      setShowFormInventaire(false);
      setInvCommentaire("");
      await loadInventaires();
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

  const inventaireLink = (invId: string) => `/expert/societes/${societeId}/stock/inventaire/${invId}`;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Stock et inventaire</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Gestion des produits et inventaires pour cette société.</p>
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
          <div className="border-b border-zinc-100">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("produits")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "produits" ? "border-[#14b8a6] text-[#14b8a6]" : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Produits ({produits.length})
              </button>
              <button
                onClick={() => setActiveTab("inventaires")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "inventaires" ? "border-[#14b8a6] text-[#14b8a6]" : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Inventaires ({inventaires.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "produits" && (
              <div className="space-y-6">
                <div className="flex justify-between">
                  <h2 className="text-base font-bold text-zinc-900">Liste des produits</h2>
                  <button
                    type="button"
                    onClick={() => setShowFormProduit((v) => !v)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                    style={{ backgroundColor: TEAL }}
                  >
                    {showFormProduit ? "Annuler" : "Nouveau produit"}
                  </button>
                </div>

                {showFormProduit && (
                  <form onSubmit={handleCreateProduit} className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-800">Créer un produit</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <input type="text" placeholder="Référence *" value={ref} onChange={(e) => setRef(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]" required />
                      <input type="text" placeholder="Désignation *" value={designation} onChange={(e) => setDesignation(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]" required />
                      <select value={unite} onChange={(e) => setUnite(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]">
                        {UNITES.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      <input type="number" min={0} placeholder="Seuil alerte (optionnel)" value={seuilAlerte} onChange={(e) => setSeuilAlerte(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]" />
                    </div>
                    <button type="submit" className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm" style={{ backgroundColor: TEAL }}>Enregistrer</button>
                  </form>
                )}

                {!showFormMouvement && (
                  <button type="button" onClick={() => setShowFormMouvement(true)} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Entrée / Sortie de stock</button>
                )}
                {showFormMouvement && (
                  <form onSubmit={handleCreateMouvement} className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-800">Mouvement de stock</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <select value={mvtProduitId} onChange={(e) => setMvtProduitId(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]" required>
                        <option value="">Choisir un produit</option>
                        {produits.map((p) => (
                          <option key={p.id} value={p.id}>{p.reference} - {p.designation}</option>
                        ))}
                      </select>
                      <select value={mvtType} onChange={(e) => setMvtType(e.target.value as "ENTREE" | "SORTIE")} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]">
                        <option value="ENTREE">Entrée</option>
                        <option value="SORTIE">Sortie</option>
                      </select>
                      <input type="number" min={0.01} step={0.01} placeholder="Quantité *" value={mvtQuantite} onChange={(e) => setMvtQuantite(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]" required />
                      <input type="date" value={mvtDate} onChange={(e) => setMvtDate(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]" />
                    </div>
                    <input type="text" placeholder="Libellé (réf. facture, bon...)" value={mvtLibelle} onChange={(e) => setMvtLibelle(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]" />
                    <div className="mt-3 flex gap-2">
                      <button type="submit" className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm" style={{ backgroundColor: TEAL }}>Enregistrer</button>
                      <button type="button" onClick={() => setShowFormMouvement(false)} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Annuler</button>
                    </div>
                  </form>
                )}

                {produits.length === 0 ? (
                  <p className="text-sm text-zinc-500">Aucun produit. Créez un produit pour commencer.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase text-zinc-600">
                          <th className="px-4 py-3">Référence</th>
                          <th className="px-4 py-3">Désignation</th>
                          <th className="px-4 py-3">Unité</th>
                          <th className="px-4 py-3">Stock</th>
                          <th className="px-4 py-3">Seuil alerte</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {produits.map((p) => {
                          const stock = Number(p.quantiteEnStock);
                          const seuil = p.seuilAlerte != null ? Number(p.seuilAlerte) : null;
                          const alerte = seuil != null && stock < seuil;
                          return (
                            <tr key={p.id} className={alerte ? "bg-red-50/50" : ""}>
                              <td className="px-4 py-3 font-medium text-zinc-900">{p.reference}</td>
                              <td className="px-4 py-3 text-sm text-zinc-700">{p.designation}</td>
                              <td className="px-4 py-3 text-sm text-zinc-600">{p.unite}</td>
                              <td className="px-4 py-3 text-sm font-medium text-zinc-900">{stock.toLocaleString("fr-FR")}</td>
                              <td className="px-4 py-3 text-sm text-zinc-600">{seuil != null ? seuil.toLocaleString("fr-FR") : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "inventaires" && (
              <div className="space-y-6">
                <div className="flex justify-between">
                  <h2 className="text-base font-bold text-zinc-900">Inventaires</h2>
                  <button type="button" onClick={() => setShowFormInventaire((v) => !v)} className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90" style={{ backgroundColor: TEAL }}>
                    {showFormInventaire ? "Annuler" : "Nouvel inventaire"}
                  </button>
                </div>

                {showFormInventaire && (
                  <form onSubmit={handleCreateInventaire} className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-800">Créer un inventaire</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600">Date inventaire</label>
                        <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]" required />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600">Commentaire</label>
                        <input type="text" placeholder="Optionnel" value={invCommentaire} onChange={(e) => setInvCommentaire(e.target.value)} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]" />
                      </div>
                    </div>
                    <button type="submit" className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm" style={{ backgroundColor: TEAL }}>Créer l'inventaire</button>
                  </form>
                )}

                {inventaires.length === 0 ? (
                  <p className="text-sm text-zinc-500">Aucun inventaire.</p>
                ) : (
                  <ul className="space-y-3">
                    {inventaires.map((inv) => (
                      <li key={inv.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-zinc-900">{new Date(inv.dateInventaire).toLocaleDateString("fr-FR")}</span>
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${inv.statut === "CLOTURE" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{inv.statut}</span>
                          </div>
                          <button type="button" onClick={() => router.push(inventaireLink(inv.id))} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Voir / Saisir lignes</button>
                        </div>
                        {inv.commentaire && <p className="mt-1 text-sm text-zinc-500">{inv.commentaire}</p>}
                        {inv.lignesInventaire.length > 0 && <p className="mt-1 text-xs text-zinc-500">{inv.lignesInventaire.length} ligne(s)</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
