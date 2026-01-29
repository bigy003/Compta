"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Home() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<"PME" | "EXPERT">("PME");
  
  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Register PME
  const [pmeName, setPmeName] = useState("");
  const [pmeEmail, setPmeEmail] = useState("");
  const [pmePassword, setPmePassword] = useState("");
  const [pmePhone, setPmePhone] = useState("");
  const [societeNom, setSocieteNom] = useState("");
  
  // Register Expert
  const [expertName, setExpertName] = useState("");
  const [expertEmail, setExpertEmail] = useState("");
  const [expertPassword, setExpertPassword] = useState("");
  const [expertPhone, setExpertPhone] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur de connexion");
      }

      const data = await res.json();

      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("auth_email", data.user.email);
        localStorage.setItem("auth_role", data.user.role);
      }

      setSuccess(`Connecté en tant que ${data.user.email}`);
      if (data.user.role === "EXPERT") {
        router.push("/expert/societes");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterPme(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: pmeEmail,
          password: pmePassword,
          name: pmeName,
          phone: pmePhone || undefined,
          societeNom,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de l'inscription");
      }

      const data = await res.json();

      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("auth_email", data.user.email);
        localStorage.setItem("auth_role", data.user.role);
      }

      setSuccess("Compte créé avec succès !");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterExpert(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/auth/register-expert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: expertEmail,
          password: expertPassword,
          name: expertName,
          phone: expertPhone || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de l'inscription");
      }

      const data = await res.json();

      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("auth_email", data.user.email);
        localStorage.setItem("auth_role", data.user.role);
      }

      setSuccess("Compte expert créé avec succès !");
      router.push("/expert/societes");
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 font-sans">
      <main className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-zinc-200">
          <button
            onClick={() => setIsLogin(true)}
            className={`px-4 py-2 text-sm font-medium transition ${
              isLogin
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`px-4 py-2 text-sm font-medium transition ${
              !isLogin
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Inscription
          </button>
        </div>

        {isLogin ? (
          <>
            <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
              Connexion
            </h1>
            <p className="mb-6 text-sm text-zinc-500">
              Connectez-vous pour accéder à votre tableau de bord.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              {success && (
                <p className="text-sm text-emerald-600">{success}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
              Créer un compte
            </h1>
            <p className="mb-4 text-sm text-zinc-500">
              Choisissez votre type de compte.
            </p>

            {/* Type selection */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setUserType("PME")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  userType === "PME"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                PME
              </button>
              <button
                onClick={() => setUserType("EXPERT")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  userType === "EXPERT"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Expert-comptable
              </button>
            </div>

            {userType === "PME" ? (
              <form onSubmit={handleRegisterPme} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={pmeName}
                    onChange={(e) => setPmeName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Nom de la société *
                  </label>
                  <input
                    type="text"
                    value={societeNom}
                    onChange={(e) => setSocieteNom(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={pmeEmail}
                    onChange={(e) => setPmeEmail(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Téléphone (optionnel)
                  </label>
                  <input
                    type="tel"
                    value={pmePhone}
                    onChange={(e) => setPmePhone(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    value={pmePassword}
                    onChange={(e) => setPmePassword(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                {success && (
                  <p className="text-sm text-emerald-600">{success}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Création..." : "Créer mon compte PME"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterExpert} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={expertName}
                    onChange={(e) => setExpertName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={expertEmail}
                    onChange={(e) => setExpertEmail(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Téléphone (optionnel)
                  </label>
                  <input
                    type="tel"
                    value={expertPhone}
                    onChange={(e) => setExpertPhone(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    value={expertPassword}
                    onChange={(e) => setExpertPassword(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                {success && (
                  <p className="text-sm text-emerald-600">{success}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Création..." : "Créer mon compte Expert"}
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
