"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface CompteBancaire {
  id: string;
  nom: string;
  banque?: string | null;
  numeroCompte?: string | null;
  devise: string;
  actif: boolean;
}

type ImportFormat = "csv" | "excel" | "ofx";

const FORMATS_BANQUE_CSV = [
  { value: "GENERIQUE", label: "Générique (auto-détection)" },
  { value: "SGBCI", label: "SGBCI" },
  { value: "BICICI", label: "BICICI" },
  { value: "UBA", label: "UBA" },
  { value: "ECOBANK", label: "Ecobank" },
];

export default function ExpertBanqueImportPage() {
  const router = useRouter();
  const params = useParams();
  const societeId = params.id as string;

  const [comptes, setComptes] = useState<CompteBancaire[]>([]);
  const [compteId, setCompteId] = useState<string>("");
  const [format, setFormat] = useState<ImportFormat>("csv");
  const [csvContent, setCsvContent] = useState("");
  const [csvFormatBanque, setCsvFormatBanque] = useState("GENERIQUE");
  const [ofxContent, setOfxContent] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    creees: number;
    ignorees: number;
    erreurs: string[];
  } | null>(null);

  useEffect(() => {
    if (societeId) loadComptes();
  }, [societeId]);

  async function loadComptes() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${API_URL}/societes/${societeId}/comptes-bancaires`
      );
      if (!res.ok) throw new Error("Impossible de charger les comptes");
      const data = await res.json();
      const actifs = data.filter((c: CompteBancaire) => c.actif);
      setComptes(actifs);
      if (actifs.length > 0 && !compteId) setCompteId(actifs[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }

  async function submitImport() {
    if (!compteId) {
      setError("Veuillez sélectionner un compte bancaire.");
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      if (format === "csv") {
        if (!csvContent.trim()) {
          setError("Collez le contenu CSV du relevé.");
          setImporting(false);
          return;
        }
        const res = await fetch(
          `${API_URL}/societes/${societeId}/banque/comptes/${compteId}/import/csv`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: csvContent,
              formatBanque: csvFormatBanque,
            }),
          }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || res.statusText);
        }
        const data = await res.json();
        setResult(data);
      } else if (format === "ofx") {
        if (!ofxContent.trim()) {
          setError("Collez le contenu OFX du relevé.");
          setImporting(false);
          return;
        }
        const res = await fetch(
          `${API_URL}/societes/${societeId}/banque/comptes/${compteId}/import/ofx`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: ofxContent }),
          }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || res.statusText);
        }
        const data = await res.json();
        setResult(data);
      } else if (format === "excel") {
        if (!excelFile) {
          setError("Sélectionnez un fichier Excel.");
          setImporting(false);
          return;
        }
        const formData = new FormData();
        formData.append("file", excelFile);
        const res = await fetch(
          `${API_URL}/societes/${societeId}/banque/comptes/${compteId}/import/excel`,
          {
            method: "POST",
            body: formData,
          }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || res.statusText);
        }
        const data = await res.json();
        setResult(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Importer un relevé bancaire</h1>
        <button
          onClick={() => router.push(`/expert/societes/${societeId}/banque`)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Retour à la banque
        </button>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <label className="block text-sm font-medium mb-2">Compte bancaire</label>
        <select
          value={compteId}
          onChange={(e) => setCompteId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border rounded"
        >
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom} {c.banque ? `(${c.banque})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <label className="block text-sm font-medium mb-2">Format d'import</label>
        <div className="flex gap-4">
          {(["csv", "excel", "ofx"] as ImportFormat[]).map((f) => (
            <label key={f} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                checked={format === f}
                onChange={() => setFormat(f)}
              />
              <span className="capitalize">{f}</span>
            </label>
          ))}
        </div>
      </div>

      {format === "csv" && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <label className="block text-sm font-medium mb-2">
            Format banque (CSV)
          </label>
          <select
            value={csvFormatBanque}
            onChange={(e) => setCsvFormatBanque(e.target.value)}
            className="w-full max-w-md px-3 py-2 border rounded mb-4"
          >
            {FORMATS_BANQUE_CSV.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="block text-sm font-medium mb-2">
            Contenu du fichier CSV (collez ci-dessous)
          </label>
          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="Date;Montant;Libellé;Type;Référence&#10;2024-01-15;50000;VIREMENT RECU;CREDIT;REF001"
            className="w-full h-48 px-3 py-2 border rounded font-mono text-sm"
          />
        </div>
      )}

      {format === "excel" && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <label className="block text-sm font-medium mb-2">
            Fichier Excel (.xlsx, .xls)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
            className="w-full max-w-md px-3 py-2 border rounded"
          />
        </div>
      )}

      {format === "ofx" && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <label className="block text-sm font-medium mb-2">
            Contenu du fichier OFX (collez ci-dessous)
          </label>
          <textarea
            value={ofxContent}
            onChange={(e) => setOfxContent(e.target.value)}
            placeholder="<OFX>...</OFX>"
            className="w-full h-48 px-3 py-2 border rounded font-mono text-sm"
          />
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      {result && (
        <div className="mb-4 p-4 bg-green-50 rounded border border-green-200">
          <p className="font-medium text-green-800">
            Import terminé : {result.creees} créée(s), {result.ignorees} ignorée(s)
          </p>
          {result.erreurs && result.erreurs.length > 0 && (
            <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
              {result.erreurs.slice(0, 10).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {result.erreurs.length > 10 && (
                <li>... et {result.erreurs.length - 10} autre(s) erreur(s)</li>
              )}
            </ul>
          )}
        </div>
      )}

      <button
        onClick={submitImport}
        disabled={importing}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {importing ? "Import en cours..." : "Importer"}
      </button>
    </div>
  );
}
