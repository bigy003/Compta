"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PeriodPicker } from "../../../../components/PeriodPicker";
import {
  PeriodeComptableSelector,
  PeriodeComptableSelection,
} from "../../../../components/PeriodeComptableSelector";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface DashboardData {
  totalRecettes: number;
  totalDepenses: number;
  resultat: number;
  totalRecettesN1?: number;
  totalDepensesN1?: number;
  resultatN1?: number;
  soldeTresorerie?: number;
  totalSoldeClients?: number;
  totalSoldeFournisseurs?: number;
  totalSoldeNotesFrais?: number;
}

function formatFCFA(n: number): string {
  return `${Number(n).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} FCFA`;
}

export default function ExpertSocieteDashboardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const societeId = params.id;

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    String(now.getMonth() + 1).padStart(2, "0")
  );
  const [selectedYear, setSelectedYear] = useState(
    String(now.getFullYear())
  );

  const [periodeComptable, setPeriodeComptable] =
    useState<PeriodeComptableSelection | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  const baseFromDate = `${selectedYear}-${selectedMonth}-01`;
  const lastDay = new Date(
    Number(selectedYear),
    Number(selectedMonth),
    0
  ).getDate();
  const baseToDate = `${selectedYear}-${selectedMonth}-${String(
    lastDay
  ).padStart(2, "0")}`;

  const fromDate = periodeComptable?.from ?? baseFromDate;
  const toDate = periodeComptable?.to ?? baseToDate;

  useEffect(() => {
    if (!societeId) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_URL}/societes/${societeId}/dashboard?from=${fromDate}&to=${toDate}`
        );
        if (!res.ok) {
          throw new Error("Impossible de charger le tableau de bord");
        }
        const dash = await res.json();
        setData(dash);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Erreur inconnue"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [societeId, fromDate, toDate]);

  const soldesCards = [
    {
      title: "Trésorerie globale",
      value: data?.soldeTresorerie ?? 0,
    },
    {
      title: "Solde clients",
      value: data?.totalSoldeClients ?? 0,
    },
    {
      title: "Solde fournisseurs",
      value: data?.totalSoldeFournisseurs ?? 0,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push(`/expert/societes`)}
            className="mb-1 text-xs text-zinc-500 hover:text-zinc-800"
          >
            ← Retour aux dossiers
          </button>
          <h1 className="text-xl font-semibold text-zinc-900">
            Tableau de bord
          </h1>
          <p className="text-sm text-zinc-500">
            Vue d&apos;ensemble financière de la société — FCFA
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={(month) => {
              setSelectedMonth(month);
              setPeriodeComptable(null);
            }}
            onYearChange={(year) => {
              setSelectedYear(year);
              setPeriodeComptable(null);
            }}
          />
          <PeriodeComptableSelector
            societeId={societeId}
            value={periodeComptable}
            onChange={(val) => setPeriodeComptable(val)}
          />
        </div>
      </header>

      {loading && (
        <p className="text-sm text-zinc-500">Chargement...</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && !loading && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Trésorerie
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {formatFCFA(data.soldeTresorerie ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Chiffre d&apos;affaires
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {formatFCFA(data.totalRecettes ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Charges
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {formatFCFA(data.totalDepenses ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Résultat
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {formatFCFA(data.resultat ?? 0)}
              </p>
            </div>
          </section>

          {/* Graphiques simples N / N-1 */}
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {/* Chiffre d'affaires */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-zinc-500 mb-2">
                Chiffre d&apos;affaires
              </p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "N-1", value: data.totalRecettesN1 ?? 0 },
                      { name: "N", value: data.totalRecettes },
                    ]}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: number) =>
                        `${v.toLocaleString("fr-FR")} FCFA`
                      }
                    />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charges */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-zinc-500 mb-2">
                Charges
              </p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "N-1", value: data.totalDepensesN1 ?? 0 },
                      { name: "N", value: data.totalDepenses },
                    ]}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: number) =>
                        `${v.toLocaleString("fr-FR")} FCFA`
                      }
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Résultat */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-zinc-500 mb-2">
                Résultat
              </p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "N-1", value: data.resultatN1 ?? 0 },
                      { name: "N", value: data.resultat },
                    ]}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: number) =>
                        `${v.toLocaleString("fr-FR")} FCFA`
                      }
                    />
                    <Bar
                      dataKey="value"
                      fill={data.resultat >= 0 ? "#22c55e" : "#ef4444"}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3 mt-6">
            {soldesCards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium uppercase text-zinc-500">
                  {card.title}
                </p>
                <p className="mt-2 text-xl font-semibold text-zinc-900">
                  {formatFCFA(card.value)}
                </p>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

