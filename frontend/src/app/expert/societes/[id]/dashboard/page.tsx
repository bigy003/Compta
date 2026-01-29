"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PeriodFilter } from "../../../../components/PeriodFilter";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface DashboardData {
  totalRecettes: number;
  totalDepenses: number;
  resultat: number;
}

interface GraphData {
  mois: string;
  recettes: number;
  depenses: number;
  resultat: number;
}

interface FactureImpayee {
  id: string;
  numero: string;
  date: string;
  client: string;
  totalTTC: number;
  totalPaye: number;
  resteAPayer: number;
  joursDepuisEmission: number;
}

export default function ExpertSocieteDashboardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const societeId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [graphData, setGraphData] = useState<GraphData[]>([]);
  const [facturesImpayees, setFacturesImpayees] = useState<FactureImpayee[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        
        let dashboardUrl = `${API_URL}/societes/${societeId}/dashboard`;
        const params = new URLSearchParams();
        if (selectedMonth && selectedYear) {
          const fromDate = `${selectedYear}-${selectedMonth}-01`;
          const lastDay = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
          const toDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
          params.append("from", fromDate);
          params.append("to", toDate);
        }
        if (params.toString()) {
          dashboardUrl += `?${params.toString()}`;
        }
        
        const res = await fetch(dashboardUrl);
        if (!res.ok) {
          throw new Error("Impossible de charger le tableau de bord");
        }
        const dash = await res.json();
        setData(dash);

        // Récupérer les données graphiques
        const resGraph = await fetch(
          `${API_URL}/societes/${societeId}/dashboard/graphique?months=6`,
        );
        if (resGraph.ok) {
          const graph = await resGraph.json();
          setGraphData(graph);
        }

        // Récupérer les alertes (factures impayées)
        const resAlertes = await fetch(
          `${API_URL}/societes/${societeId}/dashboard/alertes?joursRetard=30`,
        );
        if (resAlertes.ok) {
          const alertes = await resAlertes.json();
          setFacturesImpayees(alertes);
        }
      } catch (err: any) {
        setError(err.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    if (societeId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societeId, selectedMonth, selectedYear]);

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 px-4 py-10 font-sans">
      <main className="w-full max-w-4xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Tableau de bord client
            </h1>
            <p className="text-sm text-zinc-500">
              Vue synthétique de la société sélectionnée (vue expert).
            </p>
          </div>
          <PeriodFilter
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onReset={() => {
              setSelectedMonth("");
              setSelectedYear("");
            }}
          />
        </header>

        {loading && (
          <p className="text-sm text-zinc-500">Chargement...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Recettes
                </p>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">
                  {data.totalRecettes.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Dépenses
                </p>
                <p className="mt-2 text-2xl font-semibold text-red-600">
                  {data.totalDepenses.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Résultat
                </p>
                <p
                  className={`mt-2 text-2xl font-semibold ${
                    data.resultat >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  {data.resultat.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
            </section>

            {/* Graphique évolution */}
            {graphData.length > 0 && (
              <section className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-zinc-900">
                  Évolution des recettes et dépenses (6 derniers mois)
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={graphData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mois"
                      tickFormatter={(value) => {
                        const [year, month] = value.split("-");
                        const monthNames = [
                          "Jan",
                          "Fév",
                          "Mar",
                          "Avr",
                          "Mai",
                          "Jun",
                          "Jul",
                          "Aoû",
                          "Sep",
                          "Oct",
                          "Nov",
                          "Déc",
                        ];
                        return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
                      }}
                    />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) =>
                        `${value.toLocaleString("fr-FR")} FCFA`
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="recettes"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Recettes"
                    />
                    <Line
                      type="monotone"
                      dataKey="depenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Dépenses"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </section>
            )}

            {/* Graphique en barres pour le résultat */}
            {graphData.length > 0 && (
              <section className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-zinc-900">
                  Résultat mensuel (6 derniers mois)
                </h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={graphData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mois"
                      tickFormatter={(value) => {
                        const [year, month] = value.split("-");
                        const monthNames = [
                          "Jan",
                          "Fév",
                          "Mar",
                          "Avr",
                          "Mai",
                          "Jun",
                          "Jul",
                          "Aoû",
                          "Sep",
                          "Oct",
                          "Nov",
                          "Déc",
                        ];
                        return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
                      }}
                    />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) =>
                        `${value.toLocaleString("fr-FR")} FCFA`
                      }
                    />
                    <Bar dataKey="resultat" name="Résultat">
                      {graphData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.resultat >= 0 ? "#10b981" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>
            )}

            {/* Alertes factures impayées */}
            {facturesImpayees.length > 0 && (
              <section className="rounded-xl bg-red-50 border border-red-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-red-900">
                    ⚠️ Factures impayées ({facturesImpayees.length})
                  </h2>
                  <button
                    onClick={() =>
                      router.push(`/expert/societes/${societeId}/factures`)
                    }
                    className="text-xs font-medium text-red-700 hover:text-red-900"
                  >
                    Voir toutes →
                  </button>
                </div>
                <div className="space-y-2">
                  {facturesImpayees.slice(0, 5).map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-red-100"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900">
                          {f.numero} - {f.client}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {f.joursDepuisEmission} jour{f.joursDepuisEmission > 1 ? "s" : ""} depuis l'émission
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-red-600">
                        {f.resteAPayer.toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>
                  ))}
                  {facturesImpayees.length > 5 && (
                    <p className="text-xs text-red-600 text-center pt-2">
                      + {facturesImpayees.length - 5} autre{facturesImpayees.length - 5 > 1 ? "s" : ""} facture{facturesImpayees.length - 5 > 1 ? "s" : ""} impayée{facturesImpayees.length - 5 > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* KPIs détaillés */}
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Taux de marge
                </p>
                <p className="mt-2 text-xl font-semibold text-zinc-900">
                  {data.totalRecettes > 0
                    ? (
                        ((data.totalRecettes - data.totalDepenses) /
                          data.totalRecettes) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Ratio dépenses/recettes
                </p>
                <p className="mt-2 text-xl font-semibold text-zinc-900">
                  {data.totalRecettes > 0
                    ? ((data.totalDepenses / data.totalRecettes) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Moyenne recettes/jour
                </p>
                <p className="mt-2 text-xl font-semibold text-emerald-600">
                  {(() => {
                    const days = selectedMonth && selectedYear
                      ? new Date(Number(selectedYear), Number(selectedMonth), 0).getDate()
                      : 30;
                    return (data.totalRecettes / days).toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    });
                  })()}{" "}
                  FCFA
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Factures impayées
                </p>
                <p className="mt-2 text-xl font-semibold text-red-600">
                  {facturesImpayees.length}
                </p>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-5">
              <button
                onClick={() =>
                  router.push(`/expert/societes/${societeId}/clients`)
                }
                className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:bg-zinc-50"
              >
                <p className="text-sm font-medium text-zinc-900">Clients</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Voir la liste des clients
                </p>
              </button>
              <button
                onClick={() =>
                  router.push(`/expert/societes/${societeId}/factures`)
                }
                className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:bg-zinc-50"
              >
                <p className="text-sm font-medium text-zinc-900">Factures</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Consulter les factures
                </p>
              </button>
              <button
                onClick={() =>
                  router.push(`/expert/societes/${societeId}/notes-frais`)
                }
                className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:bg-zinc-50"
              >
                <p className="text-sm font-medium text-zinc-900">Notes de frais</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Gérer les notes de frais
                </p>
              </button>
              <button
                onClick={() =>
                  router.push(`/expert/societes/${societeId}/comptes-bancaires`)
                }
                className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:bg-zinc-50"
              >
                <p className="text-sm font-medium text-zinc-900">Comptes bancaires</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Gérer les comptes bancaires
                </p>
              </button>
              <button
                onClick={() =>
                  router.push(`/expert/societes/${societeId}/tresorerie`)
                }
                className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:bg-zinc-50"
              >
                <p className="text-sm font-medium text-zinc-900">Trésorerie</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Voir recettes et dépenses
                </p>
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

