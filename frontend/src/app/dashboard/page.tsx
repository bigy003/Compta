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
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { PeriodPicker } from "../components/PeriodPicker";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ORANGE = "#ea580c";
const TEAL = "#14b8a6";

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

interface FactureImpayee {
  id: string;
  numero: string;
  client: string;
  resteAPayer: number;
  joursDepuisEmission: number;
}

const MOIS_LABELS: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
  "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
  "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
};

function formatFCFA(n: number): string {
  return `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    String(now.getMonth() + 1).padStart(2, "0")
  );
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [timeUnit, setTimeUnit] = useState<"jour" | "semaine" | "mois">("mois");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [facturesImpayees, setFacturesImpayees] = useState<FactureImpayee[]>([]);

  const fromDate = `${selectedYear}-${selectedMonth}-01`;
  const lastDay = new Date(
    Number(selectedYear),
    Number(selectedMonth),
    0
  ).getDate();
  const toDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, "0")}`;

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("auth_token")) {
      router.replace("/");
      return;
    }
    async function loadSociete() {
      try {
        const res = await fetch(`${API_URL}/societes`);
        if (!res.ok) throw new Error("Impossible de charger la société");
        const societes = await res.json();
        if (Array.isArray(societes) && societes.length > 0) {
          setSocieteId(societes[0].id);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    }
    loadSociete();
  }, [router]);

  useEffect(() => {
    if (!societeId) return;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_URL}/societes/${societeId}/dashboard?from=${fromDate}&to=${toDate}`
        );
        if (!res.ok) throw new Error("Impossible de charger le tableau de bord");
        const dash = await res.json();
        setData(dash);

        const resAlertes = await fetch(
          `${API_URL}/societes/${societeId}/dashboard/alertes?joursRetard=30`
        );
        if (resAlertes.ok) {
          const alertes = await resAlertes.json();
          setFacturesImpayees(alertes);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [societeId, fromDate, toDate]);

  const timelineMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getFullYear()).slice(2)}`,
    };
  });
  const selectedIndex = timelineMonths.findIndex(
    (m) => m.key === `${selectedYear}-${selectedMonth}`
  );
  const rangeEnd = selectedIndex < 0 ? 11 : selectedIndex;

  const caN = data?.totalRecettes ?? 0;
  const caN1 = data?.totalRecettesN1 ?? 0;
  const ecartCA = caN - caN1;
  const chargesN = data?.totalDepenses ?? 0;
  const chargesN1 = data?.totalDepensesN1 ?? 0;
  const ecartCharges = chargesN - chargesN1;
  const resultatN = data?.resultat ?? 0;
  const resultatN1 = data?.resultatN1 ?? 0;
  const ecartResultat = resultatN - resultatN1;

  const pctCA = caN1 !== 0 ? Math.round(((caN - caN1) / Math.abs(caN1)) * 100) : (caN !== 0 ? 100 : 0);
  const pctResultat = resultatN1 !== 0 ? Math.round(((resultatN - resultatN1) / Math.abs(resultatN1)) * 100) : (resultatN !== 0 ? 100 : 0);
  const pctCharges = chargesN1 !== 0 ? Math.round(((chargesN - chargesN1) / Math.abs(chargesN1)) * 100) : (chargesN !== 0 ? 100 : 0);

  const barDataCA = [
    { name: "N-1", value: caN1, fill: "#94a3b8" },
    { name: "N", value: caN, fill: TEAL },
  ];
  const barDataResultat = [
    { name: "N-1", value: resultatN1, fill: resultatN1 >= 0 ? "#94a3b8" : "#f87171" },
    { name: "N", value: resultatN, fill: resultatN >= 0 ? TEAL : "#dc2626" },
  ];
  const barDataCharges = [
    { name: "N-1", value: chargesN1, fill: "#94a3b8" },
    { name: "N", value: chargesN, fill: TEAL },
  ];

  if (typeof window !== "undefined" && !localStorage.getItem("auth_token")) {
    return null;
  }

  if (!societeId && !loading && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9]">
        <p className="text-zinc-600">Aucune société trouvée.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              Tableau de bord
            </h1>
            <p className="text-sm text-zinc-500">
              Vue d&apos;ensemble financière — Côte d&apos;Ivoire (FCFA)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600">Période :</span>
              <PeriodPicker
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-zinc-300 bg-white p-1">
              {(["jour", "semaine", "mois"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setTimeUnit(unit)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                    timeUnit === unit ? "text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                  style={
                    timeUnit === unit
                      ? { backgroundColor: ORANGE }
                      : {}
                  }
                >
                  {unit === "jour" ? "Jour" : unit === "semaine" ? "Semaine" : "Mois"}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="relative flex h-3 w-full items-center rounded-full bg-zinc-200">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all"
              style={{
                width: `${((rangeEnd + 1) / timelineMonths.length) * 100}%`,
                backgroundColor: ORANGE,
              }}
            />
            {timelineMonths.map((m, i) => (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setSelectedYear(m.key.slice(0, 4));
                  setSelectedMonth(m.key.slice(5, 7));
                }}
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition hover:scale-110"
                style={{
                  left: `${((i + 0.5) / timelineMonths.length) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  backgroundColor: i <= rangeEnd ? ORANGE : "#94a3b8",
                }}
                title={m.label}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>{timelineMonths[0]?.label}</span>
            <span>{timelineMonths[timelineMonths.length - 1]?.label}</span>
          </div>
        </div>

        {loading && <p className="text-sm text-zinc-500">Chargement...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {data && !loading && (
          <>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
            {/* Carte 1 : Trésorerie */}
            <div className="flex min-h-[300px] flex-col rounded-xl bg-white p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900">Trésorerie</h2>
                <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" /></svg>
                </button>
              </div>
              <div className="flex flex-1 min-h-0 gap-4">
                <div className="flex-1 min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[{ name: "N", value: Math.max(0, Math.abs(data.soldeTresorerie ?? 0)) }]}
                      margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                      <Tooltip formatter={(value: number) => [formatFCFA(data.soldeTresorerie ?? 0), ""]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={(data.soldeTresorerie ?? 0) >= 0 ? TEAL : "#ef4444"} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-36 shrink-0 flex-col justify-center space-y-1 text-sm">
                  <div><span className="font-bold text-zinc-900">N</span><br /><span className="font-bold">{formatFCFA(data.soldeTresorerie ?? 0)}</span></div>
                  <div className="text-zinc-500">N-1 —</div>
                  <div className="border-t border-zinc-200 pt-1 text-zinc-500">Écart —</div>
                </div>
              </div>
            </div>

            {/* Carte 2 : Chiffre d'affaires */}
            <div className="flex min-h-[300px] flex-col rounded-xl bg-white p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900">Chiffre d&apos;affaires</h2>
                <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" /></svg>
                </button>
              </div>
              <div className="flex flex-1 min-h-0 gap-4">
                <div className="flex-1 min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barDataCA} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                      <Tooltip formatter={(value: number) => [formatFCFA(value), ""]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>{barDataCA.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-36 shrink-0 flex-col justify-center space-y-1 text-sm">
                  <div><span className="font-bold text-zinc-900">N</span><br /><span className="font-bold">{caN === 0 ? "—" : formatFCFA(caN)}</span></div>
                  <div className="text-zinc-500">N-1 {caN1 === 0 ? "—" : formatFCFA(caN1)}</div>
                  <div className="border-t border-zinc-200 pt-1">Écart <span className={ecartCA >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>{formatFCFA(ecartCA)}</span></div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full ${pctCA >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                      {pctCA >= 0 ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 15l6-6 6 6" /></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 9l-6 6-6-6" /></svg>}
                    </span>
                    <span className={`font-bold ${pctCA >= 0 ? "text-emerald-600" : "text-red-600"}`}>{pctCA >= 0 ? "+" : ""}{pctCA}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte 3 : Résultat */}
            <div className="flex min-h-[300px] flex-col rounded-xl bg-white p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900">Résultat</h2>
                <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" /></svg>
                </button>
              </div>
              <div className="flex flex-1 min-h-0 gap-4">
                <div className="flex-1 min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barDataResultat} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                      <Tooltip formatter={(value: number) => [formatFCFA(value), ""]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>{barDataResultat.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-36 shrink-0 flex-col justify-center space-y-1 text-sm">
                  <div><span className="font-bold text-zinc-900">N</span><br /><span className={`font-bold ${resultatN >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatFCFA(resultatN)}</span></div>
                  <div className="text-zinc-500">N-1 {resultatN1 === 0 ? "—" : formatFCFA(resultatN1)}</div>
                  <div className="border-t border-zinc-200 pt-1">Écart <span className={ecartResultat >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>{formatFCFA(ecartResultat)}</span></div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full ${pctResultat >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                      {pctResultat >= 0 ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 15l6-6 6 6" /></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 9l-6 6-6-6" /></svg>}
                    </span>
                    <span className={`font-bold ${pctResultat >= 0 ? "text-emerald-600" : "text-red-600"}`}>{pctResultat >= 0 ? "+" : ""}{pctResultat}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte 4 : Charges */}
            <div className="flex min-h-[300px] flex-col rounded-xl bg-white p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900">Charges</h2>
                <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" /></svg>
                </button>
              </div>
              <div className="flex flex-1 min-h-0 gap-4">
                <div className="flex-1 min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barDataCharges} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                      <Tooltip formatter={(value: number) => [formatFCFA(value), ""]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>{barDataCharges.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-36 shrink-0 flex-col justify-center space-y-1 text-sm">
                  <div><span className="font-bold text-zinc-900">N</span><br /><span className="font-bold">{chargesN === 0 ? "—" : formatFCFA(chargesN)}</span></div>
                  <div className="text-zinc-500">N-1 {chargesN1 === 0 ? "—" : formatFCFA(chargesN1)}</div>
                  <div className="border-t border-zinc-200 pt-1">Écart <span className={ecartCharges >= 0 ? "font-medium text-red-600" : "font-medium text-emerald-600"}>{formatFCFA(ecartCharges)}</span></div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full ${pctCharges <= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </span>
                    <span className={`font-bold ${pctCharges <= 0 ? "text-emerald-600" : "text-red-600"}`}>{pctCharges >= 0 ? "+" : ""}{pctCharges}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte 5 : Total solde (carousel) */}
            <div className="flex min-h-[300px] flex-col rounded-xl bg-white p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900">{soldesCards[currentSoldeIndex]?.title}</h2>
                <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" /></svg>
                </button>
              </div>
              <div className="flex flex-1 min-h-0 gap-4">
                <div className="flex-1 min-h-[160px] flex items-center justify-center">
                  <div className="h-12 w-full max-w-[120px] overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-[#14b8a6]" style={{ width: "60%" }} />
                  </div>
                </div>
                <div className="flex w-36 shrink-0 flex-col justify-center space-y-1 text-sm">
                  <div><span className="font-bold text-zinc-900">Total</span><br /><span className="font-bold">{formatFCFA(soldesCards[currentSoldeIndex]?.value ?? 0)}</span></div>
                  <div className="text-zinc-500">Factures {formatFCFA(soldesCards[currentSoldeIndex]?.factures ?? 0)}</div>
                  <div className="mt-4 flex justify-end gap-1">
                    <button type="button" onClick={() => setCurrentSoldeIndex((p) => (p - 1 + soldesCards.length) % soldesCards.length)} className="rounded border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50" aria-label="Précédent">←</button>
                    <button type="button" onClick={() => setCurrentSoldeIndex((p) => (p + 1) % soldesCards.length)} className="rounded border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50" aria-label="Suivant">→</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte 6 : L'essentiel en quelques chiffres */}
            <div className="flex min-h-[300px] flex-col rounded-xl bg-white p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900">L&apos;essentiel en quelques chiffres</h2>
                <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" /></svg>
                </button>
              </div>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 2]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickCount={3} />
                    <Radar name="Indicateurs" dataKey="A" stroke={TEAL} fill={TEAL} fillOpacity={0.6} strokeWidth={2} />
                    <Tooltip formatter={(value: number) => [value.toFixed(2), "Ratio"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Section "Ajouter un indicateur" */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="flex min-h-[300px] flex-col rounded-xl bg-white p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900">Ajouter un indicateur</h2>
                <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" /></svg>
                </button>
              </div>
              <div className="flex flex-1 items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    alert("Fonctionnalité à venir : Ajout d'indicateur personnalisé");
                  }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg transition hover:bg-amber-500 hover:scale-110"
                  aria-label="Ajouter un indicateur"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
              </div>
            </div>
          </div>
          </>
        )}

        {facturesImpayees.length > 0 && (
          <section className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-orange-900">
                Factures impayées ({facturesImpayees.length})
              </h2>
              <button
                type="button"
                onClick={() => router.push("/factures")}
                className="text-sm font-medium text-orange-700 hover:text-orange-900"
              >
                Voir toutes →
              </button>
            </div>
            <div className="space-y-2">
              {facturesImpayees.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-orange-100 bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {f.numero} — {f.client}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {f.joursDepuisEmission} jour
                      {f.joursDepuisEmission > 1 ? "s" : ""} depuis l&apos;émission
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-orange-600">
                    {formatFCFA(f.resteAPayer)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
