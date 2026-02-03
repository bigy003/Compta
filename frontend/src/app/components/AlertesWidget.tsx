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
  lien?: string;
}

export default function AlertesWidget() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [nombreNonLues, setNombreNonLues] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  // Récupérer le societeId automatiquement
  useEffect(() => {
    async function loadSociete() {
      try {
        const res = await fetch(`${API_URL}/societes`).catch(() => null);
        if (res && res.ok) {
          try {
            const societes = await res.json();
            if (Array.isArray(societes) && societes.length > 0) {
              setSocieteId(societes[0].id);
            }
          } catch (e) {
            console.debug("Erreur parsing sociétés:", e);
          }
        }
      } catch (err) {
        // Backend non disponible - widget ne s'affichera pas
        console.debug("Widget alertes: backend non disponible pour sociétés");
      }
    }
    loadSociete();
  }, []);

  async function loadAlertes() {
    if (!societeId) return;
    try {
      setLoading(true);
      const [resAlertes, resNombre] = await Promise.all([
        fetch(`${API_URL}/societes/${societeId}/alertes?nonLuesSeulement=true`).catch(() => null),
        fetch(`${API_URL}/societes/${societeId}/alertes/nombre-non-lues`).catch(() => null),
      ]);

      if (resAlertes && resAlertes.ok) {
        try {
          const data = await resAlertes.json();
          setAlertes(Array.isArray(data) ? data.slice(0, 5) : []); // Limiter à 5 dernières
        } catch (e) {
          console.error("Erreur parsing alertes:", e);
          setAlertes([]);
        }
      } else {
        // Backend non disponible ou endpoint inexistant - ne pas afficher d'erreur
        setAlertes([]);
      }

      if (resNombre && resNombre.ok) {
        try {
          const data = await resNombre.json();
          setNombreNonLues(data.nombre || 0);
        } catch (e) {
          console.error("Erreur parsing nombre:", e);
          setNombreNonLues(0);
        }
      } else {
        setNombreNonLues(0);
      }
    } catch (err) {
      // Erreur réseau silencieuse - le widget ne s'affichera simplement pas
      console.debug("Widget alertes: backend non disponible", err);
      setAlertes([]);
      setNombreNonLues(0);
    } finally {
      setLoading(false);
    }
  }

  async function marquerCommeLue(alerteId: string) {
    try {
      await fetch(
        `${API_URL}/societes/${societeId}/alertes/${alerteId}/lue`,
        { method: "PATCH" },
      );
      await loadAlertes();
    } catch (err) {
      console.error("Erreur marquer comme lue:", err);
    }
  }

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

  useEffect(() => {
    if (societeId) {
      loadAlertes();
      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(loadAlertes, 30000);
      return () => clearInterval(interval);
    }
  }, [societeId]);

  if (!societeId) {
    return null; // Ne rien afficher si pas de société
  }

  if (nombreNonLues === 0 && !showPanel) {
    return null; // Ne rien afficher s'il n'y a pas d'alertes
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Bouton avec badge */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative rounded-full bg-blue-600 p-4 text-white shadow-lg hover:bg-blue-700"
        title="Alertes"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {nombreNonLues > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {nombreNonLues > 9 ? "9+" : nombreNonLues}
          </span>
        )}
      </button>

      {/* Panel des alertes */}
      {showPanel && (
        <div className="absolute bottom-16 right-0 w-96 rounded-lg bg-white shadow-2xl border border-gray-200 max-h-96 overflow-hidden flex flex-col">
          <div className="bg-blue-600 px-4 py-3 text-white flex justify-between items-center">
            <h3 className="font-bold">Alertes ({nombreNonLues})</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Chargement...</div>
            ) : alertes.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Aucune alerte non lue
              </div>
            ) : (
              alertes.map((alerte) => (
                <div
                  key={alerte.id}
                  className={`border-b border-gray-100 p-3 hover:bg-gray-50 ${getSeveriteColor(alerte.severite)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">
                        {alerte.titre}
                      </div>
                      <div className="text-xs opacity-90">{alerte.message}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {new Date(alerte.dateAlerte).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {alerte.lien && (
                        <button
                          onClick={() => {
                            router.push(alerte.lien!);
                            marquerCommeLue(alerte.id);
                          }}
                          className="text-xs px-2 py-1 bg-white rounded hover:bg-gray-100"
                          title="Voir"
                        >
                          👁️
                        </button>
                      )}
                      <button
                        onClick={() => marquerCommeLue(alerte.id)}
                        className="text-xs px-2 py-1 bg-white rounded hover:bg-gray-100"
                        title="Marquer comme lue"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-gray-200 p-2 bg-gray-50">
            <button
              onClick={() => router.push("/alertes")}
              className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Voir toutes les alertes →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
