"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

      // Charger les comptes bancaires
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
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Erreur lors de la création",
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
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Erreur lors de la validation",
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
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Erreur lors du rejet",
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Rapprochement Avancé
        </h1>

        {/* Filtre par compte bancaire */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrer par compte bancaire
          </label>
          <select
            value={selectedCompte}
            onChange={(e) => setSelectedCompte(e.target.value)}
            className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Tous les comptes</option>
            {comptesBancaires.map((compte) => (
              <option key={compte.id} value={compte.id}>
                {compte.nom}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("auto")}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === "auto"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Correspondances automatiques ({correspondances.length})
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === "pending"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                En attente ({rapprochementsEnAttente.length})
              </button>
              <button
                onClick={() => setActiveTab("validated")}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === "validated"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
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
                  <p className="text-gray-500 text-center py-8">
                    Aucune correspondance automatique trouvée
                  </p>
                ) : (
                  <div className="space-y-4">
                    {correspondances.map((match, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded ${
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
                            <p className="text-sm text-gray-600 mb-2">
                              {match.raison}
                            </p>
                            <div className="text-xs text-gray-500">
                              Transaction ID: {match.transactionId.substring(0, 8)}
                              ... | Facture ID: {match.factureId.substring(0, 8)}
                              ...
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
                            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
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
                  <p className="text-gray-500 text-center py-8">
                    Aucun rapprochement en attente
                  </p>
                ) : (
                  <div className="space-y-4">
                    {rapprochementsEnAttente.map((rapprochement) => (
                      <div
                        key={rapprochement.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2">
                              Facture {rapprochement.facture.numero} -{" "}
                              {rapprochement.facture.client.nom}
                            </h3>
                            {rapprochement.transactionBancaire && (
                              <div className="text-sm text-gray-600 mb-2">
                                <p>
                                  Transaction:{" "}
                                  {rapprochement.transactionBancaire.libelle}
                                </p>
                                <p>
                                  Compte:{" "}
                                  {
                                    rapprochement.transactionBancaire
                                      .compteBancaire.nom
                                  }
                                </p>
                                <p>
                                  Montant:{" "}
                                  {Number(
                                    rapprochement.transactionBancaire.montant,
                                  ).toLocaleString("fr-FR")}{" "}
                                  FCFA
                                </p>
                              </div>
                            )}
                            <p className="text-sm font-medium text-gray-900">
                              Montant rapproché:{" "}
                              {Number(rapprochement.montant).toLocaleString(
                                "fr-FR",
                              )}{" "}
                              FCFA
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Date:{" "}
                              {new Date(
                                rapprochement.dateRapprochement,
                              ).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() =>
                                validerRapprochement(rapprochement.id)
                              }
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                            >
                              Valider
                            </button>
                            <button
                              onClick={() =>
                                rejeterRapprochement(rapprochement.id)
                              }
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
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
                  <p className="text-gray-500 text-center py-8">
                    Aucun rapprochement validé
                  </p>
                ) : (
                  <div className="space-y-4">
                    {rapprochementsValides.map((rapprochement) => (
                      <div
                        key={rapprochement.id}
                        className="border border-green-200 bg-green-50 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2">
                              Facture {rapprochement.facture.numero} -{" "}
                              {rapprochement.facture.client.nom}
                            </h3>
                            {rapprochement.transactionBancaire && (
                              <div className="text-sm text-gray-600 mb-2">
                                <p>
                                  Transaction:{" "}
                                  {rapprochement.transactionBancaire.libelle}
                                </p>
                                <p>
                                  Montant:{" "}
                                  {Number(
                                    rapprochement.transactionBancaire.montant,
                                  ).toLocaleString("fr-FR")}{" "}
                                  FCFA
                                </p>
                              </div>
                            )}
                            <p className="text-sm font-medium text-gray-900">
                              Montant rapproché:{" "}
                              {Number(rapprochement.montant).toLocaleString(
                                "fr-FR",
                              )}{" "}
                              FCFA
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Validé le:{" "}
                              {new Date(
                                rapprochement.dateRapprochement,
                              ).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            Validé
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in-right ${
              notification.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : notification.type === "error"
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-yellow-50 border border-yellow-200 text-yellow-800"
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
