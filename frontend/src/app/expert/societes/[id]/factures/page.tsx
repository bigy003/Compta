"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PeriodFilter } from "../../../../components/PeriodFilter";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Client {
  id: string;
  nom: string;
}

interface Devise {
  code: string;
  nom: string;
  symbole: string;
  estParDefaut: boolean;
  actif: boolean;
}

interface Facture {
  id: string;
  numero: string;
  date: string;
  statut: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  deviseId?: string | null;
  tauxChange?: number | null;
  montantDeviseEtrangere?: number | null;
  client: Client;
  id: string;
  numero: string;
  date: string;
  statut: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  client: Client;
  clientId?: string;
  lignes?: Array<{
    designation: string;
    quantite: number;
    prixUnitaire: number | string;
    tauxTVA: number | string;
  }>;
}

interface LigneForm {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA: number;
}

export default function ExpertFacturesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const societeId = params.id;

  // Devises par défaut (fallback si API ne répond pas)
  const devisesParDefaut: Devise[] = [
    { code: "XOF", nom: "Franc CFA", symbole: "FCFA", estParDefaut: true, actif: true },
    { code: "EUR", nom: "Euro", symbole: "€", estParDefaut: false, actif: true },
    { code: "USD", nom: "Dollar US", symbole: "$", estParDefaut: false, actif: true },
  ];

  const [factures, setFactures] = useState<Facture[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [devises, setDevises] = useState<Devise[]>(devisesParDefaut);
  const [deviseCode, setDeviseCode] = useState<string>("XOF");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState<string>("");
  const [ligne, setLigne] = useState<LigneForm>({
    designation: "",
    quantite: 1,
    prixUnitaire: 0,
    tauxTVA: 18,
  });

  // État pour l'édition
  const [editingFacture, setEditingFacture] = useState<Facture | null>(null);
  const [editLignes, setEditLignes] = useState<LigneForm[]>([]);
  const [editClientId, setEditClientId] = useState("");
  const [editDate, setEditDate] = useState<string>("");

  // État pour les paiements
  const [showingPaiements, setShowingPaiements] = useState<string | null>(null);
  const [historiquePaiements, setHistoriquePaiements] = useState<any>(null);
  const [nouveauPaiement, setNouveauPaiement] = useState({
    date: "",
    montant: 0,
    methode: "VIREMENT",
    reference: "",
    notes: "",
  });

  async function loadClients() {
    const res = await fetch(`${API_URL}/societes/${societeId}/clients`);
    if (!res.ok) throw new Error("Impossible de charger les clients");
    const data = await res.json();
    setClients(data);
    if (data.length > 0 && !clientId) {
      setClientId(data[0].id);
    }
  }

  async function loadFactures() {
    let url = `${API_URL}/societes/${societeId}/factures`;
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
    if (!res.ok) {
      throw new Error("Impossible de charger les factures");
    }
    const data = await res.json();
    setFactures(data);
  }

  async function loadDevises() {
    try {
      const resDevises = await fetch(`${API_URL}/devises`);
      if (resDevises.ok) {
        const devisesData = (await resDevises.json()) as Devise[];
        if (Array.isArray(devisesData) && devisesData.length > 0) {
          setDevises(devisesData);
          const def =
            devisesData.find((d) => d.estParDefaut) ?? devisesData[0];
          if (def) {
            setDeviseCode(def.code);
          }
        }
      }
    } catch (err) {
      console.debug("Erreur chargement devises:", err);
      // Utiliser les devises par défaut déjà définies
    }
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (societeId) {
          await Promise.all([loadClients(), loadFactures(), loadDevises()]);
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

  async function handleCreateFacture(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId || !clientId) return;

    try {
      setError(null);
      const isoDate =
        date && date.length > 0
          ? new Date(date).toISOString()
          : new Date().toISOString();

      const res = await fetch(
        `${API_URL}/societes/${societeId}/factures`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            date: isoDate,
            deviseCode,
            lignes: [
              {
                designation: ligne.designation,
                quantite: Number(ligne.quantite),
                prixUnitaire: Number(ligne.prixUnitaire),
                tauxTVA: Number(ligne.tauxTVA),
              },
            ],
          }),
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
      await loadFactures();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleEditFacture(factureId: string) {
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/factures/${factureId}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors du chargement");
      }
      const facture = await res.json();
      setEditingFacture(facture);
      setEditClientId(facture.clientId);
      setEditDate(facture.date.split("T")[0]);
      setEditLignes(
        facture.lignes.map((l: any) => ({
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: Number(l.prixUnitaire),
          tauxTVA: Number(l.tauxTVA),
        }))
      );
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleUpdateFacture(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId || !editingFacture || !editClientId) return;

    try {
      setError(null);
      const isoDate =
        editDate && editDate.length > 0
          ? new Date(editDate).toISOString()
          : new Date().toISOString();

      const res = await fetch(
        `${API_URL}/societes/${societeId}/factures/${editingFacture.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: editClientId,
            date: isoDate,
            lignes: editLignes.map((l) => ({
              designation: l.designation,
              quantite: Number(l.quantite),
              prixUnitaire: Number(l.prixUnitaire),
              tauxTVA: Number(l.tauxTVA),
            })),
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la modification");
      }

      setEditingFacture(null);
      setEditLignes([]);
      setEditClientId("");
      setEditDate("");

      await loadFactures();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  function handleAddEditLigne() {
    setEditLignes([
      ...editLignes,
      {
        designation: "",
        quantite: 1,
        prixUnitaire: 0,
        tauxTVA: 18,
      },
    ]);
  }

  function handleRemoveEditLigne(index: number) {
    setEditLignes(editLignes.filter((_, i) => i !== index));
  }

  function handleUpdateEditLigne(index: number, field: keyof LigneForm, value: any) {
    const newLignes = [...editLignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    setEditLignes(newLignes);
  }

  async function handleShowPaiements(factureId: string) {
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/factures/${factureId}/paiements/historique`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors du chargement");
      }
      const data = await res.json();
      setHistoriquePaiements(data);
      setShowingPaiements(factureId);
      setNouveauPaiement({
        date: new Date().toISOString().split("T")[0],
        montant: data.montantRestant > 0 ? data.montantRestant : 0,
        methode: "VIREMENT",
        reference: "",
        notes: "",
      });
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleAddPaiement(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId || !showingPaiements) return;

    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/factures/${showingPaiements}/paiements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: new Date(nouveauPaiement.date).toISOString(),
            montant: Number(nouveauPaiement.montant),
            methode: nouveauPaiement.methode,
            reference: nouveauPaiement.reference || undefined,
            notes: nouveauPaiement.notes || undefined,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de l'ajout du paiement");
      }

      await handleShowPaiements(showingPaiements);
      await loadFactures();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleDeletePaiement(paiementId: string) {
    if (!societeId || !showingPaiements) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce paiement ?")) return;

    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/factures/${showingPaiements}/paiements/${paiementId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la suppression");
      }

      await handleShowPaiements(showingPaiements);
      await loadFactures();
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
              Factures (vue expert)
            </h1>
            <p className="text-sm text-zinc-500">
              Créez et consultez les factures de cette société.
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

        {/* Résumé rapide */}
        {!loading && factures.length > 0 && (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Total factures
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {factures.length}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Total TTC: {factures.reduce((sum, f) => sum + f.totalTTC, 0).toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/expert/societes/${societeId}/clients`)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Voir clients
                </button>
                <button
                  onClick={() => router.push(`/expert/societes/${societeId}/dashboard`)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Formulaire de création */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Nouvelle facture (simple)
          </h2>
          <form
            onSubmit={handleCreateFacture}
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
                Devise
              </label>
              <select
                value={deviseCode}
                onChange={(e) => setDeviseCode(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              >
                {devises.length > 0 ? (
                  devises.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} ({d.symbole}) - {d.nom}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="XOF">XOF (FCFA) - Franc CFA</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="USD">USD ($) - Dollar US</option>
                  </>
                )}
              </select>
              <p className="text-xs text-zinc-500">
                Les montants seront convertis automatiquement en FCFA pour la comptabilité.
              </p>
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

            <div className="grid grid-cols-3 gap-2">
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
                Créer la facture
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
            Factures récentes
          </h2>
          {factures.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune facture pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
                    <th className="py-2 pr-4">Numéro</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Client</th>
                    <th className="py-2 pr-4">Statut</th>
                    <th className="py-2 pr-4 text-right">Devise</th>
                    <th className="py-2 pr-4 text-right">Total HT</th>
                    <th className="py-2 pr-4 text-right">Total TTC</th>
                    <th className="py-2 pr-4 text-right">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="py-2 pr-4 font-medium text-zinc-900">
                        {f.numero}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600">
                        {new Date(f.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600">
                        {f.client?.nom}
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={f.statut}
                          onChange={async (e) => {
                            try {
                              const res = await fetch(
                                `${API_URL}/societes/${societeId}/factures/${f.id}/statut`,
                                {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ statut: e.target.value }),
                                },
                              );
                              if (res.ok) {
                                await loadFactures();
                              }
                            } catch (err) {
                              console.error("Erreur mise à jour statut:", err);
                            }
                          }}
                          className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                            f.statut === "PAYEE"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : f.statut === "ENVOYEE"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : f.statut === "ANNULEE"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-zinc-200 bg-zinc-50 text-zinc-700"
                          }`}
                        >
                          <option value="BROUILLON">Brouillon</option>
                          <option value="ENVOYEE">Envoyée</option>
                          <option value="PAYEE">Payée</option>
                          <option value="ANNULEE">Annulée</option>
                        </select>
                      </td>
                      <td className="py-2 pr-4 text-right text-zinc-900">
                        {f.deviseId && f.deviseId !== "XOF" && f.montantDeviseEtrangere
                          ? `${Number(f.montantDeviseEtrangere).toLocaleString(
                              "fr-FR",
                              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                            )} ${f.deviseId}`
                          : f.deviseId && f.deviseId !== "XOF"
                          ? `${Number(f.totalTTC).toLocaleString(
                              "fr-FR",
                              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                            )} ${f.deviseId}`
                          : "FCFA"}
                      </td>
                      <td className="py-2 pr-4 text-right text-zinc-900">
                        {f.totalHT.toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="py-2 pr-4 text-right text-zinc-900">
                        {f.totalTTC.toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleShowPaiements(f.id)}
                            className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            💰 Paiements
                          </button>
                          {f.statut !== "PAYEE" && f.statut !== "ANNULEE" && (
                            <button
                              onClick={() => handleEditFacture(f.id)}
                              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                              Modifier
                            </button>
                          )}
                          {f.client?.email && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Envoyer la facture ${f.numero} à ${f.client.email} ?`)) return;
                                try {
                                  const res = await fetch(
                                    `${API_URL}/societes/${societeId}/factures/${f.id}/send-email`,
                                    {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({}),
                                    },
                                  );
                                  if (res.ok) {
                                    alert("Facture envoyée par email avec succès !");
                                  } else {
                                    const data = await res.json().catch(() => ({}));
                                    alert(data.message || "Erreur lors de l'envoi");
                                  }
                                } catch (err) {
                                  alert("Erreur lors de l'envoi de l'email");
                                }
                              }}
                              className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                            >
                              📧 Email
                            </button>
                          )}
                          <a
                            href={`${API_URL}/societes/${societeId}/factures/${f.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal d'édition */}
        {editingFacture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl p-6 m-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Modifier la facture {editingFacture.numero}
                </h2>
                <button
                  onClick={() => {
                    setEditingFacture(null);
                    setEditLignes([]);
                    setEditClientId("");
                    setEditDate("");
                  }}
                  className="text-zinc-500 hover:text-zinc-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateFacture} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-zinc-700">
                      Client
                    </label>
                    <select
                      value={editClientId}
                      onChange={(e) => setEditClientId(e.target.value)}
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
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-zinc-700">
                      Lignes de facture
                    </label>
                    <button
                      type="button"
                      onClick={handleAddEditLigne}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      + Ajouter une ligne
                    </button>
                  </div>

                  {editLignes.map((ligne, index) => (
                    <div
                      key={index}
                      className="grid gap-3 md:grid-cols-5 items-end p-3 border border-zinc-200 rounded-lg"
                    >
                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-xs font-medium text-zinc-700">
                          Désignation
                        </label>
                        <input
                          type="text"
                          value={ligne.designation}
                          onChange={(e) =>
                            handleUpdateEditLigne(
                              index,
                              "designation",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zinc-700">
                          Qté
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={ligne.quantite}
                          onChange={(e) =>
                            handleUpdateEditLigne(
                              index,
                              "quantite",
                              Number(e.target.value)
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zinc-700">
                          PU
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={ligne.prixUnitaire}
                          onChange={(e) =>
                            handleUpdateEditLigne(
                              index,
                              "prixUnitaire",
                              Number(e.target.value)
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zinc-700">
                          TVA %
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={0}
                            value={ligne.tauxTVA}
                            onChange={(e) =>
                              handleUpdateEditLigne(
                                index,
                                "tauxTVA",
                                Number(e.target.value)
                              )
                            }
                            className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          />
                          {editLignes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEditLigne(index)}
                              className="rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Enregistrer les modifications
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFacture(null);
                      setEditLignes([]);
                      setEditClientId("");
                      setEditDate("");
                    }}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal historique des paiements */}
        {showingPaiements && historiquePaiements && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl p-6 m-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900">
                    Historique des paiements
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Facture {historiquePaiements.facture.numero}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowingPaiements(null);
                    setHistoriquePaiements(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-700"
                >
                  ✕
                </button>
              </div>

              {/* Résumé */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-zinc-50 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Total TTC</p>
                  <p className="text-lg font-semibold text-zinc-900">
                    {Number(historiquePaiements.facture.totalTTC).toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">Total payé</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {historiquePaiements.totalPaye.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">Reste à payer</p>
                  <p className={`text-lg font-semibold ${
                    historiquePaiements.montantRestant <= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}>
                    {historiquePaiements.montantRestant.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
              </div>

              {/* Formulaire nouveau paiement */}
              {historiquePaiements.montantRestant > 0 && (
                <form onSubmit={handleAddPaiement} className="mb-6 p-4 border border-zinc-200 rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-800 mb-3">
                    Nouveau paiement
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-zinc-700">
                        Date
                      </label>
                      <input
                        type="date"
                        value={nouveauPaiement.date}
                        onChange={(e) =>
                          setNouveauPaiement({
                            ...nouveauPaiement,
                            date: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-zinc-700">
                        Montant
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={historiquePaiements.montantRestant}
                        value={nouveauPaiement.montant}
                        onChange={(e) =>
                          setNouveauPaiement({
                            ...nouveauPaiement,
                            montant: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-zinc-700">
                        Méthode
                      </label>
                      <select
                        value={nouveauPaiement.methode}
                        onChange={(e) =>
                          setNouveauPaiement({
                            ...nouveauPaiement,
                            methode: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                        required
                      >
                        <option value="ESPECES">Espèces</option>
                        <option value="VIREMENT">Virement</option>
                        <option value="CHEQUE">Chèque</option>
                        <option value="CARTE">Carte bancaire</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-zinc-700">
                        Référence (optionnel)
                      </label>
                      <input
                        type="text"
                        value={nouveauPaiement.reference}
                        onChange={(e) =>
                          setNouveauPaiement({
                            ...nouveauPaiement,
                            reference: e.target.value,
                          })
                        }
                        placeholder="N° chèque, référence virement..."
                        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="block text-xs font-medium text-zinc-700">
                        Notes (optionnel)
                      </label>
                      <input
                        type="text"
                        value={nouveauPaiement.notes}
                        onChange={(e) =>
                          setNouveauPaiement({
                            ...nouveauPaiement,
                            notes: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Enregistrer le paiement
                  </button>
                </form>
              )}

              {/* Liste des paiements */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-800 mb-3">
                  Paiements enregistrés
                </h3>
                {historiquePaiements.paiements.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    Aucun paiement enregistré
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historiquePaiements.paiements.map((p: any) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-medium text-zinc-900">
                              {new Date(p.date).toLocaleDateString("fr-FR")}
                            </p>
                            <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                              {p.methode}
                            </span>
                            {p.reference && (
                              <span className="text-xs text-zinc-500">
                                Ref: {p.reference}
                              </span>
                            )}
                          </div>
                          {p.notes && (
                            <p className="text-xs text-zinc-500 mt-1">
                              {p.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold text-emerald-600">
                            {Number(p.montant).toLocaleString("fr-FR")} FCFA
                          </p>
                          <button
                            onClick={() => handleDeletePaiement(p.id)}
                            className="text-red-600 hover:text-red-700 text-xs"
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
