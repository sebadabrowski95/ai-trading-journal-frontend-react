"use client";

import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError } from "@/lib/api/client";
import {
  createTransaction,
  deleteTransaction,
  getTransactionsCalendar,
  getTransactionsDay,
  importTransactions,
  TransactionResponse,
  TransactionsCalendarDay,
  TransactionsCalendarResponse,
  TransactionsDayResponse,
  TransactionsCalendarWeek, updateTransaction,
} from "@/lib/api/transactions";
import { clearAccessToken, getAccessToken, isLoggedIn,} from "@/lib/auth/storage";
import { TopNavigation } from "../_components/top-navigation";

const WEEKDAY_LABELS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const DAY_NUMBER_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  timeZone: "UTC",
});
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const DATETIME_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type CalendarCell = {
  dateKey: string;
  day: TransactionsCalendarDay | null;
};

type TransactionFormState = {
  position: string;
  symbol: string;
  type: string;
  volume: string;
  openTime: string;
  openPrice: string;
  closeTime: string;
  closePrice: string;
  grossPl: string;
  comment: string;
};

type EditorMode = "create" | "edit";

const EMPTY_TRANSACTION_FORM: TransactionFormState = {
  position: "",
  symbol: "",
  type: "BUY",
  volume: "",
  openTime: "",
  openPrice: "",
  closeTime: "",
  closePrice: "",
  grossPl: "",
  comment: "",
};

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : "";
  const formatted = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(Math.abs(value));
  return `${sign}${formatted}`;
}

function getWeekNumber(dateString: string) {
  const utcDate = new Date(`${dateString}T00:00:00Z`);
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getAmountClass(value: number) {
  if (value > 0) {
    return "text-sky-700";
  }
  if (value < 0) {
    return "text-orange-700";
  }
  return "text-zinc-500";
}

function getDaySurfaceClass(value: number) {
  if (value > 0) {
    return "border-sky-200 bg-sky-50/90";
  }
  if (value < 0) {
    return "border-orange-200 bg-orange-50/90";
  }
  return "border-zinc-200 bg-white";
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1 ).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseUtcDate(dateString: string) {
  return new Date(`${dateString}T00:00:00Z`);
}

function toDateTimeLocalValue(input: string | null | undefined) {
  if (!input) {
    return "";
  }

  const date = new Date(input);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toUtcIsoString(input: string) {
  return new Date(input).toISOString();
}

function getDefaultTransactionForm(date: string): TransactionFormState {
  return {
    ...EMPTY_TRANSACTION_FORM,
    type: "BUY",
    openTime: `${date}T09:00`,
    closeTime: `${date}T16:00`,
  };
}

function toTransactionFormState(transaction: TransactionResponse): TransactionFormState {
  return {
    position: transaction.position,
    symbol: transaction.symbol,
    type: transaction.type,
    volume: String(transaction.volume),
    openTime: toDateTimeLocalValue(transaction.openTime),
    openPrice: String(transaction.openPrice),
    closeTime: toDateTimeLocalValue(transaction.closeTime),
    closePrice:
      transaction.closePrice !== null ? String(transaction.closePrice) : "",
    grossPl: String(transaction.grossPl),
    comment: transaction.comment ?? "",
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

function buildCalendarRows(
  days: TransactionsCalendarDay[],
  weeks: TransactionsCalendarWeek[]
) {
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const weekMap = new Map(weeks.map((week) => [week.weekStart, week]));

  return weeks.map((week) => {
    const weekStart = parseUtcDate(week.weekStart);
    const cells: CalendarCell[] = Array.from({ length: 7 }, (_, index) => {
      const current = new Date(weekStart);
      current.setUTCDate(weekStart.getUTCDate() + index);
      const dateKey = current.toISOString().slice(0, 10);
      return {
        dateKey,
        day: dayMap.get(dateKey) ?? null,
      };
    });

    return {
      weekNumber: getWeekNumber(week.weekStart),
      week: weekMap.get(week.weekStart) ?? week,
      cells,
    };
  });
}

export default function MePage() {
  const router = useRouter();
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const [calendarData, setCalendarData] =
    useState<TransactionsCalendarResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] =
    useState<TransactionsDayResponse | null>(null);
  const [isDayModalLoading, setIsDayModalLoading] = useState(false);
  const [dayModalError, setDayModalError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(
    EMPTY_TRANSACTION_FORM
  );
  const [transactionFormMessage, setTransactionFormMessage] = useState("");
  const [transactionFormError, setTransactionFormError] = useState("");
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const todayKey = getTodayKey();

  const loadCalendar = useCallback(async (monthDate = currentMonthDate) => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      clearAccessToken();
      router.replace("/login");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getTransactionsCalendar(
        accessToken,
        monthDate.getFullYear(),
        monthDate.getMonth() + 1
      );
      setCalendarData(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAccessToken();
        router.replace("/login");
        return;
      }

      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nie udało się pobrać kalendarza transakcji.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentMonthDate, router]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      router.replace("/login");
      return;
    }

    void loadCalendar();
  }, [currentMonthDate, loadCalendar, router]);

  const calendarRows = useMemo(() => {
    if (!calendarData) {
      return [];
    }
    return buildCalendarRows(calendarData.days, calendarData.weeks);
  }, [calendarData]);

  const monthLabel = MONTH_FORMATTER.format(currentMonthDate);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedDate(null);
        setSelectedDayDetails(null);
        setDayModalError("");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  function handleMonthChange(offset: number) {
    setCurrentMonthDate((current) => {
      const next = new Date(current);
      next.setUTCMonth(current.getUTCMonth() + offset, 1);
      return next;
    });
  }

  async function handleDayClick(date: string) {
    const accessToken = getAccessToken();
    if (!accessToken) {
      clearAccessToken();
      router.replace("/login");
      return;
    }

    setSelectedDate(date);
    setSelectedDayDetails(null);
    setDayModalError("");
    setIsDayModalLoading(true);
    setTransactionForm(getDefaultTransactionForm(date));
    setTransactionFormMessage("");
    setTransactionFormError("");
    setEditorMode("create");
    setEditingTransactionId(null);

    try {
      const response = await getTransactionsDay(accessToken, date);
      setSelectedDayDetails(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAccessToken();
        router.replace("/login");
        return;
      }

      if (error instanceof ApiError) {
        setDayModalError(error.message);
      } else {
        setDayModalError("Nie udało się pobrać szczegółów dnia.");
      }
    } finally {
      setIsDayModalLoading(false);
    }
  }

  function closeDayModal() {
    setSelectedDate(null);
    setSelectedDayDetails(null);
    setDayModalError("");
    setIsDayModalLoading(false);
    setTransactionForm(EMPTY_TRANSACTION_FORM);
    setTransactionFormMessage("");
    setTransactionFormError("");
    setEditorMode("create");
    setEditingTransactionId(null);
  }

  function handleTransactionFormChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setTransactionForm((current) => ({ ...current, [name]: value }));
  }

  function resetTransactionFormToCreate() {
    if (!selectedDate) {
      return;
    }
    setTransactionForm(getDefaultTransactionForm(selectedDate));
    setTransactionFormMessage("");
    setTransactionFormError("");
    setEditorMode("create");
    setEditingTransactionId(null);
  }

  function startEditingTransaction(transaction: TransactionResponse) {
    setEditorMode("edit");
    setEditingTransactionId(transaction.id);
    setTransactionForm(toTransactionFormState(transaction));
    setTransactionFormMessage("");

  }

  async function handleCreateEditTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDate) {
      return;
    }
    const accessToken = getAccessToken();
    if (!accessToken) {
      clearAccessToken();
      router.replace("/login");
      return;
    }
    setIsSavingTransaction(true);
    setTransactionFormError("");
    setTransactionFormMessage("");

    if (editorMode === "edit") {
      if (!editingTransactionId) return;
      try {
        await updateTransaction(accessToken, editingTransactionId, {
          position: transactionForm.position.trim(),
          symbol: transactionForm.symbol.trim(),
          type: transactionForm.type,
          volume: Number(transactionForm.volume),
          openTime: toUtcIsoString(transactionForm.openTime),
          openPrice: Number(transactionForm.openPrice),
          closeTime: transactionForm.closeTime ? toUtcIsoString(transactionForm.closeTime) : undefined,
          closePrice: parseOptionalNumber(transactionForm.closePrice),
          grossPl: Number(transactionForm.grossPl),
          comment: transactionForm.comment.trim() || undefined,
        });
        setTransactionFormMessage("Transakcja została zaktualizowana.");
        await Promise.all([loadCalendar(), handleDayClick(selectedDate)]);
      } catch (error) {
        if (error instanceof ApiError) {
          setTransactionFormError(error.message);
        } else {
          setTransactionFormError("Nie udało się zaktualizować transakcji.");
        }
      } finally {
        setIsSavingTransaction(false);
      }
      return;
    }
   else {
      try {
        await createTransaction(accessToken, {
          position: transactionForm.position.trim(),
          symbol: transactionForm.symbol.trim(),
          type: transactionForm.type,
          volume: Number(transactionForm.volume),
          openTime: toUtcIsoString(transactionForm.openTime),
          openPrice: Number(transactionForm.openPrice),
          closeTime: transactionForm.closeTime
              ? toUtcIsoString(transactionForm.closeTime)
              : undefined,
          closePrice: parseOptionalNumber(transactionForm.closePrice),
          grossPl: Number(transactionForm.grossPl),
          comment: transactionForm.comment.trim() || undefined,
        });

        setTransactionFormMessage("Transakcja została dodana.");
        await Promise.all([loadCalendar(), handleDayClick(selectedDate)]);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAccessToken();
          router.replace("/login");
          return;
        }

        if (error instanceof ApiError) {
          setTransactionFormError(error.message);
        } else {
          setTransactionFormError("Nie udało się dodać transakcji.");
        }
      } finally {
        setIsSavingTransaction(false);
      }
    }
  }

  async function handleDeleteTransaction(id: number) {
    if (!selectedDate || !window.confirm("Usunąć tę transakcję?")) {
      return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      clearAccessToken();
      router.replace("/login");
      return;
    }

    try {
      await deleteTransaction(accessToken, id);
      if (editingTransactionId === id) {
        resetTransactionFormToCreate();
      }
      await Promise.all([loadCalendar(), handleDayClick(selectedDate)]);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAccessToken();
        router.replace("/login");
        return;
      }

      if (error instanceof ApiError) {
        setDayModalError(error.message);
      } else {
        setDayModalError("Nie udało się usunąć transakcji.");
      }
    }
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      clearAccessToken();
      router.replace("/login");
      return;
    }

    setImportError("");
    setImportMessage("");
    setIsImporting(true);

    try {
      const response = await importTransactions(accessToken, file);
      setImportMessage(`Zaimportowano ${response.importedCount} transakcji. Dodano ${response.added}, zaktualizowano ${response.updated}`);
      setTimeout(() => {
        setImportMessage('');
      }, 2000);

      await loadCalendar();
      if (selectedDate) {
        await handleDayClick(selectedDate);
      }
    } catch (error) {
      if (error instanceof Error) {
        setImportError(error.message);
      } else {
        setImportError("Nie udało się zaimportować pliku Excel.");
      }
      setTimeout(() => {
        setImportError('');
      }, 1000);
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f3f4f6_0%,#e4e7eb_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <TopNavigation />

        <section className="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
                AI Trading Journal
              </p>
              <h1 className="mt-2 text-3xl font-semibold capitalize tracking-tight text-zinc-950">
                {monthLabel}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
              <label className="cursor-pointer rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50">
                {isImporting ? "Importowanie..." : "Importuj Excel"}
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleImportFileChange}
                  disabled={isImporting}
                />
              </label>
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                ← Poprzedni
              </button>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                Następny →
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonthDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
                }}
                className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Dzisiaj
              </button>
            </div>
          </div>

          {(importMessage || importError) && (
            <div className="mt-5 space-y-3">
              {importMessage ? (
                <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                  {importMessage}
                </p>
              ) : null}
              {importError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {importError}
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-5">
              <p className="text-sm text-zinc-500">Wynik miesiąca</p>
              <p
                className={`mt-2 text-4xl font-semibold ${getAmountClass(
                  calendarData?.monthSummary.grossPl ?? 0
                )}`}
              >
                {calendarData
                  ? formatMoney(calendarData.monthSummary.grossPl)
                  : "--"}
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-5">
              <p className="text-sm text-zinc-500">Liczba transakcji</p>
              <p className="mt-2 text-4xl font-semibold text-zinc-950">
                {calendarData?.monthSummary.tradeCount ?? "--"}
              </p>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
            {errorMessage}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[28px] border border-white/60 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid grid-cols-[88px_repeat(7,minmax(120px,1fr))] border-b border-zinc-200 bg-zinc-100/80 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            <div className="px-4 py-4">Tydz.</div>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="border-l border-zinc-200 px-4 py-4">
                {label}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="px-5 py-10 text-sm text-zinc-500">Ładowanie kalendarza...</div>
          ) : calendarRows.length === 0 ? (
            <div className="px-5 py-10 text-sm text-zinc-500">
              Brak danych dla wybranego miesiąca.
            </div>
          ) : (
            <div className="grid">
              {calendarRows.map((row) => (
                <div
                  key={row.week.weekStart}
                  className="grid grid-cols-[88px_repeat(7,minmax(120px,1fr))] border-b border-zinc-200 last:border-b-0"
                >
                  <div className="flex flex-col justify-between bg-zinc-50 px-4 py-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                        Tydz.
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-950">
                        {row.weekNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 whitespace-nowrap ">
                        {SHORT_DATE_FORMATTER.format(
                          parseUtcDate(row.week.weekStart)
                        )}
                        -
                        {SHORT_DATE_FORMATTER.format(
                          parseUtcDate(row.week.weekEnd)
                        )}
                      </p>
                      <p
                        className={`mt-1 text-sm font-semibold ${getAmountClass(
                          row.week.grossPl
                        )}`}
                      >
                        {formatMoney(row.week.grossPl)}
                      </p>
                    </div>
                  </div>

                  {row.cells.map((cell) => {
                    const inCurrentMonth = Boolean(cell.day);
                    const day = cell.day;

                    const isToday = cell.dateKey === todayKey;
                    const canOpen = inCurrentMonth;

                    return (
                      <button
                        type="button"
                        key={cell.dateKey}
                        onClick={() => {
                          if (canOpen) {
                            void handleDayClick(cell.dateKey);
                          }
                        }}
                        disabled={!canOpen}
                        className={`border-l px-4 py-4 text-left transition ${
                          inCurrentMonth
                            ? `${getDaySurfaceClass(day?.grossPl ?? 0)} hover:brightness-[0.98]`
                            : "border-zinc-200 bg-zinc-50/50"
                        } ${isToday ? "ring-2 ring-zinc-950 ring-inset" : ""} ${
                          canOpen ? "cursor-pointer" : "cursor-default"
                        }`}
                      >
                        <div className="flex h-full min-h-33 flex-col justify-between gap-4">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-sm font-semibold ${
                                  inCurrentMonth ? "text-zinc-950" : "text-zinc-400"
                                }`}
                              >
                                {DAY_NUMBER_FORMATTER.format(
                                  parseUtcDate(cell.dateKey)
                                )}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              {day
                                ? ` Liczba transakcji: ${day.tradeCount}`
                                : ""}
                            </p>
                          </div>

                          <div>
                            <p
                              className={`mt-2 text-lg font-semibold ${
                                day ? getAmountClass(day.grossPl) : "text-zinc-400"
                              }`}
                            >
                              {day ? formatMoney(day.grossPl) : ""}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedDate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6"
          onClick={closeDayModal}
        >
          <div
            className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_35px_100px_rgba(15,23,42,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Szczegóły dnia
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
                  {LONG_DATE_FORMATTER.format(
                    parseUtcDate(selectedDate)
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDayModal}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                Zamknij
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-96px)] overflow-y-auto lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
              <div className="border-b border-zinc-200 px-6 py-5 lg:border-b-0 lg:border-r">
              {isDayModalLoading ? (
                <p className="text-sm text-zinc-500">Ładowanie transakcji...</p>
              ) : dayModalError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {dayModalError}
                </p>
              ) : selectedDayDetails ? (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm text-zinc-500">Wynik dnia</p>
                      <p
                        className={`mt-2 text-3xl font-semibold ${getAmountClass(
                          selectedDayDetails.grossPl
                        )}`}
                      >
                        {formatMoney(selectedDayDetails.grossPl)}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm text-zinc-500">Liczba transakcji</p>
                      <p className="mt-2 text-3xl font-semibold text-zinc-950">
                        {selectedDayDetails.tradeCount}
                      </p>
                    </div>
                  </div>

                  {selectedDayDetails.transactions.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      Brak transakcji dla tego dnia.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedDayDetails.transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white">
                                  {transaction.symbol}
                                </span>
                                <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                                  {transaction.type}
                                </span>
                              </div>
                              <p className="mt-3 text-sm text-zinc-500">
                                Pozycja #{transaction.position}
                              </p>
                              <p className="mt-1 text-sm text-zinc-500">
                                Otwarcie:{" "}
                                {DATETIME_FORMATTER.format(
                                  new Date(transaction.openTime)
                                )}{" "}
                                | Zamknięcie:{" "}
                                {transaction.closeTime
                                  ? DATETIME_FORMATTER.format(
                                      new Date(transaction.closeTime)
                                    )
                                  : "--"}
                              </p>
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-sm text-zinc-500">Wynik</p>
                              <p
                                className={`mt-1 text-2xl font-semibold ${getAmountClass(
                                  transaction.grossPl
                                )}`}
                              >
                                {formatMoney(transaction.grossPl)}
                              </p>
                              <p className="mt-2 text-sm text-zinc-500">
                                Wolumen: {transaction.volume}
                              </p>
                            </div>
                          </div>

                            <div className="mt-4 grid gap-3 text-sm text-zinc-600 md:grid-cols-3">
                              <p>Open: {transaction.openPrice.toFixed(4)}</p>
                              <p>
                                Close:{" "}
                                {transaction.closePrice !== null
                                  ? transaction.closePrice.toFixed(4)
                                  : "--"}
                              </p>
                              <p>Komentarz: {transaction.comment?.trim() || "--"}</p>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => startEditingTransaction(transaction)}
                                className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                              >
                                Edytuj
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteTransaction(transaction.id)}
                                className="rounded-2xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                              >
                                Usuń
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <aside className="bg-zinc-50/70 px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                      {editorMode === "create" ? "Dodaj transakcję" : "Edytuj transakcję"}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                      {editorMode === "create"
                        ? "Nowa pozycja dla dnia"
                        : `Pozycja ${transactionForm.position || "--"}`}

                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={resetTransactionFormToCreate}
                    className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    Wyczyść
                  </button>
                </div>

                <form className="mt-5 space-y-4" onSubmit={handleCreateEditTransaction}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-zinc-700">Position</span>
                      <input
                        name="position"
                        value={transactionForm.position}
                        onChange={handleTransactionFormChange}
                        required
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-zinc-700">Symbol</span>
                      <input
                        name="symbol"
                        value={transactionForm.symbol}
                        onChange={handleTransactionFormChange}
                        required
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-zinc-700">Type</span>
                      <select
                        name="type"
                        value={transactionForm.type}
                        onChange={handleTransactionFormChange}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                      >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-zinc-700">Volume</span>
                      <input
                        name="volume"
                        type="number"
                        step="0.01"
                        value={transactionForm.volume}
                        onChange={handleTransactionFormChange}
                        required
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-zinc-700">Open time</span>
                      <input
                        name="openTime"
                        type="datetime-local"
                        value={transactionForm.openTime}
                        onChange={handleTransactionFormChange}
                        required
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-zinc-700">Close time</span>
                      <input
                        name="closeTime"
                        type="datetime-local"
                        value={transactionForm.closeTime}
                        onChange={handleTransactionFormChange}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-zinc-700">Open price</span>
                      <input
                        name="openPrice"
                        type="number"
                        step="0.0001"
                        value={transactionForm.openPrice}
                        onChange={handleTransactionFormChange}
                        required
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-zinc-700">Close price</span>
                      <input
                        name="closePrice"
                        type="number"
                        step="0.0001"
                        value={transactionForm.closePrice}
                        onChange={handleTransactionFormChange}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-zinc-700">Gross P/L</span>
                      <input
                        name="grossPl"
                        type="number"
                        step="0.01"
                        value={transactionForm.grossPl}
                        onChange={handleTransactionFormChange}
                        required
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                      />
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-zinc-700">Comment</span>
                    <textarea
                      name="comment"
                      value={transactionForm.comment}
                      onChange={handleTransactionFormChange}
                      rows={3}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                    />
                  </label>


                  {transactionFormMessage ? (
                    <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                      {transactionFormMessage}
                    </p>
                  ) : null}
                  {transactionFormError ? (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {transactionFormError}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isSavingTransaction}
                      className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
                    >
                      {isSavingTransaction ? "Zapisywanie..." : (editorMode === "edit" ? "Edytuj transakcję" : "Dodaj transakcję")}
                    </button>
                    {editorMode === "edit" ? (
                      <button
                        type="button"
                        onClick={resetTransactionFormToCreate}
                        className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                      >
                        Wróć do dodawania
                      </button>
                    ) : null}
                  </div>
                </form>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
