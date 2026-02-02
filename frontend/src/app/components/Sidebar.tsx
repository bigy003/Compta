"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const ORANGE_BG = "#f97316"; // orange-500
const ORANGE_DARK = "#ea580c"; // orange-600

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

function getNavItems(role: string | null, societeId?: string): NavItem[] {
  // Si expert sur la liste des sociétés, on affiche juste le lien vers la liste
  if (role === "EXPERT" && !societeId) {
    return [
      {
        href: "/expert/societes",
        label: "Dossiers clients",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ];
  }

  const basePath = societeId ? `/expert/societes/${societeId}` : "";
  
  return [
    {
      href: `${basePath}/dashboard`,
      label: "Tableau de bord",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      href: `${basePath}/clients`,
      label: "Clients",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: `${basePath}/devis`,
      label: "Devis | Facturation",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      children: [
        { href: `${basePath}/devis`, label: "Devis", icon: null },
        { href: `${basePath}/factures`, label: "Factures", icon: null },
      ],
    },
    {
      href: `${basePath}/notes-frais`,
      label: "Notes de frais",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="18" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
    {
      href: `${basePath}/comptes-bancaires`,
      label: "Comptes bancaires",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
    {
      href: `${basePath}/documents`,
      label: "Documents",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    },
    {
      href: `${basePath}/rapprochement-avance`,
      label: "Rapprochement",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
        </svg>
      ),
    },
    {
      href: `${basePath}/audit`,
      label: "Audit",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      href: `${basePath}/declarations-tva`,
      label: "Déclarations fiscales",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3h18v18H3z" />
          <path d="M3 9h18" />
          <path d="M9 3v18" />
        </svg>
      ),
    },
    {
      href: `${basePath}/plan-comptable`,
      label: "Comptabilité",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="6" y1="8" x2="18" y2="8" />
          <line x1="6" y1="12" x2="18" y2="12" />
          <line x1="6" y1="16" x2="18" y2="16" />
        </svg>
      ),
      children: [
        { href: `${basePath}/plan-comptable`, label: "Plan comptable", icon: null },
        { href: `${basePath}/grand-livre`, label: "Grand livre", icon: null },
        { href: `${basePath}/exercices`, label: "Exercices", icon: null },
      ],
    },
    {
      href: `${basePath}/tresorerie`,
      label: "Trésorerie",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      href: `${basePath}/previsions-tresorerie`,
      label: "Prévisions trésorerie",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </svg>
      ),
    },
    {
      href: `${basePath}/budget`,
      label: "Budget",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </svg>
      ),
    },
    {
      href: `${basePath}/stock`,
      label: "Stock",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      href: `${basePath}/immobilisations`,
      label: "Immobilisations",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
  ];
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  if (pathname === "/") {
    return null;
  }

  const role =
    typeof window !== "undefined"
      ? localStorage.getItem("auth_role")
      : null;

  let societeId: string | undefined;
  if (role === "EXPERT" && pathname?.startsWith("/expert/societes/")) {
    const match = pathname.match(/\/expert\/societes\/([^/]+)/);
    if (match) societeId = match[1];
  }

  const navItems = getNavItems(role, societeId);

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === "/dashboard" || href.includes("/dashboard")) {
      return pathname === href || pathname?.endsWith("/dashboard");
    }
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <aside
      className="fixed left-0 top-0 z-30 h-screen w-64 overflow-y-auto border-r border-orange-600/20"
      style={{ backgroundColor: ORANGE_BG }}
    >
      <div className="flex h-full flex-col">
        {/* Logo/Titre */}
        <div className="border-b border-orange-600/20 px-4 py-4">
          <h1 className="text-lg font-bold text-white">ComptaCI</h1>
          <p className="text-xs text-orange-100">Côte d&apos;Ivoire</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.has(item.href);
            const active = isActive(item.href);

            return (
              <div key={item.href}>
                <button
                  type="button"
                  onClick={() => {
                    if (hasChildren) {
                      toggleExpand(item.href);
                    } else {
                      router.push(item.href);
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white transition ${
                    active
                      ? "bg-orange-600 shadow-sm"
                      : "hover:bg-orange-600/80"
                  }`}
                  style={
                    active
                      ? { backgroundColor: ORANGE_DARK }
                      : {}
                  }
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {hasChildren && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>

                {/* Sous-menu */}
                {hasChildren && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-orange-600/30 pl-4">
                    {item.children!.map((child) => {
                      const childActive = isActive(child.href);
                      return (
                        <button
                          key={child.href}
                          type="button"
                          onClick={() => router.push(child.href)}
                          className={`block w-full rounded-md px-3 py-2 text-left text-sm text-white transition ${
                            childActive
                              ? "bg-orange-600/50 font-medium"
                              : "hover:bg-orange-600/40"
                          }`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer avec déconnexion */}
        <div className="border-t border-orange-600/20 p-4">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_email");
                localStorage.removeItem("auth_role");
              }
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600/80"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
