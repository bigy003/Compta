"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Client {
  id: string;
  nom: string;
  adresse?: string | null;
  email?: string | null;
  telephone?: string | null;
}

interface LigneFacture {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaire: number | string;
  tauxTVA: number | string;
}

interface Facture {
  id: string;
  numero: string;
  date: string;
  statut: string;
  totalHT: number | string;
  totalTVA: number | string;
  totalTTC: number | string;
  client: Client;
  lignes: LigneFacture[];
}

function formatFCFA(n: number): string {
  return `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA`;
}

export default function ExpertFactureDetailPage() {
  const params = useParams<{ id: string; factureId: string }>();
  const router = useRouter();
  const societeId = params.id;
  const factureId = params.factureId;

  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadFacture() {
    if (!societeId || !factureId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/societes/${societeId}/factures/${factureId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Facture introuvable");
        throw new Error("Erreur lors du chargement");
      }
      const data = await res.json();
      setFacture(data);
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
    loadFacture();
  }, [societeId, factureId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500 shadow-md">Chargement...</div>
        </div>
      </div>
    );
  }

  if (error || !facture) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? "Facture introuvable"}
          </div>
          <button
            type="button"
            onClick={() => router.push(`/expert/societes/${societeId}/factures`)}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Retour aux factures
          </button>
        </div>
      </div>
    );
  }

  const backUrl = `/expert/societes/${societeId}/factures`;
  const pdfUrl = `${API_URL}/societes/${societeId}/factures/${factureId}/pdf`;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push(backUrl)}
              className="mb-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              ← Retour aux factures
            </button>
            <h1 className="text-xl font-bold text-zinc-900">Facture {facture.numero}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {new Date(facture.date).toLocaleDateString("fr-FR")} · {facture.client.nom}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                facture.statut === "PAYEE"
                  ? "bg-emerald-100 text-emerald-800"
                  : facture.statut === "ENVOYEE"
                    ? "bg-blue-100 text-blue-800"
                    : facture.statut === "ANNULEE"
                      ? "bg-red-100 text-red-800"
                      : "bg-zinc-100 text-zinc-800"
              }`}
            >
              {facture.statut}
            </span>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Télécharger PDF
          </a>
        </header>

        <section className="rounded-xl bg-white shadow-md">
          <div className="border-b border-zinc-100 p-4">
            <h2 className="text-base font-bold text-zinc-900">Détail de la facture</h2>
          </div>
          <div className="p-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-zinc-500">Client</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">{facture.client.nom}</dd>
                {facture.client.adresse && <dd className="text-sm text-zinc-600">{facture.client.adresse}</dd>}
                {facture.client.email && <dd className="text-sm text-zinc-600">{facture.client.email}</dd>}
                {facture.client.telephone && <dd className="text-sm text-zinc-600">{facture.client.telephone}</dd>}
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-zinc-500">Totaux</dt>
                <dd className="mt-0.5 text-sm text-zinc-700">HT : {formatFCFA(Number(facture.totalHT))}</dd>
                <dd className="text-sm text-zinc-700">TVA : {formatFCFA(Number(facture.totalTVA))}</dd>
                <dd className="text-sm font-medium text-zinc-900">TTC : {formatFCFA(Number(facture.totalTTC))}</dd>
              </div>
            </dl>
          </div>

          {facture.lignes && facture.lignes.length > 0 && (
            <>
              <div className="border-t border-zinc-100 p-4">
                <h3 className="text-sm font-bold text-zinc-900">Lignes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase text-zinc-600">
                      <th className="px-4 py-3">Désignation</th>
                      <th className="px-4 py-3 text-right">Qté</th>
                      <th className="px-4 py-3 text-right">P.U.</th>
                      <th className="px-4 py-3 text-right">TVA %</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {facture.lignes.map((l) => {
                      const pu = Number(l.prixUnitaire);
                      const qte = Number(l.quantite);
                      const tva = Number(l.tauxTVA);
                      const mt = pu * qte * (1 + tva / 100);
                      return (
                        <tr key={l.id} className="hover:bg-zinc-50/50">
                          <td className="px-4 py-3 font-medium text-zinc-900">{l.designation}</td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-600">{qte}</td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-600">{formatFCFA(pu)}</td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-600">{tva} %</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900">{formatFCFA(mt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
