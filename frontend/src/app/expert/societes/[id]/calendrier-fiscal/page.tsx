"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface EcheanceFiscale {
  id: string;
  type: string;
  libelle: string;
  dateEcheance: string;
  periode?: string;
  statut: string;
  montantEstime?: number;
  dateRealisation?: string;
  reference?: string;
  notes?: string;
  rappel7Jours: boolean;
  rappel3Jours: boolean;
  rappelJourJ: boolean;
  rappelRetard: boolean;
}

export default function ExpertCalendrierFiscalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const societeId = params.id;

  const [echeances, setEcheances] = useState<EcheanceFiscale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: "",
    statut: "",
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
  });
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function loadEcheances() {
    try {
      setLoading(true);
      setError(null);

      // Générer les échéances pour l'année en cours si nécessaire
      await fetch(`${API_URL}/societes/${societeId}/echeances-fiscales/generer/${filters.annee}`, {
        method: "POST",
      });

      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.statut) params.append("statut", filters.statut);

      const dateDebut = new Date(filters.annee, filters.mois - 1, 1);
      const dateFin = new Date(filters.annee, filters.mois, 0);
      params.append("dateDebut", dateDebut.toISOString());
      params.append("dateFin", dateFin.toISOString());

      const url = `${API_URL}/societes/${societeId}/echeances-fiscales?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur chargement échéances");
      const data = await res.json();
      setEcheances(data);
    } catch (err: any) {
      setError(err.message || "Erreur chargement échéances");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatut(id: string, nouveauStatut: string) {
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/echeances-fiscales/${id}/statut`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statut: nouveauStatut }),
        },
      );
      if (!res.ok) throw new Error("Erreur mise à jour statut");
      setNotification({
        type: "success",
        message: "Statut mis à jour avec succès",
      });
      await loadEcheances();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Erreur mise à jour statut",
      });
    }
  }

  function getStatutColor(statut: string): string {
    switch (statut) {
      case "FAITE":
        return "bg-green-100 text-green-800 border-green-200";
      case "EN_COURS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "EN_RETARD":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  }

  function getTypeIcon(type: string): string {
    switch (type) {
      case "TVA":
        return "📋";
      case "IS":
        return "💰";
      case "CNPS":
        return "👥";
      case "RETENUE_SOURCE":
        return "💸";
      default:
        return "📅";
    }
  }

  function getJoursRestants(dateEcheance: string): number {
    const echeance = new Date(dateEcheance);
    const maintenant = new Date();
    const diff = echeance.getTime() - maintenant.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/");
      return;
    }
    loadEcheances();
  }, []);

  useEffect(() => {
    loadEcheances();
  }, [filters]);

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
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">📅 Calendrier Fiscal</h1>
          <button
            onClick={() => {
              fetch(`${API_URL}/societes/${societeId}/echeances-fiscales/mettre-a-jour-montants`, {
                method: "POST",
              });
              fetch(`${API_URL}/societes/${societeId}/echeances-fiscales/mettre-a-jour-statuts`, {
                method: "POST",
              }).then(() => loadEcheances());
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Tous les types</option>
              <option value="TVA">TVA</option>
              <option value="IS">IS (Impôt sur les Sociétés)</option>
              <option value="CNPS">CNPS</option>
              <option value="RETENUE_SOURCE">Retenue à la source</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={filters.statut}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Tous les statuts</option>
              <option value="A_FAIRE">À faire</option>
              <option value="EN_COURS">En cours</option>
              <option value="FAITE">Faite</option>
              <option value="EN_RETARD">En retard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mois
            </label>
            <select
              value={filters.mois}
              onChange={(e) => setFilters({ ...filters, mois: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleDateString("fr-FR", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Année
            </label>
            <input
              type="number"
              value={filters.annee}
              onChange={(e) => setFilters({ ...filters, annee: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min="2020"
              max="2030"
            />
          </div>
        </div>

        {/* Liste des échéances */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Libellé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Jours restants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Montant estimé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {echeances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Aucune échéance trouvée pour cette période
                  </td>
                </tr>
              ) : (
                echeances.map((echeance) => {
                  const joursRestants = getJoursRestants(echeance.dateEcheance);
                  return (
                    <tr key={echeance.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-2xl">{getTypeIcon(echeance.type)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {echeance.libelle}
                        </div>
                        {echeance.periode && (
                          <div className="text-sm text-gray-500">Période: {echeance.periode}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(echeance.dateEcheance).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {joursRestants < 0 ? (
                          <span className="text-red-600 font-semibold">
                            Retard: {Math.abs(joursRestants)} jours
                          </span>
                        ) : joursRestants === 0 ? (
                          <span className="text-orange-600 font-semibold">Aujourd'hui</span>
                        ) : joursRestants <= 7 ? (
                          <span className="text-yellow-600 font-semibold">{joursRestants} jours</span>
                        ) : (
                          <span className="text-gray-600">{joursRestants} jours</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {echeance.montantEstime
                          ? `${Number(echeance.montantEstime).toLocaleString("fr-FR")} FCFA`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatutColor(
                            echeance.statut,
                          )}`}
                        >
                          {echeance.statut.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {echeance.statut === "A_FAIRE" || echeance.statut === "EN_RETARD" ? (
                          <select
                            value={echeance.statut}
                            onChange={(e) => updateStatut(echeance.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="A_FAIRE">À faire</option>
                            <option value="EN_COURS">En cours</option>
                            <option value="FAITE">Faite</option>
                          </select>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
              notification.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
}
