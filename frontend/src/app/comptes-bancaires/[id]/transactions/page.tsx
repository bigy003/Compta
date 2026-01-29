"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Transaction {
  id: string;
  date: string;
  montant: string | number;
  libelle: string;
  type: "DEBIT" | "CREDIT";
  categorie?: string | null;
  reference?: string | null;
  rapproche: boolean;
  recetteId?: string | null;
  depenseId?: string | null;
  recette?: {
    id: string;
    date: string;
    montant: string | number;
    description?: string | null;
  } | null;
  depense?: {
    id: string;
    date: string;
    montant: string | number;
    description?: string | null;
  } | null;
}

interface CompteBancaire {
  id: string;
  nom: string;
  banque?: string | null;
  devise: string;
}

interface TransactionForm {
  date: string;
  montant: number;
  libelle: string;
  type: "DEBIT" | "CREDIT";
  categorie: string;
  reference: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const params = useParams();
  const compteId = params.id as string;

  const [societeId, setSocieteId] = useState<string | null>(null);
  const [compte, setCompte] = useState<CompteBancaire | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solde, setSolde] = useState<any>(null);

  const [form, setForm] = useState<TransactionForm>({
    date: new Date().toISOString().split("T")[0],
    montant: 0,
    libelle: "",
    type: "DEBIT",
    categorie: "",
    reference: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TransactionForm>({
    date: "",
    montant: 0,
    libelle: "",
    type: "DEBIT",
    categorie: "",
    reference: "",
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().getMonth().toString(),
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString(),
  );

  const [showRapprochementModal, setShowRapprochementModal] = useState<string | null>(null);
  const [recettesNonRapprochees, setRecettesNonRapprochees] = useState<any[]>([]);
  const [depensesNonRapprochees, setDepensesNonRapprochees] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

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

      await loadCompte(firstId);
      await loadTransactions(firstId);
      await loadSolde(firstId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function loadCompte(currentSocieteId: string) {
    const res = await fetch(
      `${API_URL}/societes/${currentSocieteId}/comptes-bancaires`,
    );
    if (!res.ok) throw new Error("Erreur chargement comptes");
    const comptes = await res.json();
    const compteFound = comptes.find((c: CompteBancaire) => c.id === compteId);
    if (compteFound) {
      setCompte(compteFound);
    }
  }

  async function loadTransactions(currentSocieteId: string, loadAll: boolean = false) {
    let url = `${API_URL}/societes/${currentSocieteId}/comptes-bancaires/${compteId}/transactions`;
    
    if (!loadAll) {
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      const from = new Date(year, month, 1).toISOString();
      const to = new Date(year, month + 1, 0).toISOString();
      url += `?from=${from}&to=${to}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur chargement transactions");
    const data = await res.json();
    setTransactions(data);
  }

  async function loadSolde(currentSocieteId: string) {
    const res = await fetch(
      `${API_URL}/societes/${currentSocieteId}/comptes-bancaires/${compteId}/solde`,
    );
    if (res.ok) {
      const data = await res.json();
      setSolde(data);
    }
  }

  async function loadRecettesNonRapprochees(currentSocieteId: string) {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0).toISOString();

    const res = await fetch(
      `${API_URL}/societes/${currentSocieteId}/comptes-bancaires/recettes-non-rapprochees?from=${from}&to=${to}`,
    );
    if (res.ok) {
      const data = await res.json();
      setRecettesNonRapprochees(data);
    }
  }

  async function loadDepensesNonRapprochees(currentSocieteId: string) {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0).toISOString();

    const res = await fetch(
      `${API_URL}/societes/${currentSocieteId}/comptes-bancaires/depenses-non-rapprochees?from=${from}&to=${to}`,
    );
    if (res.ok) {
      const data = await res.json();
      setDepensesNonRapprochees(data);
    }
  }

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (societeId) {
      loadTransactions(societeId);
      loadSolde(societeId);
      loadRecettesNonRapprochees(societeId);
      loadDepensesNonRapprochees(societeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, societeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires/${compteId}/transactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: form.date,
            montant: form.montant,
            libelle: form.libelle,
            type: form.type,
            categorie: form.categorie || undefined,
            reference: form.reference || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur création transaction");
      }
      setForm({
        date: new Date().toISOString().split("T")[0],
        montant: 0,
        libelle: "",
        type: "DEBIT",
        categorie: "",
        reference: "",
      });
      await loadTransactions(societeId);
      await loadSolde(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  function startEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setEditForm({
      date: transaction.date.split("T")[0],
      montant: Number(transaction.montant),
      libelle: transaction.libelle,
      type: transaction.type,
      categorie: transaction.categorie || "",
      reference: transaction.reference || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({
      date: "",
      montant: 0,
      libelle: "",
      type: "DEBIT",
      categorie: "",
      reference: "",
    });
  }

  async function handleUpdate() {
    if (!societeId || !editingId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires/${compteId}/transactions/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: editForm.date,
            montant: editForm.montant,
            libelle: editForm.libelle,
            type: editForm.type,
            categorie: editForm.categorie || undefined,
            reference: editForm.reference || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur modification");
      }
      cancelEdit();
      await loadTransactions(societeId);
      await loadSolde(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleDelete(id: string) {
    if (!societeId) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette transaction ?"))
      return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires/${compteId}/transactions/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur suppression");
      }
      await loadTransactions(societeId);
      await loadSolde(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleImportReleve(file: File | undefined) {
    if (!societeId || !file) return;
    try {
      setError(null);
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires/${compteId}/import-releve`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de l'import");
      }

      const result = await res.json();
      
      console.log('[Frontend] Résultat import:', result);
      
      // Afficher une notification selon le cas
      if (result.dejaImporte) {
        console.log('[Frontend] Affichage notification: fichier déjà importé');
        setNotification({
          message: result.message || 'Ce fichier a déjà été importé.',
          type: 'warning',
        });
      } else {
        console.log('[Frontend] Affichage notification: import réussi');
        setNotification({
          message: result.message || `Fichier importé avec succès : ${result.total} transaction(s) importée(s)`,
          type: 'success',
        });
      }
      
      // Masquer la notification après 5 secondes
      setTimeout(() => {
        console.log('[Frontend] Masquage notification après 5s');
        setNotification(null);
      }, 5000);
      
      // Charger toutes les transactions après l'import pour voir les nouvelles transactions
      await loadTransactions(societeId, true);
      await loadSolde(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }


  async function handleRapprocherAvecRecette(transactionId: string, recetteId: string) {
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires/${compteId}/transactions/${transactionId}/rapprocher/recette/${recetteId}`,
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur rapprochement");
      }
      setShowRapprochementModal(null);
      await loadTransactions(societeId);
      await loadRecettesNonRapprochees(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleRapprocherAvecDepense(transactionId: string, depenseId: string) {
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires/${compteId}/transactions/${transactionId}/rapprocher/depense/${depenseId}`,
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur rapprochement");
      }
      setShowRapprochementModal(null);
      await loadTransactions(societeId);
      await loadDepensesNonRapprochees(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleAnnulerRapprochement(transactionId: string) {
    if (!societeId) return;
    if (!confirm("Êtes-vous sûr de vouloir annuler le rapprochement ?")) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires/${compteId}/transactions/${transactionId}/annuler-rapprochement`,
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur annulation");
      }
      await loadTransactions(societeId);
      await loadRecettesNonRapprochees(societeId);
      await loadDepensesNonRapprochees(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

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
          <button
            onClick={() => router.push("/comptes-bancaires")}
            className="mb-2 text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Retour aux comptes
          </button>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Transactions - {compte?.nom || "Chargement..."}
          </h1>
          <p className="text-sm text-zinc-500">
            Gérez les transactions de ce compte bancaire.
          </p>
        </header>

        {/* Résumé rapide */}
        {!loading && solde && (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Solde initial
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  {solde.soldeInitial.toLocaleString("fr-FR")}{" "}
                  {compte?.devise || "FCFA"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Total crédits
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-600">
                  +{solde.totalCredits.toLocaleString("fr-FR")}{" "}
                  {compte?.devise || "FCFA"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Total débits
                </p>
                <p className="mt-1 text-lg font-semibold text-red-600">
                  -{solde.totalDebits.toLocaleString("fr-FR")}{" "}
                  {compte?.devise || "FCFA"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Solde actuel
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  {solde.solde.toLocaleString("fr-FR")}{" "}
                  {compte?.devise || "FCFA"}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Filtres */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Mois
              </label>
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
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Année
              </label>
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
        </section>

        {/* Import de relevé bancaire */}
        <section className="rounded-xl bg-blue-50 border border-blue-200 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-blue-900">
            📥 Importer un relevé bancaire (CSV/TXT)
          </h2>
          <div className="space-y-2">
            <p className="text-xs text-blue-700">
              Formats supportés : CSV (Date,Montant,Libellé,Référence) ou TXT (Date|Montant|Libellé|Référence). Les doublons sont automatiquement supprimés lors de l'import.
            </p>
            <label className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 cursor-pointer">
              📄 Choisir un fichier
              <input
                type="file"
                accept=".csv,.txt,.CSV,.TXT"
                className="hidden"
                onChange={(e) => handleImportReleve(e.target.files?.[0])}
              />
            </label>
          </div>
        </section>

        {/* Formulaire de création */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Nouvelle transaction
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Type *
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as "DEBIT" | "CREDIT",
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                >
                  <option value="DEBIT">Débit</option>
                  <option value="CREDIT">Crédit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Montant *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.montant || ""}
                  onChange={(e) =>
                    setForm({ ...form, montant: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={form.categorie}
                  onChange={(e) =>
                    setForm({ ...form, categorie: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: Virement, Prélèvement"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Libellé *
                </label>
                <input
                  type="text"
                  value={form.libelle}
                  onChange={(e) =>
                    setForm({ ...form, libelle: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="Description de la transaction"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Référence
                </label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="Référence bancaire"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Ajouter la transaction
            </button>
          </form>
        </section>

        {loading && (
          <p className="text-sm text-zinc-500">Chargement...</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Liste des transactions */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Liste des transactions
          </h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune transaction pour cette période.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="py-2 pr-4 text-left">Date</th>
                    <th className="py-2 pr-4 text-left">Libellé</th>
                    <th className="py-2 pr-4 text-left">Type</th>
                    <th className="py-2 pr-4 text-left">Catégorie</th>
                    <th className="py-2 pr-4 text-right">Montant</th>
                    <th className="py-2 pr-4 text-left">Rapprochement</th>
                    <th className="py-2 pr-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-zinc-100">
                      {editingId === t.id ? (
                        <>
                          <td colSpan={7} className="py-3">
                            <div className="space-y-2">
                              <div className="grid gap-2 md:grid-cols-4">
                                <input
                                  type="date"
                                  value={editForm.date}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      date: e.target.value,
                                    })
                                  }
                                  className="rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                                />
                                <select
                                  value={editForm.type}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      type: e.target.value as "DEBIT" | "CREDIT",
                                    })
                                  }
                                  className="rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                                >
                                  <option value="DEBIT">Débit</option>
                                  <option value="CREDIT">Crédit</option>
                                </select>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.montant || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      montant: Number(e.target.value),
                                    })
                                  }
                                  className="rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                                />
                                <input
                                  type="text"
                                  value={editForm.categorie}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      categorie: e.target.value,
                                    })
                                  }
                                  placeholder="Catégorie"
                                  className="rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                                />
                              </div>
                              <input
                                type="text"
                                value={editForm.libelle}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    libelle: e.target.value,
                                  })
                                }
                                placeholder="Libellé"
                                className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleUpdate}
                                  className="rounded-lg bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800"
                                >
                                  Enregistrer
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-4 text-zinc-600">
                            {new Date(t.date).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="py-2 pr-4 text-zinc-900">
                            {t.libelle}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-medium ${
                                t.type === "CREDIT"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {t.type === "CREDIT" ? "Crédit" : "Débit"}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-zinc-600">
                            {t.categorie || "-"}
                          </td>
                          <td
                            className={`py-2 pr-4 text-right font-medium ${
                              t.type === "CREDIT"
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {t.type === "CREDIT" ? "+" : "-"}
                            {Number(t.montant).toLocaleString("fr-FR")}{" "}
                            {compte?.devise || "FCFA"}
                          </td>
                          <td className="py-2 pr-4">
                            {t.rapproche ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  Rapproché
                                </span>
                                {t.recette && (
                                  <p className="text-xs text-zinc-500">
                                    Recette: {Number(t.recette.montant).toLocaleString("fr-FR")} FCFA
                                  </p>
                                )}
                                {t.depense && (
                                  <p className="text-xs text-zinc-500">
                                    Dépense: {Number(t.depense.montant).toLocaleString("fr-FR")} FCFA
                                  </p>
                                )}
                                <button
                                  onClick={() => handleAnnulerRapprochement(t.id)}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowRapprochementModal(t.id)}
                                className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                Rapprocher
                              </button>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(t)}
                                className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modale de rapprochement */}
        {showRapprochementModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900">
                  Rapprocher la transaction
                </h3>
                <button
                  onClick={() => setShowRapprochementModal(null)}
                  className="text-zinc-500 hover:text-zinc-900"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-zinc-800">
                    Recettes non rapprochées
                  </h4>
                  {recettesNonRapprochees.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      Aucune recette disponible
                    </p>
                  ) : (
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {recettesNonRapprochees.map((r) => (
                        <button
                          key={r.id}
                          onClick={() =>
                            handleRapprocherAvecRecette(showRapprochementModal, r.id)
                          }
                          className="w-full rounded-lg border border-zinc-200 p-2 text-left text-sm hover:bg-zinc-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-zinc-900">
                                {new Date(r.date).toLocaleDateString("fr-FR")}
                              </p>
                              {r.description && (
                                <p className="text-xs text-zinc-500">
                                  {r.description}
                                </p>
                              )}
                            </div>
                            <p className="font-medium text-emerald-600">
                              {Number(r.montant).toLocaleString("fr-FR")} FCFA
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-zinc-800">
                    Dépenses non rapprochées
                  </h4>
                  {depensesNonRapprochees.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      Aucune dépense disponible
                    </p>
                  ) : (
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {depensesNonRapprochees.map((d) => (
                        <button
                          key={d.id}
                          onClick={() =>
                            handleRapprocherAvecDepense(showRapprochementModal, d.id)
                          }
                          className="w-full rounded-lg border border-zinc-200 p-2 text-left text-sm hover:bg-zinc-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-zinc-900">
                                {new Date(d.date).toLocaleDateString("fr-FR")}
                              </p>
                              {d.description && (
                                <p className="text-xs text-zinc-500">
                                  {d.description}
                                </p>
                              )}
                            </div>
                            <p className="font-medium text-red-600">
                              {Number(d.montant).toLocaleString("fr-FR")} FCFA
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
