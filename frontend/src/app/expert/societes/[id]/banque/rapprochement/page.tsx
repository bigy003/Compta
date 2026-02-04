"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface TransactionBancaire {
  id: string;
  date: string;
  montant: number;
  libelle: string;
  type: "DEBIT" | "CREDIT";
  reference?: string | null;
  rapproche: boolean;
}

interface EcriturePotentielle {
  ecriture: {
    id: string;
    date: string;
    montant: number;
    libelle: string;
    compteDebit?: { code: string; libelle: string };
    compteCredit?: { code: string; libelle: string };
  };
  score: number;
}

interface CompteBancaire {
  id: string;
  nom: string;
  banque?: string | null;
  devise: string;
  actif: boolean;
}

interface Rapprochement {
  id: string;
  transactionBancaireId: string;
  ecritureComptableId?: string | null;
  montant: number;
  statut: string;
  scoreConfiance?: number;
  dateRapprochement: string;
  transactionBancaire?: { libelle: string; date: string; montant: number };
}

function RapprochementContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const societeId = params.id as string;
  const compteFromUrl = searchParams.get("compte") ?? "";
  const transactionFromUrl = searchParams.get("transaction") ?? "";

  const [comptes, setComptes] = useState<CompteBancaire[]>([]);
  const [compteId, setCompteId] = useState(compteFromUrl || "");
  const [transactions, setTransactions] = useState<TransactionBancaire[]>([]);
  const [rapprochements, setRapprochements] = useState<Rapprochement[]>([]);
  const [transactionSelectionnee, setTransactionSelectionnee] = useState<string | null>(transactionFromUrl || null);
  const [ecrituresPotentielles, setEcrituresPotentielles] = useState<EcriturePotentielle[]>([]);
  const [loadingEcritures, setLoadingEcritures] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);

  useEffect(() => {
    if (societeId) loadComptes();
  }, [societeId]);

  useEffect(() => {
    if (compteFromUrl && comptes.length > 0 && !compteId) setCompteId(compteFromUrl);
  }, [compteFromUrl, comptes, compteId]);

  useEffect(() => {
    if (societeId && compteId) {
      chargerTransactions();
      chargerRapprochements();
    }
  }, [societeId, compteId]);

  useEffect(() => {
    if (transactionSelectionnee && societeId) {
      chargerEcrituresPotentielles();
    } else {
      setEcrituresPotentielles([]);
    }
  }, [transactionSelectionnee, societeId]);

  async function loadComptes() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/societes/${societeId}/comptes-bancaires`);
      if (!res.ok) throw new Error("Impossible de charger les comptes");
      const data = await res.json();
      const actifs = data.filter((c: CompteBancaire) => c.actif);
      setComptes(actifs);
      if (actifs.length > 0 && !compteId) setCompteId(compteFromUrl || actifs[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }

  async function chargerTransactions() {
    if (!societeId || !compteId) return;
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/banque/comptes/${compteId}/transactions?rapproche=false`
      );
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch {
      setTransactions([]);
    }
  }

  async function chargerRapprochements() {
    if (!societeId || !compteId) return;
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/banque/rapprochements-comptables?statut=PENDING&compteId=${compteId}`
      );
      if (res.ok) {
        const data = await res.json();
        setRapprochements(data);
      }
    } catch {
      setRapprochements([]);
    }
  }

  async function chargerEcrituresPotentielles() {
    if (!societeId || !transactionSelectionnee) return;
    setLoadingEcritures(true);
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/banque/transactions/${transactionSelectionnee}/ecritures-potentielles?toleranceJours=14`
      );
      if (res.ok) {
        const data = await res.json();
        setEcrituresPotentielles(data);
      } else {
        setEcrituresPotentielles([]);
      }
    } catch {
      setEcrituresPotentielles([]);
    } finally {
      setLoadingEcritures(false);
    }
  }

  async function creerRapprochement(ecritureId: string) {
    if (!societeId || !transactionSelectionnee) return;
    setActionEnCours(true);
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/banque/rapprochements-comptables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionBancaireId: transactionSelectionnee,
            ecritureComptableId: ecritureId,
            scoreConfiance: 80,
            notes: "Rapprochement manuel",
          }),
        }
      );
      if (!res.ok) throw new Error("Erreur lors du rapprochement");
      setTransactionSelectionnee(null);
      setEcrituresPotentielles([]);
      chargerTransactions();
      chargerRapprochements();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionEnCours(false);
    }
  }

  async function validerRapprochement(id: string) {
    if (!societeId) return;
    setActionEnCours(true);
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/banque/rapprochements-comptables/${id}/valider`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Erreur validation");
      chargerTransactions();
      chargerRapprochements();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionEnCours(false);
    }
  }

  async function rejeterRapprochement(id: string) {
    if (!societeId) return;
    setActionEnCours(true);
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/banque/rapprochements-comptables/${id}/rejeter`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Erreur rejet");
      chargerRapprochements();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionEnCours(false);
    }
  }

  if (loading) {
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
        <button
          onClick={() => router.push(`/expert/societes/${societeId}/banque`)}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Retour
        </button>
      </div>
    );
  }

  const compte = comptes.find((c) => c.id === compteId);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rapprochement manuel</h1>
        <button
          onClick={() => router.push(`/expert/societes/${societeId}/banque`)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Retour à la banque
        </button>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <label className="block text-sm font-medium mb-2">Compte bancaire</label>
        <select
          value={compteId}
          onChange={(e) => {
            setCompteId(e.target.value);
            setTransactionSelectionnee(null);
          }}
          className="w-full max-w-md px-3 py-2 border rounded"
        >
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom} {c.banque ? `(${c.banque})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded shadow overflow-hidden">
          <h2 className="px-4 py-3 bg-gray-50 font-medium">
            Transactions non rapprochées
          </h2>
          <div className="max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">
                Aucune transaction à rapprocher.
              </p>
            ) : (
              <ul className="divide-y">
                {transactions.map((t) => (
                  <li
                    key={t.id}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                      transactionSelectionnee === t.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() =>
                      setTransactionSelectionnee(
                        transactionSelectionnee === t.id ? null : t.id
                      )
                    }
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate">{t.libelle}</span>
                      <span>
                        {t.type === "CREDIT" ? "+" : "-"}
                        {t.montant.toLocaleString("fr-FR")} {compte?.devise ?? "FCFA"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(t.date).toLocaleDateString("fr-FR")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded shadow overflow-hidden">
          <h2 className="px-4 py-3 bg-gray-50 font-medium">
            Écritures comptables potentielles
            {transactionSelectionnee && loadingEcritures && " (chargement…)"}
          </h2>
          <div className="max-h-96 overflow-y-auto p-4">
            {!transactionSelectionnee ? (
              <p className="text-gray-500 text-sm">
                Sélectionnez une transaction à gauche.
              </p>
            ) : ecrituresPotentielles.length === 0 && !loadingEcritures ? (
              <p className="text-gray-500 text-sm">
                Aucune écriture potentielle trouvée.
              </p>
            ) : (
              <ul className="space-y-3">
                {ecrituresPotentielles.map(({ ecriture, score }) => (
                  <li
                    key={ecriture.id}
                    className="p-3 border rounded flex justify-between items-center"
                  >
                    <div className="text-sm">
                      <div className="font-medium">{ecriture.libelle}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(ecriture.date).toLocaleDateString("fr-FR")} ·{" "}
                        {ecriture.montant.toLocaleString("fr-FR")} · Score {score}
                      </div>
                    </div>
                    <button
                      onClick={() => creerRapprochement(ecriture.id)}
                      disabled={actionEnCours}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Rapprocher
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {rapprochements.length > 0 && (
        <div className="mt-6 bg-white rounded shadow overflow-hidden">
          <h2 className="px-4 py-3 bg-gray-50 font-medium">
            Rapprochements en attente
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Transaction</th>
                <th className="px-4 py-2 text-right">Montant</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rapprochements.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2">
                    {r.transactionBancaire?.libelle ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.montant.toLocaleString("fr-FR")} {compte?.devise ?? "FCFA"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => validerRapprochement(r.id)}
                      disabled={actionEnCours}
                      className="mr-2 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => rejeterRapprochement(r.id)}
                      disabled={actionEnCours}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ExpertBanqueRapprochementPage() {
  return (
    <Suspense fallback={<div className="p-6">Chargement...</div>}>
      <RapprochementContent />
    </Suspense>
  );
}
