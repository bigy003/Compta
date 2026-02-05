"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
}

interface QuickStats {
  nbClients: number;
  nbFactures: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [societeId, setSocieteId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("auth_token")) {
      router.replace("/");
      return;
    }

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);

        // 1. Récupérer les sociétés
        const resSoc = await fetch(`${API_URL}/societes`);
        if (!resSoc.ok) {
          throw new Error("Impossible de charger les sociétés");
        }
        const societes = await resSoc.json();
        if (!Array.isArray(societes) || societes.length === 0) {
          throw new Error("Aucune société trouvée pour cet utilisateur");
        }

        const currentSocieteId = societes[0].id as string;
        setSocieteId(currentSocieteId);

        // 2. Récupérer le dashboard de la première société
        const resDash = await fetch(
          `${API_URL}/societes/${currentSocieteId}/dashboard`,
        );
        if (!resDash.ok) {
          throw new Error("Impossible de charger le tableau de bord");
        }
        const dash = await resDash.json();
        setData(dash);

        // 3. Récupérer les stats rapides
        const [resClients, resFactures] = await Promise.all([
          fetch(`${API_URL}/societes/${currentSocieteId}/clients`),
          fetch(`${API_URL}/societes/${currentSocieteId}/factures`),
        ]);

        const clients = resClients.ok ? await resClients.json() : [];
        const factures = resFactures.ok ? await resFactures.json() : [];

        setQuickStats({
          nbClients: Array.isArray(clients) ? clients.length : 0,
          nbFactures: Array.isArray(factures) ? factures.length : 0,
        });
      } catch (err: any) {
        setError(err.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-zinc-500">Chargement du tableau de bord...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="mb-2 text-sm font-medium text-red-600">
          Erreur lors du chargement du tableau de bord
        </p>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-sm text-zinc-500">
          Aucune donnée disponible pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* En-tête */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Tableau de bord
          </h1>
          <p className="text-sm text-zinc-500">
            Vue d&apos;ensemble de votre activité comptable
          </p>
        </div>
        {societeId && (
          <button
            onClick={() =>
              router.push(`/expert/societes/${societeId}/dashboard`)
            }
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <span>Vue expert de la société</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </header>

      {/* Résumés principaux */}
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

      {/* Graphiques simples N / N-1 */}
      <section className="grid gap-4 md:grid-cols-3">
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

      {/* Graphiques simples */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-500 mb-2">
            Graphique recettes
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[{ name: "Recettes", value: data.totalRecettes }]}
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
                <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-500 mb-2">
            Graphique dépenses
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[{ name: "Dépenses", value: data.totalDepenses }]}
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
                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-500 mb-2">
            Graphique résultat
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[{ name: "Résultat", value: data.resultat }]}
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

      {/* Stats rapides */}
      {quickStats && (
        <section className="grid gap-3 md:grid-cols-4">
          <button
            onClick={() => router.push("/clients")}
            className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-zinc-50"
          >
            <p className="text-sm font-medium text-zinc-900">Clients</p>
            <p className="mt-1 text-xs text-zinc-500">
              {quickStats.nbClients} client
              {quickStats.nbClients > 1 ? "s" : ""} enregistré
              {quickStats.nbClients > 1 ? "s" : ""}
            </p>
          </button>
          <button
            onClick={() => router.push("/factures")}
            className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-zinc-50"
          >
            <p className="text-sm font-medium text-zinc-900">Factures</p>
            <p className="mt-1 text-xs text-zinc-500">
              {quickStats.nbFactures} facture
              {quickStats.nbFactures > 1 ? "s" : ""} créée
              {quickStats.nbFactures > 1 ? "s" : ""}
            </p>
          </button>
          <button
            onClick={() => router.push("/notes-frais")}
            className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-zinc-50"
          >
            <p className="text-sm font-medium text-zinc-900">
              Notes de frais
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Gérer vos notes de frais
            </p>
          </button>
          <button
            onClick={() => router.push("/tresorerie")}
            className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-zinc-50"
          >
            <p className="text-sm font-medium text-zinc-900">
              Trésorerie
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Gérer recettes et dépenses
            </p>
          </button>
        </section>
      )}
    </div>
  );
}

