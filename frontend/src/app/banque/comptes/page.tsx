"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BanqueComptesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/comptes-bancaires");
  }, [router]);

  return (
    <div className="p-6 flex items-center justify-center min-h-[200px]">
      <p className="text-gray-500">Redirection vers Comptes bancaires...</p>
    </div>
  );
}
