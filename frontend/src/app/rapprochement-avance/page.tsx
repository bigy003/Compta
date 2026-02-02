"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TEAL = "#14b8a6";

interface MatchingResult {
  transactionId: string;
  factureId: string;
  paiementId?: string;
  score: number;
  raison: string;
}

interface Rapprochement {
  id: string;
  factureId: string;
  transactionBancaireId: string | null;
  montant: number | string;
  dateRapprochement: string;
  statut: string;
  scoreConfiance?: number | null;
  notes?: string | null;
  facture: {
    id: string;
    numero: string;
    date: string;
    totalTTC: number | string;
    client: {
      nom: string;
    };
    paiements: Array<{
      id: string;
      montant: number | string;
      date: string;
    }>;
  };
  transactionBancaire?: {
    id: string;
    date: string;
    montant: number | string;
    libelle: string;
    compteBancaire: {
      nom: string;
    };
  } | null;
}

function formatFCFA(n: number | string): string {
  return `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`;
}

export default function RapprochementAvancePage() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const [correspondances, setCorrespondances] = useState<MatchingResult[]>([]);
  const [rapprochementsEnAttente, setRapprochementsEnAttente] = useState<
    Rapprochement[]
  >([]);
  const [rapprochementsValides, setRapprochementsValides] = useState<
    Rapprochement[]
  >([]);
  const [activeTab, setActiveTab] = useState<"auto" | "pending" | "validated">(
    "auto",
  );
  const [selectedCompte, setSelectedCompte] = useState<string>("");
  const [comptesBancaires, setComptesBancaires] = useState<
    Array<{ id: string; nom: string }>
  >([]);

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

      const resComptes = await fetch(
        `${API_URL}/societes/${firstId}/comptes-bancaires`,
      );
      if (resComptes.ok) {
        const comptes = await resComptes.json();
        setComptesBancaires(comptes);
      }

      await loadCorrespondances(firstId);
      await loadRapprochementsEnAttente(firstId);
      await loadRapprochementsValides(firstId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function loadCorrespondances(currentSocieteId: string) {
    try {
      const params = new URLSearchParams();
      if (selectedCompte) {
        params.append("compteBancaireId", selectedCompte);
      }
      const url = `${API_URL}/societes/${currentSocieteId}/rapprochement-avance/correspondances-automatiques${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur chargement correspondances");
      const data = await res.json();
      setCorrespondances(data);
    } catch (err: unknown) {
      console.error("Erreur:", err);
    }
  }

  async function loadRapprochementsEnAttente(currentSocieteId: string) {
    try {
      const res = await fetch(
        `${API_URL}/societes/${currentSocieteId}/rapprochement-avance/en-attente`,
      );
      if (!res.ok) throw new Error("Erreur chargement rapprochements");
      const data = await res.json();
      setRapprochementsEnAttente(data);
    } catch (err: unknown) {
      console.error("Erreur:", err);
    }
  }

  async function loadRapprochementsValides(currentSocieteId: string) {
    try {
      const res = await fetch(
        `${API_URL}/societes/${currentSocieteId}/rapprochement-avance?statut=VALIDATED`,
      );
      if (!res.ok) throw new Error("Erreur chargement rapprochements");
      const data = await res.json();
      setRapprochementsValides(data);
    } catch (err: unknown) {
      console.error("Erreur:", err);
    }
  }

  async function creerRapprochement(
    transactionId: string,
    factureId: string,
    paiementId?: string,
  ) {
    if (!societeId) return;

    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/rapprochement-avance/creer-rapprochement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId,
            factureId,
            paiementId,
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erreur lors de la création");
      }

      setNotification({
        type: "success",
        message: "Rapprochement créé avec succès",
      });
      await loadCorrespondances(societeId);
      await loadRapprochementsEnAttente(societeId);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Erreur lors de la création",
      });
    }
  }

  async function validerRapprochement(id: string) {
    if (!societeId) return;

    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/rapprochement-avance/${id}/valider`,
        {
          method: "POST",
        },
      );

      if (!res.ok) throw new Error("Erreur lors de la validation");

      setNotification({
        type: "success",
        message: "Rapprochement validé avec succès",
      });
      await loadRapprochementsEnAttente(societeId);
      await loadRapprochementsValides(societeId);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Erreur lors de la validation",
      });
    }
  }

  async function rejeterRapprochement(id: string) {
    if (!societeId) return;

    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/rapprochement-avance/${id}/rejeter`,
        {
          method: "POST",
        },
      );

      if (!res.ok) throw new Error("Erreur lors du rejet");

      setNotification({
        type: "success",
        message: "Rapprochement rejeté",
      });
      await loadRapprochementsEnAttente(societeId);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Erreur lors du rejet",
      });
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/");
      return;
    }
    initData();
  }, []);

  useEffect(() => {
    if (societeId) {
      loadCorrespondances(societeId);
    }
  }, [selectedCompte, societeId]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500 shadow-md">
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
              Rapprochement Avancé
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Correspondances automatiques entre transactions bancaires et factures.
            </p>
          </div>
        </header>

        {/* Filtre par compte bancaire */}
        <section className="rounded-xl bg-white p-5 shadow-md">
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Filtrer par compte bancaire
          </label>
          <select
            value={selectedCompte}
            onChange={(e) => setSelectedCompte(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6] sm:w-64"
          >
            <option value="">Tous les comptes</option>
            {comptesBancaires.map((compte) => (
              <option key={compte.id} value={compte.id}>
                {compte.nom}
              </option>
            ))}
          </select>
        </section>

        {/* Tabs */}
        <section className="rounded-xl bg-white shadow-md">
          <div className="border-b border-zinc-100">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("auto")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "auto"
                    ? "border-[#14b8a6] text-[#14b8a6]"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Correspondances automatiques ({correspondances.length})
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "pending"
                    ? "border-[#14b8a6] text-[#14b8a6]"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                En attente ({rapprochementsEnAttente.length})
              </button>
              <button
                onClick={() => setActiveTab("validated")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "validated"
                    ? "border-[#14b8a6] text-[#14b8a6]"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Validés ({rapprochementsValides.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Correspondances automatiques */}
            {activeTab === "auto" && (
              <div>
                {correspondances.length === 0 ? (
                  <div className="py-12 text-center text-sm text-zinc-500">
                    Aucune correspondance automatique trouvée
                  </div>
                ) : (
                  <div className="space-y-4">
                    {correspondances.map((match, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-zinc-200 bg-white p-4 transition hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  match.score >= 70
                                    ? "bg-green-100 text-green-800"
                                    : match.score >= 50
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                Score: {match.score}%
                              </span>
                            </div>
                            <p className="text-sm text-zinc-600">{match.raison}</p>
                            <div className="text-xs text-zinc-500">
                              Transaction: {match.transactionId.substring(0, 8)}... | Facture: {match.factureId.substring(0, 8)}...
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              creerRapprochement(
                                match.transactionId,
                                match.factureId,
                                match.paiementId,
                              )
                            }
                            className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 sm:ml-4"
                            style={{ backgroundColor: TEAL }}
                          >
                            Créer rapprochement
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: En attente */}
            {activeTab === "pending" && (
              <div>
                {rapprochementsEnAttente.length === 0 ? (
                  <div className="py-12 text-center text-sm text-zinc-500">
                    Aucun rapprochement en attente
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rapprochementsEnAttente.map((rapprochement) => (
                      <div
                        key={rapprochement.id}
                        className="rounded-lg border border-zinc-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 space-y-2">
                            <h3 className="font-semibold text-zinc-900">
                              Facture {rapprochement.facture.numero} -{" "}
                              {rapprochement.facture.client.nom}
                            </h3>
                            {rapprochement.transactionBancaire && (
                              <div className="space-y-1 text-sm text-zinc-600">
                                <p>
                                  Transaction: {rapprochement.transactionBancaire.libelle}
                                </p>
                                <p>
                                  Compte: {rapprochement.transactionBancaire.compteBancaire.nom}
                                </p>
                                <p>
                                  Montant: {formatFCFA(rapprochement.transactionBancaire.montant)}
                                </p>
                              </div>
                            )}
                            <p className="text-sm font-medium text-zinc-900">
                              Montant rapproché: {formatFCFA(rapprochement.montant)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Date: {new Date(rapprochement.dateRapprochement).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                          <div className="flex gap-2 sm:ml-4">
                            <button
                              onClick={() => validerRapprochement(rapprochement.id)}
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700"
                            >
                              Valider
                            </button>
                            <button
                              onClick={() => rejeterRapprochement(rapprochement.id)}
                              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Rejeter
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Validés */}
            {activeTab === "validated" && (
              <div>
                {rapprochementsValides.length === 0 ? (
                  <div className="py-12 text-center text-sm text-zinc-500">
                    Aucun rapprochement validé
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rapprochementsValides.map((rapprochement) => (
                      <div
                        key={rapprochement.id}
                        className="rounded-lg border border-green-200 bg-green-50 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-zinc-900">
                                Facture {rapprochement.facture.numero} -{" "}
                                {rapprochement.facture.client.nom}
                              </h3>
                              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                                Validé
                              </span>
                            </div>
                            {rapprochement.transactionBancaire && (
                              <div className="space-y-1 text-sm text-zinc-600">
                                <p>
                                  Transaction: {rapprochement.transactionBancaire.libelle}
                                </p>
                                <p>
                                  Montant: {formatFCFA(rapprochement.transactionBancaire.montant)}
                                </p>
                              </div>
                            )}
                            <p className="text-sm font-medium text-zinc-900">
                              Montant rapproché: {formatFCFA(rapprochement.montant)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Validé le: {new Date(rapprochement.dateRapprochement).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg px-6 py-4 shadow-lg ${
              notification.type === "success"
                ? "border border-green-200 bg-green-50 text-green-800"
                : notification.type === "error"
                ? "border border-red-200 bg-red-50 text-red-800"
                : "border border-yellow-200 bg-yellow-50 text-yellow-800"
            }`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-lg font-bold"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
