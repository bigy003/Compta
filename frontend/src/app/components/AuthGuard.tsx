"use client";

import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

const PUBLIC_ROUTES = ["/"];

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Routes publiques : pas de garde
    if (PUBLIC_ROUTES.includes(pathname)) {
      setChecked(true);
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("auth_token")
        : null;

    if (!token) {
      router.replace("/");
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  if (!checked) {
    return null;
  }

  return <>{children}</>;
}

