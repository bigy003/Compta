"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Societe {
  id: string;
  nom: string;
  rccm?: string | null;
  compteContribuable?: string | null;
}

export default function ExpertSocietesPage() {
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/experts/societes`);
        if (!res.ok) {
          throw new Error("Impossible de charger les sociétés clients");
        }
        const data = await res.json();
        setSocietes(data);
      } catch (err: any) {
        setError(err.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 px-4 py-10 font-sans">
      <main className="w-full max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Dossiers clients (Expert)
          </h1>
          <p className="text-sm text-zinc-500">
            Liste des sociétés pour lesquelles vous pouvez consulter la
            comptabilité.
          </p>
        </header>

        {loading && (
          <p className="text-sm text-zinc-500">Chargement...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <section className="rounded-xl bg-white p-4 shadow-sm">
          {societes.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune société disponible pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm">
              {societes.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {s.nom}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {s.rccm ? `RCCM: ${s.rccm} ` : ""}
                      {s.compteContribuable
                        ? `CC: ${s.compteContribuable}`
                        : ""}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      router.push(
                        `/expert/societes/${s.id}/dashboard`,
                      )
                    }
                    className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    Ouvrir le dossier
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

