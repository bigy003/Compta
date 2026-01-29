"use client";

interface PeriodFilterProps {
  selectedMonth: string;
  selectedYear: string;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  onReset: () => void;
}

export function PeriodFilter({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onReset,
}: PeriodFilterProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "01", label: "Janvier" },
    { value: "02", label: "Février" },
    { value: "03", label: "Mars" },
    { value: "04", label: "Avril" },
    { value: "05", label: "Mai" },
    { value: "06", label: "Juin" },
    { value: "07", label: "Juillet" },
    { value: "08", label: "Août" },
    { value: "09", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" },
  ];

  const hasFilter = selectedMonth !== "" || selectedYear !== "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
      >
        <option value="">Tous les mois</option>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <select
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
      >
        <option value="">Toutes les années</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>

      {hasFilter && (
        <button
          onClick={onReset}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
