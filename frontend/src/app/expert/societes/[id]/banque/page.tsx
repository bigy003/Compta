"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface TransactionBancaire {
  id: string;
  date: string;
  montant: number;
  libelle: string;
  type: "DEBIT" | "CREDIT";
  categorie?: string | null;
  reference?: string | null;
  rapproche: boolean;
  compteBancaire: {
    id: string;
    nom: string;
    banque?: string | null;
  };
}

interface CompteBancaire {
  id: string;
  nom: string;
  banque?: string | null;
  numeroCompte?: string | null;
  iban?: string | null;
  devise: string;
  actif: boolean;
}

interface IndicateursBanque {
  soldeBancaire: number;
  soldeComptable: number;
  ecart: number;
  transactionsNonRapprochees: number;
  transactionsRapprochees: number;
  recettes: number;
  depenses: number;
}

export default function BanqueExpertPage() {
  const router = useRouter();
  const params = useParams();
  const societeId = params.id as string;

  const [comptes, setComptes] = useState<CompteBancaire[]>([]);
  const [compteSelectionne, setCompteSelectionne] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionBancaire[]>([]);
  const [indicateurs, setIndicateurs] = useState<IndicateursBanque | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtreRapproche, setFiltreRapproche] = useState<boolean | null>(null);
  const [filtreType, setFiltreType] = useState<string>("");
  const [filtreDateFrom, setFiltreDateFrom] = useState<string>("");
  const [filtreDateTo, setFiltreDateTo] = useState<string>("");
  const [filtreSearch, setFiltreSearch] = useState<string>("");
  const [lettrageEnCours, setLettrageEnCours] = useState(false);

  useEffect(() => {
    if (societeId) {
      chargerComptes();
    }
  }, [societeId]);

  useEffect(() => {
    if (compteSelectionne) {
      chargerTransactions();
      chargerIndicateurs();
    }
  }, [compteSelectionne, filtreRapproche, filtreType, filtreDateFrom, filtreDateTo, filtreSearch]);

  async function chargerComptes() {
    try {
      setLoading(true);
      const resComptes = await fetch(`${API_URL}/societes/${societeId}/comptes-bancaires`);
      if (resComptes.ok) {
        const comptesData = await resComptes.json();
        setComptes(comptesData.filter((c: CompteBancaire) => c.actif));
        if (comptesData.length > 0) {
          setCompteSelectionne(comptesData[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }

  async function chargerTransactions() {
    if (!compteSelectionne) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtreRapproche !== null) params.append("rapproche", filtreRapproche.toString());
      if (filtreType) params.append("type", filtreType);
      if (filtreDateFrom) params.append("dateFrom", filtreDateFrom);
      if (filtreDateTo) params.append("dateTo", filtreDateTo);
      if (filtreSearch) params.append("search", filtreSearch);

      const res = await fetch(
        `${API_URL}/societes/${societeId}/banque/comptes/${compteSelectionne}/transactions?${params.toString()}`
      );
      if (!res.ok) throw new Error("Erreur lors du chargement des transactions");
      const data = await res.json();
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des transactions");
    } finally {
      setLoading(false);
    }
  }

  async function chargerIndicateurs() {
    if (!compteSelectionne) return;

    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/banque/comptes/${compteSelectionne}/indicateurs`
      );
      if (res.ok) {
        const data = await res.json();
        setIndicateurs(data);
      }
    } catch (err: any) {
      console.error("Erreur lors du chargement des indicateurs:", err);
    }
  }

  async function appliquerLettrageAutomatique() {
    if (!compteSelectionne) return;

    try {
      setLettrageEnCours(true);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/banque/comptes/${compteSelectionne}/lettrage-automatique`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Erreur lors du lettrage automatique");
      const result = await res.json();
      alert(`Lettrage automatique terminé: ${result.rapproches} transaction(s) rapprochée(s)`);
      chargerTransactions();
      chargerIndicateurs();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setLettrageEnCours(false);
    }
  }

  async function detecterEcarts() {
    if (!compteSelectionne) return;

    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/banque/comptes/${compteSelectionne}/detecter-ecarts`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Erreur lors de la détection des écarts");
      const result = await res.json();
      alert(`${result.length} écart(s) détecté(s)`);
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  }

  if (loading && !transactions.length) {
    return (
      <div className="p-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  const compte = comptes.find((c) => c.id === compteSelectionne);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion bancaire</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/expert/societes/${societeId}/comptes-bancaires`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Configurer les comptes
          </button>
          <button
            onClick={() => router.push(`/expert/societes/${societeId}/banque/import`)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Importer un relevé
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Compte bancaire</label>
        <select
          value={compteSelectionne || ""}
          onChange={(e) => setCompteSelectionne(e.target.value)}
          className="w-full max-w-md px-3 py-2 border rounded"
        >
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom} {c.banque ? `(${c.banque})` : ""}
            </option>
          ))}
        </select>
      </div>

      {indicateurs && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">Solde bancaire</div>
            <div className="text-2xl font-bold">
              {indicateurs.soldeBancaire.toLocaleString("fr-FR")} {compte?.devise || "FCFA"}
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">Solde comptable</div>
            <div className="text-2xl font-bold">
              {indicateurs.soldeComptable.toLocaleString("fr-FR")} {compte?.devise || "FCFA"}
            </div>
          </div>
          <div className={`bg-white p-4 rounded shadow ${Math.abs(indicateurs.ecart) > 1 ? "border-2 border-red-500" : ""}`}>
            <div className="text-sm text-gray-600">Écart</div>
            <div className={`text-2xl font-bold ${indicateurs.ecart !== 0 ? "text-red-600" : ""}`}>
              {indicateurs.ecart.toLocaleString("fr-FR")} {compte?.devise || "FCFA"}
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">Non rapprochées</div>
            <div className="text-2xl font-bold text-orange-600">
              {indicateurs.transactionsNonRapprochees}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          onClick={appliquerLettrageAutomatique}
          disabled={lettrageEnCours}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {lettrageEnCours ? "Lettrage en cours..." : "Lettrage automatique"}
        </button>
        <button
          onClick={detecterEcarts}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Détecter les écarts
        </button>
        <button
          onClick={() => router.push(`/expert/societes/${societeId}/banque/rapprochement?compte=${compteSelectionne}`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Rapprochement manuel
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Recherche</label>
            <input
              type="text"
              value={filtreSearch}
              onChange={(e) => setFiltreSearch(e.target.value)}
              placeholder="Libellé..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rapproché</label>
            <select
              value={filtreRapproche === null ? "" : filtreRapproche.toString()}
              onChange={(e) =>
                setFiltreRapproche(
                  e.target.value === "" ? null : e.target.value === "true"
                )
              }
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Tous</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Tous</option>
              <option value="CREDIT">Crédit</option>
              <option value="DEBIT">Débit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date début</label>
            <input
              type="date"
              value={filtreDateFrom}
              onChange={(e) => setFiltreDateFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date fin</label>
            <input
              type="date"
              value={filtreDateTo}
              onChange={(e) => setFiltreDateTo(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Libellé</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Montant</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Référence</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Rapproché</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Aucune transaction trouvée
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={transaction.rapproche ? "bg-green-50" : ""}
                >
                  <td className="px-4 py-3 text-sm">
                    {new Date(transaction.date).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-sm">{transaction.libelle}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        transaction.type === "CREDIT"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {transaction.type === "CREDIT" ? "+" : "-"}
                    {transaction.montant.toLocaleString("fr-FR")} {compte?.devise || "FCFA"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {transaction.reference || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {transaction.rapproche ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-orange-600">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        router.push(
                          `/expert/societes/${societeId}/banque/rapprochement?transaction=${transaction.id}`
                        )
                      }
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Rapprocher
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
