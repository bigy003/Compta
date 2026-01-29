"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PeriodFilter } from "../components/PeriodFilter";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Client {
  id: string;
  nom: string;
}

interface Devis {
  id: string;
  numero: string;
  date: string;
  dateValidite?: string;
  statut: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  client: Client;
  facture?: { id: string; numero: string } | null;
}

interface LigneForm {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA: number;
}

export default function DevisPage() {
  const router = useRouter();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState<string>("");
  const [dateValidite, setDateValidite] = useState<string>("");
  const [ligne, setLigne] = useState<LigneForm>({
    designation: "",
    quantite: 1,
    prixUnitaire: 0,
    tauxTVA: 18,
  });

  async function initData() {
    try {
      setLoading(true);
      setError(null);

      const resSoc = await fetch(`${API_URL}/societes`);
      if (!resSoc.ok) throw new Error("Impossible de charger les sociétés");
      const societes = await resSoc.json();
      if (!Array.isArray(societes) || societes.length === 0) {
        throw new Error("Aucune société trouvée");
      }
      const firstId = societes[0].id as string;
      setSocieteId(firstId);

      const resClients = await fetch(
        `${API_URL}/societes/${firstId}/clients`,
      );
      if (!resClients.ok) throw new Error("Impossible de charger les clients");
      const clientsData = await resClients.json();
      setClients(clientsData);
      if (clientsData.length > 0) {
        setClientId(clientsData[0].id);
      }

      await loadDevis(firstId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function loadDevis(currentSocieteId: string) {
    let url = `${API_URL}/societes/${currentSocieteId}/devis`;
    const params = new URLSearchParams();
    
    if (selectedMonth && selectedYear) {
      const fromDate = `${selectedYear}-${selectedMonth}-01`;
      const lastDay = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
      const toDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      params.append("from", fromDate);
      params.append("to", toDate);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Impossible de charger les devis");
    const data = await res.json();
    setDevis(data);
  }

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  async function handleCreateDevis(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId || !clientId) return;

    try {
      setError(null);
      const isoDate =
        date && date.length > 0
          ? new Date(date).toISOString()
          : new Date().toISOString();

      const body: any = {
        clientId,
        date: isoDate,
        lignes: [
          {
            designation: ligne.designation,
            quantite: Number(ligne.quantite),
            prixUnitaire: Number(ligne.prixUnitaire),
            tauxTVA: Number(ligne.tauxTVA),
          },
        ],
      };

      if (dateValidite && dateValidite.length > 0) {
        body.dateValidite = new Date(dateValidite).toISOString();
      }

      const res = await fetch(
        `${API_URL}/societes/${societeId}/devis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la création");
      }

      setLigne({
        designation: "",
        quantite: 1,
        prixUnitaire: 0,
        tauxTVA: 18,
      });
      setDate("");
      setDateValidite("");

      await loadDevis(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleConvertirFacture(devisId: string) {
    if (!societeId) return;
    if (!confirm("Voulez-vous convertir ce devis en facture ?")) return;

    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/devis/${devisId}/convertir-facture`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la conversion");
      }

      await loadDevis(societeId);
      alert("Devis converti en facture avec succès !");
      router.push("/factures");
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleUpdateStatut(devisId: string, statut: string) {
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/devis/${devisId}/statut`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statut }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur mise à jour");
      }
      await loadDevis(societeId);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 px-4 py-10 font-sans">
      <main className="w-full max-w-5xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Devis
            </h1>
            <p className="text-sm text-zinc-500">
              Créez et gérez vos devis clients.
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

        {!loading && devis.length > 0 && (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Total devis
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {devis.length}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Total TTC: {devis.reduce((sum, d) => sum + d.totalTTC, 0).toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/factures")}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Voir factures
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Nouveau devis
          </h2>
          <form
            onSubmit={handleCreateDevis}
            className="grid gap-3 md:grid-cols-2"
          >
            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700">
                Client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700">
                Date de validité (optionnel)
              </label>
              <input
                type="date"
                value={dateValidite}
                onChange={(e) => setDateValidite(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700">
                Désignation
              </label>
              <input
                type="text"
                value={ligne.designation}
                onChange={(e) =>
                  setLigne({ ...ligne, designation: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2 md:col-span-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700">
                  Qté
                </label>
                <input
                  type="number"
                  min={1}
                  value={ligne.quantite}
                  onChange={(e) =>
                    setLigne({
                      ...ligne,
                      quantite: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700">
                  PU
                </label>
                <input
                  type="number"
                  min={0}
                  value={ligne.prixUnitaire}
                  onChange={(e) =>
                    setLigne({
                      ...ligne,
                      prixUnitaire: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700">
                  TVA %
                </label>
                <input
                  type="number"
                  min={0}
                  value={ligne.tauxTVA}
                  onChange={(e) =>
                    setLigne({
                      ...ligne,
                      tauxTVA: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={!societeId || clients.length === 0}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Créer le devis
              </button>
            </div>
          </form>
        </section>

        {loading && (
          <p className="text-sm text-zinc-500">Chargement...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Devis récents
          </h2>
          {devis.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucun devis pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="py-2 pr-4 text-left">Numéro</th>
                    <th className="py-2 pr-4 text-left">Client</th>
                    <th className="py-2 pr-4 text-left">Date</th>
                    <th className="py-2 pr-4 text-right">Total TTC</th>
                    <th className="py-2 pr-4 text-left">Statut</th>
                    <th className="py-2 pr-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devis.map((d) => (
                    <tr key={d.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 font-medium text-zinc-900">
                        {d.numero}
                      </td>
                      <td className="py-2 pr-4 text-zinc-700">
                        {d.client.nom}
                      </td>
                      <td className="py-2 pr-4 text-zinc-700">
                        {new Date(d.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium text-zinc-900">
                        {d.totalTTC.toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={d.statut}
                          onChange={(e) =>
                            handleUpdateStatut(d.id, e.target.value)
                          }
                          disabled={d.statut === "CONVERTI"}
                          className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                            d.statut === "ACCEPTE"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : d.statut === "ENVOYE"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : d.statut === "CONVERTI"
                              ? "border-zinc-200 bg-zinc-100 text-zinc-500"
                              : "border-zinc-200 bg-zinc-50 text-zinc-700"
                          }`}
                        >
                          <option value="BROUILLON">Brouillon</option>
                          <option value="ENVOYE">Envoyé</option>
                          <option value="ACCEPTE">Accepté</option>
                          <option value="REFUSE">Refusé</option>
                          <option value="CONVERTI">Converti</option>
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2">
                          <a
                            href={`${API_URL}/societes/${societeId}/devis/${d.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            PDF
                          </a>
                          {d.statut !== "CONVERTI" && (
                            <button
                              onClick={() => handleConvertirFacture(d.id)}
                              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                              Convertir
                            </button>
                          )}
                          {d.facture && (
                            <button
                              onClick={() => router.push("/factures")}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              Facture
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
