"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface CompteBancaire {
  id: string;
  nom: string;
  banque?: string | null;
  numeroCompte?: string | null;
  iban?: string | null;
  devise: string;
  soldeInitial: string | number;
  actif: boolean;
}

interface CompteForm {
  nom: string;
  banque: string;
  numeroCompte: string;
  iban: string;
  devise: string;
  soldeInitial: number;
}

export default function ComptesBancairesPage() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const [comptes, setComptes] = useState<CompteBancaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soldes, setSoldes] = useState<Record<string, any>>({});

  const [form, setForm] = useState<CompteForm>({
    nom: "",
    banque: "",
    numeroCompte: "",
    iban: "",
    devise: "FCFA",
    soldeInitial: 0,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CompteForm>({
    nom: "",
    banque: "",
    numeroCompte: "",
    iban: "",
    devise: "FCFA",
    soldeInitial: 0,
  });

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

      await loadComptes(firstId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function loadComptes(currentSocieteId: string) {
    const res = await fetch(
      `${API_URL}/societes/${currentSocieteId}/comptes-bancaires`,
    );
    if (!res.ok) throw new Error("Erreur chargement comptes");
    const data = await res.json();
    setComptes(data);

    // Charger les soldes pour chaque compte
    const soldesData: Record<string, any> = {};
    for (const compte of data) {
      const resSolde = await fetch(
        `${API_URL}/societes/${currentSocieteId}/comptes-bancaires/${compte.id}/solde`,
      );
      if (resSolde.ok) {
        soldesData[compte.id] = await resSolde.json();
      }
    }
    setSoldes(soldesData);
  }

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom: form.nom,
            banque: form.banque || undefined,
            numeroCompte: form.numeroCompte || undefined,
            iban: form.iban || undefined,
            devise: form.devise,
            soldeInitial: form.soldeInitial,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur création compte");
      }
      setForm({
        nom: "",
        banque: "",
        numeroCompte: "",
        iban: "",
        devise: "FCFA",
        soldeInitial: 0,
      });
      await loadComptes(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  function startEdit(compte: CompteBancaire) {
    setEditingId(compte.id);
    setEditForm({
      nom: compte.nom,
      banque: compte.banque || "",
      numeroCompte: compte.numeroCompte || "",
      iban: compte.iban || "",
      devise: compte.devise,
      soldeInitial: Number(compte.soldeInitial),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({
      nom: "",
      banque: "",
      numeroCompte: "",
      iban: "",
      devise: "FCFA",
      soldeInitial: 0,
    });
  }

  async function handleUpdate() {
    if (!societeId || !editingId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom: editForm.nom,
            banque: editForm.banque || undefined,
            numeroCompte: editForm.numeroCompte || undefined,
            iban: editForm.iban || undefined,
            devise: editForm.devise,
            soldeInitial: editForm.soldeInitial,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur modification");
      }
      cancelEdit();
      await loadComptes(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleDelete(id: string) {
    if (!societeId) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur suppression");
      }
      await loadComptes(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 px-4 py-10 font-sans">
      <main className="w-full max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Comptes bancaires
          </h1>
          <p className="text-sm text-zinc-500">
            Gérez vos comptes bancaires et leurs transactions.
          </p>
        </header>

        {/* Résumé rapide */}
        {!loading && comptes.length > 0 && (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Total comptes
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {comptes.length}
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
            </div>
          </section>
        )}

        {/* Formulaire de création */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Nouveau compte bancaire
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nom du compte *
                </label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: Compte principal"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Banque
                </label>
                <input
                  type="text"
                  value={form.banque}
                  onChange={(e) =>
                    setForm({ ...form, banque: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: SGBCI"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Numéro de compte
                </label>
                <input
                  type="text"
                  value={form.numeroCompte}
                  onChange={(e) =>
                    setForm({ ...form, numeroCompte: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  IBAN
                </label>
                <input
                  type="text"
                  value={form.iban}
                  onChange={(e) => setForm({ ...form, iban: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Devise
                </label>
                <select
                  value={form.devise}
                  onChange={(e) =>
                    setForm({ ...form, devise: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="FCFA">FCFA</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Solde initial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.soldeInitial || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      soldeInitial: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Créer le compte
            </button>
          </form>
        </section>

        {loading && (
          <p className="text-sm text-zinc-500">Chargement...</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Liste des comptes */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Liste des comptes bancaires
          </h2>
          {comptes.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucun compte bancaire pour le moment.
            </p>
          ) : (
            <div className="space-y-4">
              {comptes.map((compte) => (
                <div
                  key={compte.id}
                  className="rounded-lg border border-zinc-200 p-4"
                >
                  {editingId === compte.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1">
                            Nom du compte *
                          </label>
                          <input
                            type="text"
                            value={editForm.nom}
                            onChange={(e) =>
                              setEditForm({ ...editForm, nom: e.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1">
                            Banque
                          </label>
                          <input
                            type="text"
                            value={editForm.banque}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                banque: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1">
                            Numéro de compte
                          </label>
                          <input
                            type="text"
                            value={editForm.numeroCompte}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                numeroCompte: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1">
                            IBAN
                          </label>
                          <input
                            type="text"
                            value={editForm.iban}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                iban: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1">
                            Devise
                          </label>
                          <select
                            value={editForm.devise}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                devise: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          >
                            <option value="FCFA">FCFA</option>
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1">
                            Solde initial
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.soldeInitial || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                soldeInitial: Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdate}
                          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-semibold text-zinc-900">
                            {compte.nom}
                          </h3>
                          {compte.banque && (
                            <span className="text-xs text-zinc-500">
                              {compte.banque}
                            </span>
                          )}
                          <span className="text-xs text-zinc-500">
                            {compte.devise}
                          </span>
                        </div>
                        {compte.numeroCompte && (
                          <p className="mt-1 text-xs text-zinc-500">
                            N°: {compte.numeroCompte}
                          </p>
                        )}
                        {soldes[compte.id] && (
                          <p className="mt-2 text-sm font-semibold text-zinc-900">
                            Solde:{" "}
                            {soldes[compte.id].solde.toLocaleString("fr-FR")}{" "}
                            {compte.devise}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            router.push(
                              `/comptes-bancaires/${compte.id}/transactions`,
                            )
                          }
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Transactions
                        </button>
                        <button
                          onClick={() => startEdit(compte)}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(compte.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
