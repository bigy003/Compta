"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TEAL = "#14b8a6";

interface LigneAmortissement {
  annee: number;
  montant: number;
  cumul: number;
  valeurNette: number;
}

interface ImmobilisationDetail {
  id: string;
  designation: string;
  categorie: string;
  dateAcquisition: string;
  valeurOrigine: number;
  dureeAnnees: number;
  methode: string;
  commentaire: string | null;
  planAmortissement: LigneAmortissement[];
}

const CATEGORIES: Record<string, string> = {
  VEHICULE: "Véhicule",
  MATERIEL_INFORMATIQUE: "Matériel informatique",
  MOBILIER: "Mobilier",
  BATIMENT: "Bâtiment",
  AUTRE: "Autre",
};

function formatFCFA(n: number): string {
  return `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA`;
}

export default function ExpertImmobilisationDetailPage() {
  const params = useParams<{ id: string; immoId: string }>();
  const router = useRouter();
  const societeId = params.id;
  const immoId = params.immoId;

  const [data, setData] = useState<ImmobilisationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function initData() {
    if (!societeId || !immoId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/societes/${societeId}/immobilisations/${immoId}`);
      if (!res.ok) throw new Error("Immobilisation introuvable");
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/");
      return;
    }
    initData();
  }, [societeId, immoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500 shadow-md">Chargement...</div>
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error ?? "Immobilisation introuvable"}</div>
          <button type="button" onClick={() => router.push(`/expert/societes/${societeId}/immobilisations`)} className="mt-4 text-sm font-medium text-zinc-600 hover:text-zinc-900">← Retour</button>
        </div>
      </div>
    );
  }

  const backUrl = `/expert/societes/${societeId}/immobilisations`;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <button type="button" onClick={() => router.push(backUrl)} className="mb-2 text-sm font-medium text-zinc-600 hover:text-zinc-900">← Retour Immobilisations</button>
          <h1 className="text-xl font-bold text-zinc-900">{data.designation}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {CATEGORIES[data.categorie] ?? data.categorie} · Acquis le {new Date(data.dateAcquisition).toLocaleDateString("fr-FR")} · Durée {data.dureeAnnees} an(s) · Méthode {data.methode}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-700">Valeur d&apos;origine : {formatFCFA(data.valeurOrigine)}</p>
          {data.commentaire && <p className="mt-1 text-sm text-zinc-500">{data.commentaire}</p>}
        </header>

        <section className="rounded-xl bg-white shadow-md">
          <div className="border-b border-zinc-100 p-4">
            <h2 className="text-base font-bold text-zinc-900">Plan d&apos;amortissement (prorata temporis)</h2>
          </div>
          {data.planAmortissement.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">Aucune ligne d&apos;amortissement.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase text-zinc-600">
                    <th className="px-4 py-3">Année</th>
                    <th className="px-4 py-3">Dotation</th>
                    <th className="px-4 py-3">Cumul amortissements</th>
                    <th className="px-4 py-3">Valeur nette</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.planAmortissement.map((l) => (
                    <tr key={l.annee} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{l.annee}</td>
                      <td className="px-4 py-3 text-sm text-zinc-700">{formatFCFA(l.montant)}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">{formatFCFA(l.cumul)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">{formatFCFA(l.valeurNette)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
