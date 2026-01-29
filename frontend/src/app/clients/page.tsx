"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Client {
  id: string;
  nom: string;
  email?: string | null;
  adresse?: string | null;
  telephone?: string | null;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");

  // Édition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAdresse, setEditAdresse] = useState("");
  const [editTelephone, setEditTelephone] = useState("");

  // Recherche
  const [searchTerm, setSearchTerm] = useState("");

  const [societeId, setSocieteId] = useState<string | null>(null);

  async function loadClients() {
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

      const firstId = societes[0].id as string;
      setSocieteId(firstId);

      // 2. Charger les clients de cette société
      const resClients = await fetch(
        `${API_URL}/societes/${firstId}/clients`,
      );
      if (!resClients.ok) {
        throw new Error("Impossible de charger les clients");
      }
      const data = await resClients.json();
      setClients(data);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    if (!societeId) return;

    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/clients`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom,
            email: email || undefined,
            adresse: adresse || undefined,
            telephone: telephone || undefined,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la création");
      }

      setNom("");
      setEmail("");
      setAdresse("");
      setTelephone("");
      await loadClients();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
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
    setEditNom("");
    setEditEmail("");
    setEditAdresse("");
    setEditTelephone("");
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
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  async function handleDeleteClient(id: string) {
    if (!societeId) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;

    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/clients/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la suppression");
      }

      await loadClients();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 px-4 py-10 font-sans">
      <main className="w-full max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Clients
          </h1>
          <p className="text-sm text-zinc-500">
            Gérez la liste de vos clients (PME).
          </p>
        </header>

        {/* Résumé rapide */}
        {!loading && clients.length > 0 && (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Total clients
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {clients.length}
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
            Nouveau client
          </h2>
          <form
            onSubmit={handleCreateClient}
            className="space-y-3"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                placeholder="Nom du client *"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                required
              />
              <input
                type="email"
                placeholder="Email (optionnel)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
              <input
                type="text"
                placeholder="Adresse (optionnel)"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
              <input
                type="tel"
                placeholder="Téléphone (optionnel)"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              disabled={!societeId}
            >
              Ajouter
            </button>
          </form>
        </section>

        {loading && (
          <p className="text-sm text-zinc-500">Chargement...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-800">
              Liste des clients
            </h2>
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>
          {clients.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucun client pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {clients
                .filter((client) => {
                  if (!searchTerm) return true;
                  const term = searchTerm.toLowerCase();
                  return (
                    client.nom.toLowerCase().includes(term) ||
                    client.email?.toLowerCase().includes(term) ||
                    client.adresse?.toLowerCase().includes(term) ||
                    client.telephone?.toLowerCase().includes(term)
                  );
                })
                .map((client) => (
                <li key={client.id} className="py-3">
                  {editingId === client.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          type="text"
                          value={editNom}
                          onChange={(e) => setEditNom(e.target.value)}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                          required
                        />
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                        />
                        <input
                          type="text"
                          value={editAdresse}
                          onChange={(e) => setEditAdresse(e.target.value)}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                        />
                        <input
                          type="tel"
                          value={editTelephone}
                          onChange={(e) => setEditTelephone(e.target.value)}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateClient(client.id)}
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
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {client.nom}
                        </p>
                        {client.email && (
                          <p className="text-xs text-zinc-500">
                            {client.email}
                          </p>
                        )}
                        {client.adresse && (
                          <p className="text-xs text-zinc-500">
                            {client.adresse}
                          </p>
                        )}
                        {client.telephone && (
                          <p className="text-xs text-zinc-500">
                            Tél: {client.telephone}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(client)}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
              {clients.filter((client) => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                  client.nom.toLowerCase().includes(term) ||
                  client.email?.toLowerCase().includes(term) ||
                  client.adresse?.toLowerCase().includes(term) ||
                  client.telephone?.toLowerCase().includes(term)
                );
              }).length === 0 && searchTerm && (
                <li className="py-4 text-center text-sm text-zinc-500">
                  Aucun client trouvé pour "{searchTerm}"
                </li>
              )}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

