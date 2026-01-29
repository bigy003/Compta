"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TEAL = "#14b8a6";

interface Client {
  id: string;
  nom: string;
  email?: string | null;
  adresse?: string | null;
  telephone?: string | null;
}

export default function ExpertClientsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const societeId = params.id;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAdresse, setEditAdresse] = useState("");
  const [editTelephone, setEditTelephone] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function loadClients() {
    if (!societeId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/societes/${societeId}/clients`);
      if (!res.ok) throw new Error("Impossible de charger les clients");
      const data = await res.json();
      setClients(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (societeId) loadClients();
  }, [societeId]);

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(`${API_URL}/societes/${societeId}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          email: email || undefined,
          adresse: adresse || undefined,
          telephone: telephone || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la création");
      }
      setNom("");
      setEmail("");
      setAdresse("");
      setTelephone("");
      setShowForm(false);
      await loadClients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  function startEdit(client: Client) {
    setEditingId(client.id);
    setEditNom(client.nom);
    setEditEmail(client.email || "");
    setEditAdresse(client.adresse || "");
    setEditTelephone(client.telephone || "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleUpdateClient(id: string) {
    if (!societeId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/clients/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom: editNom,
            email: editEmail || undefined,
            adresse: editAdresse || undefined,
            telephone: editTelephone || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la modification");
      }
      cancelEdit();
      await loadClients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  async function handleDeleteClient(id: string) {
    if (!societeId) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/clients/${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la suppression");
      }
      await loadClients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  const filteredClients = clients.filter((client) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      client.nom.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.adresse?.toLowerCase().includes(term) ||
      client.telephone?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
              Clients
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Gérez les clients de cette société.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 sm:mt-0">
            <button
              type="button"
              onClick={() =>
                router.push(`/expert/societes/${societeId}/factures`)
              }
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              Voir factures
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(`/expert/societes/${societeId}/dashboard`)
              }
              className="rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Dashboard
            </button>
          </div>
        </header>

        <section className="rounded-xl bg-white p-5 shadow-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-zinc-900">
                {clients.length}
              </span>
              <span className="text-sm text-zinc-500">
                client{clients.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              {showForm ? "Masquer le formulaire" : "Nouveau client"}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleCreateClient}
              className="border-t border-zinc-100 pt-4"
            >
              <h2 className="mb-3 text-sm font-semibold text-zinc-800">
                Ajouter un client
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Nom *
                  </label>
                  <input
                    type="text"
                    placeholder="Nom ou raison sociale"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="email@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Adresse
                  </label>
                  <input
                    type="text"
                    placeholder="Adresse postale"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    placeholder="07 00 00 00 00"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={!societeId}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: TEAL }}
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500 shadow-md">
            Chargement des clients…
          </div>
        ) : (
          <section className="rounded-xl bg-white shadow-md">
            <div className="border-b border-zinc-100 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-bold text-zinc-900">
                  Liste des clients
                </h2>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Rechercher (nom, email, tél…)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6] sm:w-64"
                  />
                </div>
              </div>
            </div>

            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                {searchTerm
                  ? `Aucun client trouvé pour « ${searchTerm} ».`
                  : "Aucun client pour le moment. Cliquez sur « Nouveau client » pour en ajouter."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase tracking-wider text-zinc-600">
                      <th className="px-4 py-3">Client</th>
                      <th className="hidden px-4 py-3 md:table-cell">Contact</th>
                      <th className="hidden px-4 py-3 lg:table-cell">Adresse</th>
                      <th className="w-28 px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        className="transition hover:bg-zinc-50/50"
                      >
                        <td className="px-4 py-3">
                          {editingId === client.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editNom}
                                onChange={(e) => setEditNom(e.target.value)}
                                className="w-full max-w-[200px] rounded border border-zinc-200 px-2 py-1 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                              />
                              <div className="flex flex-col gap-1 md:hidden">
                                <input
                                  type="email"
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  placeholder="Email"
                                  className="rounded border border-zinc-200 px-2 py-1 text-sm focus:border-[#14b8a6] focus:outline-none"
                                />
                                <input
                                  type="tel"
                                  value={editTelephone}
                                  onChange={(e) =>
                                    setEditTelephone(e.target.value)
                                  }
                                  placeholder="Tél"
                                  className="rounded border border-zinc-200 px-2 py-1 text-sm focus:border-[#14b8a6] focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={editAdresse}
                                  onChange={(e) => setEditAdresse(e.target.value)}
                                  placeholder="Adresse"
                                  className="rounded border border-zinc-200 px-2 py-1 text-sm focus:border-[#14b8a6] focus:outline-none"
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="font-medium text-zinc-900">
                              {client.nom}
                            </span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {editingId === client.id ? (
                            <div className="space-y-1">
                              <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full max-w-[180px] rounded border border-zinc-200 px-2 py-1 text-sm focus:border-[#14b8a6] focus:outline-none"
                              />
                              <input
                                type="tel"
                                value={editTelephone}
                                onChange={(e) =>
                                  setEditTelephone(e.target.value)
                                }
                                placeholder="Tél"
                                className="w-full max-w-[140px] rounded border border-zinc-200 px-2 py-1 text-sm focus:border-[#14b8a6] focus:outline-none"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 text-sm text-zinc-600">
                              {client.email && (
                                <span className="truncate">
                                  {client.email}
                                </span>
                              )}
                              {client.telephone && (
                                <span>Tél. {client.telephone}</span>
                              )}
                              {!client.email && !client.telephone && (
                                <span className="text-zinc-400">—</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {editingId === client.id ? (
                            <input
                              type="text"
                              value={editAdresse}
                              onChange={(e) => setEditAdresse(e.target.value)}
                              placeholder="Adresse"
                              className="w-full max-w-[220px] rounded border border-zinc-200 px-2 py-1 text-sm focus:border-[#14b8a6] focus:outline-none"
                            />
                          ) : (
                            <span className="line-clamp-1 text-sm text-zinc-600">
                              {client.adresse || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingId === client.id ? (
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateClient(client.id)
                                }
                                className="rounded px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                                style={{ backgroundColor: TEAL }}
                              >
                                Enregistrer
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(client)}
                                className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteClient(client.id)
                                }
                                className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Supprimer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
