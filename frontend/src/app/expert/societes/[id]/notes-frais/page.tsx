"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PeriodFilter } from "../../../../components/PeriodFilter";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface NoteFrais {
  id: string;
  date: string;
  montant: string | number;
  description?: string | null;
  categorie?: string | null;
  statut: string;
  justificatifUrl?: string | null;
}

interface NoteFraisForm {
  date: string;
  montant: number;
  description: string;
  categorie: string;
}

const CATEGORIES = [
  "Transport",
  "Repas",
  "Hébergement",
  "Fournitures",
  "Communication",
  "Autre",
];

export default function ExpertNotesFraisPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const societeId = params.id;

  const [notesFrais, setNotesFrais] = useState<NoteFrais[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const [form, setForm] = useState<NoteFraisForm>({
    date: "",
    montant: 0,
    description: "",
    categorie: "",
  });

  // Édition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NoteFraisForm>({
    date: "",
    montant: 0,
    description: "",
    categorie: "",
  });

  async function loadNotesFrais() {
    let url = `${API_URL}/societes/${societeId}/notes-frais`;
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
    if (!res.ok) throw new Error("Erreur chargement notes de frais");
    const data = await res.json();
    setNotesFrais(data);
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (societeId) {
          await loadNotesFrais();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;
    try {
      setError(null);
      const isoDate =
        form.date && form.date.length > 0
          ? new Date(form.date).toISOString()
          : new Date().toISOString();

      const res = await fetch(
        `${API_URL}/societes/${societeId}/notes-frais`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: isoDate,
            montant: Number(form.montant),
            description: form.description || undefined,
            categorie: form.categorie || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur création note de frais");
      }
      setForm({ date: "", montant: 0, description: "", categorie: "" });
      await loadNotesFrais();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  function startEdit(note: NoteFrais) {
    setEditingId(note.id);
    setEditForm({
      date: note.date.split('T')[0],
      montant: Number(note.montant),
      description: note.description || "",
      categorie: note.categorie || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ date: "", montant: 0, description: "", categorie: "" });
  }

  async function handleUpdate() {
    if (!societeId || !editingId) return;
    try {
      setError(null);
      const isoDate =
        editForm.date && editForm.date.length > 0
          ? new Date(editForm.date).toISOString()
          : new Date().toISOString();

      const res = await fetch(
        `${API_URL}/societes/${societeId}/notes-frais/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: isoDate,
            montant: Number(editForm.montant),
            description: editForm.description || undefined,
            categorie: editForm.categorie || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur modification");
      }
      cancelEdit();
      await loadNotesFrais();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleDelete(id: string) {
    if (!societeId) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note de frais ?")) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/notes-frais/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur suppression");
      }
      await loadNotesFrais();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleStatutChange(id: string, newStatut: string) {
    if (!societeId) return;
    try {
      const res = await fetch(
        `${API_URL}/societes/${societeId}/notes-frais/${id}/statut`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statut: newStatut }),
        },
      );
      if (res.ok) {
        await loadNotesFrais();
      }
    } catch (err) {
      console.error("Erreur mise à jour statut:", err);
    }
  }

  async function handleUploadJustificatif(noteId: string, file: File | undefined) {
    if (!societeId || !file) return;
    try {
      setError(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_URL}/societes/${societeId}/notes-frais/${noteId}/upload-justificatif`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de l'upload");
      }

      await loadNotesFrais();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "VALIDEE":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "EN_ATTENTE":
        return "border-yellow-200 bg-yellow-50 text-yellow-700";
      case "REFUSEE":
        return "border-red-200 bg-red-50 text-red-700";
      default:
        return "border-zinc-200 bg-zinc-50 text-zinc-700";
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case "BROUILLON":
        return "Brouillon";
      case "EN_ATTENTE":
        return "En attente";
      case "VALIDEE":
        return "Validée";
      case "REFUSEE":
        return "Refusée";
      default:
        return statut;
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 px-4 py-10 font-sans">
      <main className="w-full max-w-5xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Notes de frais (vue expert)
            </h1>
            <p className="text-sm text-zinc-500">
              Gérez les notes de frais de cette société et leur validation.
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

        {/* Section validation rapide pour les notes en attente */}
        {!loading && notesFrais.filter((n) => n.statut === "EN_ATTENTE").length > 0 && (
          <section className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-yellow-900">
              ⚠️ Notes en attente de validation ({notesFrais.filter((n) => n.statut === "EN_ATTENTE").length})
            </h2>
            <div className="space-y-2">
              {notesFrais
                .filter((n) => n.statut === "EN_ATTENTE")
                .slice(0, 5)
                .map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-3 bg-white rounded border border-yellow-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-zinc-900">
                          {new Date(note.date).toLocaleDateString("fr-FR")}
                        </p>
                        {note.categorie && (
                          <span className="text-xs text-zinc-500">
                            {note.categorie}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-zinc-900">
                          {Number(note.montant).toLocaleString("fr-FR")} FCFA
                        </p>
                      </div>
                      {note.description && (
                        <p className="text-xs text-zinc-500 mt-1">
                          {note.description}
                        </p>
                      )}
                      {note.justificatifUrl && (
                        <a
                          href={`${API_URL}${note.justificatifUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 hover:text-emerald-700 mt-1 inline-block"
                        >
                          📎 Voir justificatif
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatutChange(note.id, "VALIDEE")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        ✓ Valider
                      </button>
                      <button
                        onClick={() => handleStatutChange(note.id, "REFUSEE")}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        ✕ Refuser
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Résumé rapide */}
        {!loading && notesFrais.length > 0 && (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-4 gap-4 flex-1">
                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Total
                  </p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    {notesFrais.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    En attente
                  </p>
                  <p className="mt-1 text-lg font-semibold text-yellow-600">
                    {notesFrais.filter((n) => n.statut === "EN_ATTENTE").length}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Validées
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-600">
                    {notesFrais.filter((n) => n.statut === "VALIDEE").length}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Montant total
                  </p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    {notesFrais
                      .reduce((sum, n) => sum + Number(n.montant), 0)
                      .toLocaleString("fr-FR")}{" "}
                    FCFA
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
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
            Nouvelle note de frais
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Montant (FCFA) *
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.montant || ""}
                  onChange={(e) =>
                    setForm({ ...form, montant: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={form.categorie}
                  onChange={(e) =>
                    setForm({ ...form, categorie: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="">Sélectionner...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="Ex: Déjeuner client"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Ajouter la note de frais
            </button>
          </form>
        </section>

        {loading && (
          <p className="text-sm text-zinc-500">Chargement...</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Liste des notes de frais */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-800">
            Liste des notes de frais
          </h2>
          {notesFrais.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune note de frais pour le moment.
            </p>
          ) : (
            <div className="space-y-3">
              {notesFrais.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-zinc-200 p-4"
                >
                  {editingId === note.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1">
                            Date *
                          </label>
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) =>
                              setEditForm({ ...editForm, date: e.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1">
                            Montant (FCFA) *
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={editForm.montant || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                montant: Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1">
                            Catégorie
                          </label>
                          <select
                            value={editForm.categorie}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                categorie: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          >
                            <option value="">Sélectionner...</option>
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                description: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdate}
                          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium text-zinc-900">
                            {new Date(note.date).toLocaleDateString("fr-FR")}
                          </p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getStatutColor(
                              note.statut,
                            )}`}
                          >
                            {getStatutLabel(note.statut)}
                          </span>
                          {note.categorie && (
                            <span className="text-xs text-zinc-500">
                              {note.categorie}
                            </span>
                          )}
                        </div>
                        {note.description && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {note.description}
                          </p>
                        )}
                        {note.justificatifUrl && (
                          <div className="mt-2">
                            <a
                              href={`${API_URL}${note.justificatifUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                              📎 Voir justificatif
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-zinc-900">
                          {Number(note.montant).toLocaleString("fr-FR")} FCFA
                        </p>
                        <select
                          value={note.statut}
                          onChange={(e) =>
                            handleStatutChange(note.id, e.target.value)
                          }
                          className={`rounded-lg border px-2 py-1 text-xs font-medium ${getStatutColor(
                            note.statut,
                          )}`}
                        >
                          <option value="BROUILLON">Brouillon</option>
                          <option value="EN_ATTENTE">En attente</option>
                          <option value="VALIDEE">Validée</option>
                          <option value="REFUSEE">Refusée</option>
                        </select>
                        <button
                          onClick={() => startEdit(note)}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Modifier
                        </button>
                        <label className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer">
                          {note.justificatifUrl ? "📎 Remplacer" : "📎 Ajouter justificatif"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,application/pdf"
                            className="hidden"
                            onChange={(e) => handleUploadJustificatif(note.id, e.target.files?.[0])}
                          />
                        </label>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
