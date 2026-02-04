"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ExpertBanqueComptesRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const societeId = params.id as string;

  useEffect(() => {
    router.replace(`/expert/societes/${societeId}/comptes-bancaires`);
  }, [router, societeId]);

  return (
    <div className="p-6 flex items-center justify-center min-h-[200px]">
      <p className="text-gray-500">Redirection vers Comptes bancaires...</p>
    </div>
  );
}
