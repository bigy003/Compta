"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface DeclarationFiscale {
  id: string;
  type: string;
  periode: string;
  dateDeclaration: string;
  statut: string;
  donnees: any;
  validee: boolean;
  referenceDGI?: string;
  notes?: string;
  erreurs?: Array<{ message: string; severite: string }>;
}

export default function ExpertDeclarationsFiscalesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const societeId = params.id;

  const [declarations, setDeclarations] = useState<DeclarationFiscale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showGenererModal, setShowGenererModal] = useState(false);
  const [formGenerer, setFormGenerer] = useState({
    type: "TVA" as "TVA" | "IS" | "CNPS" | "RETENUE_SOURCE",
    periode: "",
  });

  async function loadDeclarations() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/declarations-fiscales`,
      );
      if (!res.ok) throw new Error("Erreur chargement déclarations");
      const data = await res.json();
      setDeclarations(data);
    } catch (err: any) {
      setError(err.message || "Erreur chargement déclarations");
    } finally {
      setLoading(false);
    }
  }

  async function genererDeclaration() {
    if (!formGenerer.periode) {
      setNotification({
        type: "error",
        message: "Veuillez remplir tous les champs",
      });
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/declarations-fiscales/generer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: formGenerer.type,
            periode: formGenerer.periode,
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erreur lors de la génération");
      }

      setNotification({
        type: "success",
        message: `Déclaration ${formGenerer.type} générée avec succès pour ${formGenerer.periode}`,
      });
      setShowGenererModal(false);
      setFormGenerer({ type: "TVA", periode: "" });
      await loadDeclarations();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Erreur lors de la génération",
      });
    }
  }

  async function updateStatut(id: string, nouveauStatut: string, referenceDGI?: string) {
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/declarations-fiscales/${id}/statut`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            statut: nouveauStatut,
            referenceDGI: referenceDGI || undefined,
          }),
        },
      );
      if (!res.ok) throw new Error("Erreur mise à jour statut");
      setNotification({
        type: "success",
        message: "Statut mis à jour avec succès",
      });
      await loadDeclarations();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Erreur mise à jour statut",
      });
    }
  }

  function downloadPdf(id: string) {
    window.open(
      `${API_URL}/societes/${societeId}/declarations-fiscales/${id}/pdf`,
      "_blank",
    );
  }

  function getStatutColor(statut: string): string {
    switch (statut) {
      case "VALIDEE":
        return "bg-green-100 text-green-800 border-green-200";
      case "ENVOYEE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "REJETEE":
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
        return "📄";
    }
  }

  function formatDonnees(type: string, donnees: any): string {
    switch (type) {
      case "TVA":
        return `TVA collectée: ${Number(donnees.tvaCollectee || 0).toLocaleString("fr-FR")} FCFA | TVA déductible: ${Number(donnees.tvaDeductible || 0).toLocaleString("fr-FR")} FCFA | TVA à payer: ${Number(donnees.tvaAPayer || 0).toLocaleString("fr-FR")} FCFA`;
      case "IS":
        return `CA: ${Number(donnees.chiffreAffaires || 0).toLocaleString("fr-FR")} FCFA | Charges: ${Number(donnees.charges || 0).toLocaleString("fr-FR")} FCFA | IS: ${Number(donnees.impotSurSocietes || 0).toLocaleString("fr-FR")} FCFA`;
      case "CNPS":
        return `Salariés: ${donnees.nombreSalaries || 0} | Masse salariale: ${Number(donnees.masseSalarialeBrute || 0).toLocaleString("fr-FR")} FCFA`;
      case "RETENUE_SOURCE":
        return `Montant brut: ${Number(donnees.montantBrut || 0).toLocaleString("fr-FR")} FCFA | Montant retenu: ${Number(donnees.montantRetenu || 0).toLocaleString("fr-FR")} FCFA`;
      default:
        return JSON.stringify(donnees);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/");
      return;
    }
    loadDeclarations();
  }, []);

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
          <h1 className="text-3xl font-bold text-gray-900">📊 Déclarations Fiscales</h1>
          <button
            onClick={() => setShowGenererModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Générer une déclaration
          </button>
        </div>

        {/* Liste des déclarations */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date déclaration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Données
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
              {declarations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Aucune déclaration générée. Cliquez sur "Générer une déclaration" pour commencer.
                  </td>
                </tr>
              ) : (
                declarations.map((declaration) => (
                  <tr key={declaration.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-2xl">{getTypeIcon(declaration.type)}</span>
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        {declaration.type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {declaration.periode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(declaration.dateDeclaration).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-md truncate" title={formatDonnees(declaration.type, declaration.donnees)}>
                        {formatDonnees(declaration.type, declaration.donnees)}
                      </div>
                      {declaration.erreurs && declaration.erreurs.length > 0 && (
                        <div className="mt-1 text-xs text-red-600">
                          ⚠️ {declaration.erreurs.length} erreur(s) détectée(s)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatutColor(
                          declaration.statut,
                        )}`}
                      >
                        {declaration.statut}
                      </span>
                      {declaration.referenceDGI && (
                        <div className="text-xs text-gray-500 mt-1">
                          Ref: {declaration.referenceDGI}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => downloadPdf(declaration.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        📄 PDF
                      </button>
                      {declaration.statut === "BROUILLON" && (
                        <select
                          value={declaration.statut}
                          onChange={(e) => {
                            const refDGI = e.target.value === "ENVOYEE" 
                              ? prompt("Référence DGI (optionnel):") || undefined
                              : undefined;
                            updateStatut(declaration.id, e.target.value, refDGI);
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="BROUILLON">Brouillon</option>
                          <option value="ENVOYEE">Envoyée</option>
                          <option value="VALIDEE">Validée</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Générer */}
        {showGenererModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Générer une déclaration fiscale</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de déclaration *
                  </label>
                  <select
                    value={formGenerer.type}
                    onChange={(e) =>
                      setFormGenerer({ ...formGenerer, type: e.target.value as any })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="TVA">TVA (mensuelle)</option>
                    <option value="IS">IS - Impôt sur les Sociétés (annuel)</option>
                    <option value="CNPS">CNPS (mensuel)</option>
                    <option value="RETENUE_SOURCE">Retenue à la source (mensuel)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Période *
                  </label>
                  <input
                    type="text"
                    value={formGenerer.periode}
                    onChange={(e) => setFormGenerer({ ...formGenerer, periode: e.target.value })}
                    placeholder={formGenerer.type === "IS" ? "2024" : "2024-01"}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: {formGenerer.type === "IS" ? "YYYY (ex: 2024)" : "YYYY-MM (ex: 2024-01)"}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowGenererModal(false);
                    setFormGenerer({ type: "TVA", periode: "" });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={genererDeclaration}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Générer
                </button>
              </div>
            </div>
          </div>
        )}

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
