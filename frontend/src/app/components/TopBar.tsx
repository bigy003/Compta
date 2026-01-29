"use client";

import { usePathname, useRouter } from "next/navigation";

const pmeLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/devis", label: "Devis" },
  { href: "/factures", label: "Factures" },
  { href: "/notes-frais", label: "Notes de frais" },
  { href: "/comptes-bancaires", label: "Comptes bancaires" },
  { href: "/rapprochement-avance", label: "Rapprochement" },
  { href: "/plan-comptable", label: "Plan comptable" },
  { href: "/grand-livre", label: "Grand livre" },
  { href: "/exercices", label: "Exercices" },
  { href: "/declarations-tva", label: "Déclarations TVA" },
  { href: "/documents", label: "Documents" },
  { href: "/tresorerie", label: "Trésorerie" },
];

const expertLinks = [
  { href: "/expert/societes", label: "Dossiers clients" },
];

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_email");
      localStorage.removeItem("auth_role");
    }
    router.push("/");
  }

  // On ne montre pas la topbar sur la page de login
  if (pathname === "/") {
    return null;
  }

  const email =
    typeof window !== "undefined"
      ? localStorage.getItem("auth_email")
      : null;

  const role =
    typeof window !== "undefined"
      ? localStorage.getItem("auth_role")
      : null;

  // Si l'expert est sur une page de société, on affiche les liens de navigation pour cette société
  let links = role === "EXPERT" ? expertLinks : pmeLinks;
  if (role === "EXPERT" && pathname?.startsWith("/expert/societes/")) {
    const societeIdMatch = pathname.match(/\/expert\/societes\/([^/]+)/);
    if (societeIdMatch) {
      const societeId = societeIdMatch[1];
        links = [
          { href: `/expert/societes/${societeId}/dashboard`, label: "Dashboard" },
          { href: `/expert/societes/${societeId}/clients`, label: "Clients" },
          { href: `/expert/societes/${societeId}/devis`, label: "Devis" },
          { href: `/expert/societes/${societeId}/factures`, label: "Factures" },
          { href: `/expert/societes/${societeId}/notes-frais`, label: "Notes de frais" },
          { href: `/expert/societes/${societeId}/comptes-bancaires`, label: "Comptes bancaires" },
          { href: `/expert/societes/${societeId}/rapprochement-avance`, label: "Rapprochement" },
          { href: `/expert/societes/${societeId}/plan-comptable`, label: "Plan comptable" },
          { href: `/expert/societes/${societeId}/grand-livre`, label: "Grand livre" },
          { href: `/expert/societes/${societeId}/exercices`, label: "Exercices" },
          { href: `/expert/societes/${societeId}/declarations-tva`, label: "Déclarations TVA" },
          { href: `/expert/societes/${societeId}/documents`, label: "Documents" },
          { href: `/expert/societes/${societeId}/tresorerie`, label: "Trésorerie" },
        ];
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
      <nav className="flex gap-4 text-sm">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className={`rounded-full px-3 py-1 ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 text-sm">
        {email && (
          <span className="hidden text-zinc-500 sm:inline">
            {email}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
