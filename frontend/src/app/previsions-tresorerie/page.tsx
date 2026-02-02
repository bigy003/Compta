"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TEAL = "#14b8a6";

interface PrevisionMois {
  mois: string;
  annee: number;
  libelle: string;
  recettesPrevu: number;
  depensesPrevu: number;
  facturesAEncaisser: number;
  soldeCumule: number;
}

interface PrevisionsData {
  soldeActuel: number;
  facturesAEncaisserTotal: number;
  previsions: PrevisionMois[];
}

function formatFCFA(n: number): string {
  return `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA`;
}

export default function PrevisionsTresoreriePage() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PrevisionsData | null>(null);
  const [nbMois, setNbMois] = useState(12);

  async function initData() {
    try {
      setLoading(true);
      setError(null);
      const resSoc = await fetch(`${API_URL}/societes`);
      if (!resSoc.ok) throw new Error("Impossible de charger les sociétés");
      const societes = await resSoc.json();
      if (!Array.isArray(societes) || societes.length === 0) throw new Error("Aucune société trouvée");
      const firstId = societes[0].id as string;
      setSocieteId(firstId);
      await loadPrevisions(firstId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function loadPrevisions(id: string) {
    const res = await fetch(`${API_URL}/societes/${id}/previsions-tresorerie?nbMois=${nbMois}`);
    if (res.ok) setData(await res.json());
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
    if (societeId) loadPrevisions(societeId);
  }, [nbMois, societeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500 shadow-md">Chargement...</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">Aucune donnée de prévisions.</div>
        </div>
      </div>
    );
  }

  const chartData = data.previsions.map((p) => ({
    name: p.libelle,
    solde: p.soldeCumule,
    recettes: p.recettesPrevu,
    depenses: p.depensesPrevu,
  }));

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Prévisions de trésorerie</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Projection sur {nbMois} mois (moyennes recettes/dépenses + factures à encaisser).
            </p>
          </div>
          <select
            value={nbMois}
            onChange={(e) => setNbMois(Number(e.target.value))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
          >
            <option value={6}>6 mois</option>
            <option value={12}>12 mois</option>
            <option value={24}>24 mois</option>
          </select>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl bg-white p-5 shadow-md">
            <p className="text-xs font-medium uppercase text-zinc-500">Solde actuel</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{formatFCFA(data.soldeActuel)}</p>
          </section>
          <section className="rounded-xl bg-white p-5 shadow-md">
            <p className="text-xs font-medium uppercase text-zinc-500">Factures à encaisser (intégrées au 1er mois)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{formatFCFA(data.facturesAEncaisserTotal)}</p>
          </section>
        </div>

        <section className="rounded-xl bg-white p-5 shadow-md">
          <h2 className="mb-4 text-base font-bold text-zinc-900">Évolution du solde prévisionnel</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatFCFA(v)} labelFormatter={(l) => l} />
                <Legend />
                <Line type="monotone" dataKey="solde" name="Solde cumulé (FCFA)" stroke={TEAL} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl bg-white shadow-md">
          <div className="border-b border-zinc-100 p-4">
            <h2 className="text-base font-bold text-zinc-900">Détail par mois</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase text-zinc-600">
                  <th className="px-4 py-3">Mois</th>
                  <th className="px-4 py-3 text-right">Recettes prévues</th>
                  <th className="px-4 py-3 text-right">Dépenses prévues</th>
                  <th className="px-4 py-3 text-right">Factures à encaisser</th>
                  <th className="px-4 py-3 text-right">Solde cumulé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.previsions.map((p) => (
                  <tr key={p.mois} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{p.libelle}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">{formatFCFA(p.recettesPrevu)}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">{formatFCFA(p.depensesPrevu)}</td>
                    <td className="px-4 py-3 text-right text-sm text-emerald-600">{p.facturesAEncaisser > 0 ? formatFCFA(p.facturesAEncaisser) : "—"}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900">{formatFCFA(p.soldeCumule)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
