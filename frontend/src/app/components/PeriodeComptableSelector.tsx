"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type PeriodeType = "EXERCICE" | "CLOTURE";

interface Exercice {
  id: string;
  annee: number;
  dateDebut: string;
  dateFin: string;
  statut: string;
  dateCloture?: string | null;
}

export interface PeriodeComptableSelection {
  type: PeriodeType;
  exerciceId: string;
  label: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

interface PeriodeComptableSelectorProps {
  societeId: string | null;
  value: PeriodeComptableSelection | null;
  onChange: (value: PeriodeComptableSelection | null) => void;
}

export function PeriodeComptableSelector({
  societeId,
  value,
  onChange,
}: PeriodeComptableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"EXERCICES" | "CLOTURES">("EXERCICES");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);

  useEffect(() => {
    if (!isOpen || !societeId) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/societes/${societeId}/exercices`);
        if (!res.ok) {
          throw new Error("Impossible de charger les exercices");
        }
        const data = await res.json();
        setExercices(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen, societeId]);

  const currentLabel = value ? value.label : "Aucun (mois civil)";

  const exercicesOuverts = exercices;
  const exercicesFermes = exercices.filter(
    (ex) => ex.statut === "FERME" || ex.dateCloture
  );

  function handleSelect(ex: Exercice, type: PeriodeType) {
    const from = ex.dateDebut.slice(0, 10);
    const to = ex.dateFin.slice(0, 10);
    const label =
      type === "EXERCICE"
        ? `Exercice ${ex.annee}`
        : `Clôture ${ex.annee}`;

    onChange({
      type,
      exerciceId: ex.id,
      label,
      from,
      to,
    });
    setIsOpen(false);
  }

  function handleReset() {
    onChange(null);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!societeId}
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="font-medium">Période comptable</span>
        <span className="truncate text-[11px] sm:text-xs text-zinc-500 max-w-[140px] sm:max-w-xs">
          {currentLabel}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="max-h-[80vh] w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">
                    Sélectionnez une période comptable
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                    Choisissez un exercice ouvert ou une clôture pour filtrer les données.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200"
                  aria-label="Fermer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="flex border-b border-zinc-200 px-5 pt-3">
                <button
                  type="button"
                  onClick={() => setTab("EXERCICES")}
                  className={`flex-1 border-b-2 pb-2 text-center text-xs font-medium sm:text-sm ${
                    tab === "EXERCICES"
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Exercices
                </button>
                <button
                  type="button"
                  onClick={() => setTab("CLOTURES")}
                  className={`flex-1 border-b-2 pb-2 text-center text-xs font-medium sm:text-sm ${
                    tab === "CLOTURES"
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Clôtures
                </button>
              </div>

              <div className="max-h-[55vh] overflow-y-auto px-5 py-3">
                {loading ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    Chargement des exercices...
                  </p>
                ) : error ? (
                  <p className="py-4 text-center text-sm text-red-600">
                    {error}
                  </p>
                ) : exercices.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    Aucun exercice comptable trouvé pour cette société.
                  </p>
                ) : tab === "EXERCICES" ? (
                  <ul className="space-y-2">
                    {exercicesOuverts.map((ex) => (
                      <li key={ex.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(ex, "EXERCICE")}
                          className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm hover:bg-zinc-100"
                        >
                          <div>
                            <p className="font-medium text-zinc-900">
                              Exercice {ex.annee}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Du{" "}
                              {new Date(ex.dateDebut).toLocaleDateString("fr-FR")}{" "}
                              au{" "}
                              {new Date(ex.dateFin).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-zinc-400"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : exercicesFermes.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    Aucune clôture trouvée pour cette société.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {exercicesFermes.map((ex) => (
                      <li key={ex.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(ex, "CLOTURE")}
                          className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm hover:bg-zinc-100"
                        >
                          <div>
                            <p className="font-medium text-zinc-900">
                              Clôture {ex.annee}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Du{" "}
                              {new Date(ex.dateDebut).toLocaleDateString("fr-FR")}{" "}
                              au{" "}
                              {new Date(ex.dateFin).toLocaleDateString("fr-FR")}
                            </p>
                            {ex.dateCloture && (
                              <p className="text-xs text-zinc-400">
                                Clôturé le{" "}
                                {new Date(ex.dateCloture).toLocaleDateString(
                                  "fr-FR"
                                )}
                              </p>
                            )}
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-zinc-400"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
                >
                  Réinitialiser (mois civil)
                </button>
                {value && (
                  <p className="truncate text-xs text-zinc-500">
                    Période sélectionnée : {value.label}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

