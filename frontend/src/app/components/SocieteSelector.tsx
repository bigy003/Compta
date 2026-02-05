"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Societe {
  id: string;
  nom: string;
  compteContribuable?: string | null;
  rccm?: string | null;
}

interface SocieteSelectorProps {
  value: string | null;
  onChange: (id: string | null) => void;
}

export function SocieteSelector({ value, onChange }: SocieteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/societes`);
        if (!res.ok) throw new Error("Impossible de charger les sociétés");
        const data = await res.json();
        setSocietes(data);

        if (typeof window !== "undefined") {
          const stored = window.localStorage.getItem("selected_societe_id");
          const existingFromStored = data.find((s: Societe) => s.id === stored);
          if (!value) {
            if (existingFromStored) {
              onChange(existingFromStored.id);
            } else if (data.length > 0) {
              onChange(data[0].id);
              window.localStorage.setItem("selected_societe_id", data[0].id);
            }
          }
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSociete = societes.find((s) => s.id === value) || null;

  const filteredSocietes = societes.filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      s.nom.toLowerCase().includes(term) ||
      (s.compteContribuable || "").toLowerCase().includes(term) ||
      (s.rccm || "").toLowerCase().includes(term)
    );
  });

  function handleSelect(s: Societe) {
    onChange(s.id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("selected_societe_id", s.id);
    }
    setIsOpen(false);
  }

  const label = selectedSociete ? selectedSociete.nom : "Choisir une société";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-xs sm:text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
      >
        <span className="truncate max-w-[160px] sm:max-w-xs">{label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-500"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">
                  Sélectionnez une société
                </h2>
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

              <div className="border-b border-zinc-200 px-5 py-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Entrez le nom d'une société"
                  className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
                {loading ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    Chargement des sociétés...
                  </p>
                ) : error ? (
                  <p className="py-4 text-center text-sm text-red-600">
                    {error}
                  </p>
                ) : filteredSocietes.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    Aucune société trouvée.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {filteredSocietes.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(s)}
                          className="flex w-full flex-col rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm hover:bg-zinc-100"
                        >
                          <span className="font-medium text-zinc-900">
                            {s.nom}
                          </span>
                          {(s.compteContribuable || s.rccm) && (
                            <span className="text-xs text-zinc-500">
                              {s.compteContribuable
                                ? `Compte contribuable: ${s.compteContribuable}`
                                : `RCCM: ${s.rccm}`}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

