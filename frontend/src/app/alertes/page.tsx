"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Alerte {
  id: string;
  type: string;
  titre: string;
  message: string;
  severite: string;
  statut: string;
  dateAlerte: string;
  dateLecture?: string;
  dateResolution?: string;
  lien?: string;
  elementId?: string;
  elementType?: string;
}

export default function AlertesPage() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtreStatut, setFiltreStatut] = useState<string>("");
  const [filtreType, setFiltreType] = useState<string>("");
  const [filtreSeverite, setFiltreSeverite] = useState<string>("");

  async function initData() {
    try {
      setLoading(true);
      const resSoc = await fetch(`${API_URL}/societes`);
      if (!resSoc.ok) throw new Error("Impossible de charger les sociétés");
      const societes = await resSoc.json();
      if (!Array.isArray(societes) || societes.length === 0) {
        throw new Error("Aucune société trouvée");
      }
      const firstId = societes[0].id as string;
      setSocieteId(firstId);
      await loadAlertes(firstId);
    } catch (err: unknown) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAlertes(currentSocieteId: string) {
    if (!currentSocieteId) return;
    try {
      const params = new URLSearchParams();
      if (filtreStatut) params.append("statut", filtreStatut);
      if (filtreType) params.append("type", filtreType);
      if (filtreSeverite) params.append("severite", filtreSeverite);

      const res = await fetch(
        `${API_URL}/societes/${currentSocieteId}/alertes?${params.toString()}`,
      );
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Erreur API:", res.status, errorText);
        if (res.status === 404) {
          throw new Error("Le module d'alertes n'est pas disponible. Vérifiez que le backend est démarré.");
        }
        throw new Error(`Erreur chargement alertes: ${res.status}`);
      }
      const data = await res.json();
      setAlertes(data || []);
      setError(null);
    } catch (err: unknown) {
      console.error("Erreur chargement alertes:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      setAlertes([]); // Afficher une liste vide en cas d'erreur
    }
  }

  async function genererAlertes() {
    if (!societeId) return;
    try {
      await fetch(`${API_URL}/societes/${societeId}/alertes/generer`, {
        method: "POST",
      });
      await loadAlertes(societeId);
    } catch (err) {
      console.error("Erreur génération alertes:", err);
    }
  }

  async function marquerCommeLue(alerteId: string) {
    if (!societeId) return;
    try {
      await fetch(
        `${API_URL}/societes/${societeId}/alertes/${alerteId}/lue`,
        { method: "PATCH" },
      );
      await loadAlertes(societeId);
    } catch (err) {
      console.error("Erreur:", err);
    }
  }

  async function ignorer(alerteId: string) {
    if (!societeId) return;
    try {
      await fetch(
        `${API_URL}/societes/${societeId}/alertes/${alerteId}/ignorer`,
        { method: "PATCH" },
      );
      await loadAlertes(societeId);
    } catch (err) {
      console.error("Erreur:", err);
    }
  }

  async function resoudre(alerteId: string) {
    if (!societeId) return;
    try {
      await fetch(
        `${API_URL}/societes/${societeId}/alertes/${alerteId}/resoudre`,
        { method: "PATCH" },
      );
      await loadAlertes(societeId);
    } catch (err) {
      console.error("Erreur:", err);
    }
  }

  async function marquerToutesLues() {
    if (!societeId) return;
    try {
      await fetch(
        `${API_URL}/societes/${societeId}/alertes/marquer-toutes-lues`,
        { method: "POST" },
      );
      await loadAlertes(societeId);
    } catch (err) {
      console.error("Erreur:", err);
    }
  }

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    if (societeId) {
      loadAlertes(societeId);
    }
  }, [filtreStatut, filtreType, filtreSeverite, societeId]);

  function getSeveriteColor(severite: string): string {
    switch (severite) {
      case "HAUTE":
        return "bg-red-100 border-red-300 text-red-800";
      case "MOYENNE":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      default:
        return "bg-blue-100 border-blue-300 text-blue-800";
    }
  }

  function getStatutBadge(statut: string): string {
    switch (statut) {
      case "NON_LUE":
        return "bg-blue-500 text-white";
      case "LUE":
        return "bg-gray-400 text-white";
      case "IGNOREE":
        return "bg-gray-300 text-gray-700";
      case "RESOLUE":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  }

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ECHEANCE_FISCALE: "Échéance fiscale",
      ALERTE_TRESORERIE: "Trésorerie",
      FACTURE_IMPAYEE_CRITIQUE: "Facture impayée",
      ANOMALIE_MONTANT: "Anomalie montant",
      ANOMALIE_DATE_SUSPECTE: "Date suspecte",
      ANOMALIE_INCOHERENCE_COMPTABILITE: "Incohérence comptable",
      ANOMALIE_COMPTE_ERRONE: "Compte erroné",
      FACTURE_NON_PAYEE: "Facture non payée",
      RAPPROCHEMENT_A_VALIDER: "Rapprochement à valider",
      DOCUMENT_MANQUANT: "Document manquant",
      DOUBLON_DETECTE: "Doublon détecté",
    };
    return labels[type] || type;
  }

  const alertesNonLues = alertes.filter((a) => a.statut === "NON_LUE").length;

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alertes</h1>
          <p className="text-gray-600 mt-1">
            {alertesNonLues > 0
              ? `${alertesNonLues} alerte${alertesNonLues > 1 ? "s" : ""} non lue${alertesNonLues > 1 ? "s" : ""}`
              : "Toutes les alertes sont à jour"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={genererAlertes}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔄 Générer alertes
          </button>
          {alertesNonLues > 0 && (
            <button
              onClick={marquerToutesLues}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ✓ Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">Tous les statuts</option>
          <option value="NON_LUE">Non lues</option>
          <option value="LUE">Lues</option>
          <option value="IGNOREE">Ignorées</option>
          <option value="RESOLUE">Résolues</option>
        </select>

        <select
          value={filtreSeverite}
          onChange={(e) => setFiltreSeverite(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">Toutes les sévérités</option>
          <option value="HAUTE">Haute</option>
          <option value="MOYENNE">Moyenne</option>
          <option value="BASSE">Basse</option>
        </select>

        <select
          value={filtreType}
          onChange={(e) => setFiltreType(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">Tous les types</option>
          <option value="ECHEANCE_FISCALE">Échéances fiscales</option>
          <option value="ALERTE_TRESORERIE">Trésorerie</option>
          <option value="FACTURE_IMPAYEE_CRITIQUE">Factures impayées</option>
          <option value="ANOMALIE_MONTANT">Anomalies montant</option>
          <option value="ANOMALIE_DATE_SUSPECTE">Dates suspectes</option>
          <option value="ANOMALIE_INCOHERENCE_COMPTABILITE">
            Incohérences comptables
          </option>
          <option value="ANOMALIE_COMPTE_ERRONE">Comptes erronés</option>
        </select>
      </div>

      {/* Liste des alertes */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Erreur :</strong> {error}
          <br />
          <small>Vérifiez que le backend est démarré sur {API_URL}</small>
        </div>
      )}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          Chargement des alertes...
        </div>
      ) : alertes.length === 0 && !error ? (
        <div className="text-center py-12 text-gray-500">
          Aucune alerte trouvée. Cliquez sur "🔄 Générer alertes" pour créer des alertes.
        </div>
      ) : (
        <div className="space-y-3">
          {alertes.map((alerte) => (
            <div
              key={alerte.id}
              className={`border rounded-lg p-4 ${getSeveriteColor(alerte.severite)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getStatutBadge(alerte.statut)}`}
                    >
                      {alerte.statut === "NON_LUE" ? "Nouvelle" : alerte.statut}
                    </span>
                    <span className="text-xs font-medium opacity-75">
                      {getTypeLabel(alerte.type)}
                    </span>
                    <span className="text-xs opacity-75">
                      {alerte.severite}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{alerte.titre}</h3>
                  <p className="text-sm opacity-90 mb-2">{alerte.message}</p>
                  <div className="text-xs opacity-75">
                    {new Date(alerte.dateAlerte).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {alerte.dateLecture && (
                      <span className="ml-4">
                        Lu le{" "}
                        {new Date(alerte.dateLecture).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {alerte.lien && (
                    <button
                      onClick={() => {
                        router.push(alerte.lien!);
                        if (alerte.statut === "NON_LUE") {
                          marquerCommeLue(alerte.id);
                        }
                      }}
                      className="px-3 py-1 bg-white rounded hover:bg-gray-100 text-sm"
                      title="Voir"
                    >
                      👁️ Voir
                    </button>
                  )}
                  {alerte.statut === "NON_LUE" && (
                    <button
                      onClick={() => marquerCommeLue(alerte.id)}
                      className="px-3 py-1 bg-white rounded hover:bg-gray-100 text-sm"
                    >
                      ✓ Lu
                    </button>
                  )}
                  {alerte.statut !== "RESOLUE" && (
                    <button
                      onClick={() => resoudre(alerte.id)}
                      className="px-3 py-1 bg-white rounded hover:bg-gray-100 text-sm"
                    >
                      ✓ Résoudre
                    </button>
                  )}
                  {alerte.statut !== "IGNOREE" && (
                    <button
                      onClick={() => ignorer(alerte.id)}
                      className="px-3 py-1 bg-white rounded hover:bg-gray-100 text-sm"
                    >
                      ✕ Ignorer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
