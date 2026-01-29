"use client";

import { useState, useRef, useEffect } from "react";

const MOIS_LABELS: Record<string, string> = {
  "01": "janvier",
  "02": "février",
  "03": "mars",
  "04": "avril",
  "05": "mai",
  "06": "juin",
  "07": "juillet",
  "08": "août",
  "09": "septembre",
  "10": "octobre",
  "11": "novembre",
  "12": "décembre",
};

const MOIS_ABBREV: Record<string, string> = {
  "01": "Janv.",
  "02": "Févr.",
  "03": "Mars",
  "04": "Avr.",
  "05": "Mai",
  "06": "Juin",
  "07": "Juil.",
  "08": "Août",
  "09": "Sept.",
  "10": "Oct.",
  "11": "Nov.",
  "12": "Déc.",
};

interface PeriodPickerProps {
  selectedMonth: string;
  selectedYear: string;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
}

export function PeriodPicker({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: PeriodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(Number(selectedYear));
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDisplayYear(Number(selectedYear));
  }, [selectedYear]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleMonthSelect = (month: string) => {
    onMonthChange(month);
    setIsOpen(false);
  };

  const handleYearChange = (delta: number) => {
    setDisplayYear((prev) => prev + delta);
  };

  const selectedMonthLabel = MOIS_LABELS[selectedMonth] || "janvier";
  const currentYear = Number(selectedYear);

  return (
    <div className="relative">
      {/* Bouton de sélection */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      >
        <span className="font-medium">
          {selectedMonthLabel} {selectedYear}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-500"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          {/* Modal content */}
          <div
            ref={modalRef}
            className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl bg-white p-4 shadow-xl"
          >
            {/* Header avec année et flèches */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleYearChange(-1)}
                className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100"
                aria-label="Année précédente"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-lg font-semibold text-zinc-900">
                {displayYear}
              </span>
              <button
                type="button"
                onClick={() => handleYearChange(1)}
                className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100"
                aria-label="Année suivante"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Grille des mois */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {Object.entries(MOIS_ABBREV).map(([value, label]) => {
                const isSelected =
                  value === selectedMonth && displayYear === currentYear;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      handleMonthSelect(value);
                      onYearChange(String(displayYear));
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isSelected
                        ? "bg-zinc-700 text-white"
                        : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Bouton OK */}
            <button
              type="button"
              onClick={() => {
                onYearChange(String(displayYear));
                setIsOpen(false);
              }}
              className="w-full rounded-lg bg-gradient-to-r from-blue-400 to-emerald-400 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-blue-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              OK
            </button>
          </div>
        </>
      )}
    </div>
  );
}
