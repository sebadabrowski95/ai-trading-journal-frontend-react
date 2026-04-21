"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  DashboardChartStats,
  DashboardChartTransaction,
  DashboardChartsResponse,
  getDashboardCharts,
} from "@/lib/api/dashboard";
import {
  clearAccessToken,
  getAccessToken,
  isLoggedIn,
} from "@/lib/auth/storage";
import { TopNavigation } from "../_components/top-navigation";

const PERCENT_FORMATTER = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const AXIS_DATE_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

const AXIS_HOUR_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type PieChartCardProps = {
  label: string;
  stats: DashboardChartStats;
  accentClassName: string;
  strokeColor: string;
};

type TickKind = "2h" | "4h" | "1d" | "7d" | "14d";

type TickConfig = {
  kind: TickKind;
  sizeMs: number;
};

type LinePoint = {
  x: number;
  y: number;
  label: string;
  tradeValue: number;
  symbols: string[];
  isStart: boolean;
  isVirtual?: boolean;
};

type XAxisTick = {
  x: number;
  label: string;
};

function formatMoney(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const sign = safeValue > 0 ? "+" : safeValue < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safeValue));

  return `${sign}${formatted} zl`;
}

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseUtcDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function getDefaultDateRange() {
  const now = new Date();
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  return {
    dateFrom: formatInputDate(firstDay),
    dateTo: formatInputDate(nextMonth),
  };
}

function getPieChartPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = {
    x: cx + radius * Math.cos(startAngle),
    y: cy + radius * Math.sin(startAngle),
  };
  const end = {
    x: cx + radius * Math.cos(endAngle),
    y: cy + radius * Math.sin(endAngle),
  };
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function getTickConfig(dateFrom: string, dateTo: string): TickConfig {
  const start = parseUtcDateInput(dateFrom);
  const end = parseUtcDateInput(dateTo) + DAY_MS;
  const rangeMs = Math.max(end - start, DAY_MS);

  if (rangeMs <= DAY_MS) {
    return { kind: "2h", sizeMs: 2 * HOUR_MS };
  }
  if (rangeMs <= 2 * DAY_MS) {
    return { kind: "4h", sizeMs: 4 * HOUR_MS };
  }
  if (rangeMs <= 20 * DAY_MS) {
    return { kind: "1d", sizeMs: DAY_MS };
  }
  if (rangeMs <= 80 * DAY_MS) {
    return { kind: "7d", sizeMs: 7 * DAY_MS };
  }

  return { kind: "14d", sizeMs: 14 * DAY_MS };
}

function formatTickLabel(timestamp: number, kind: TickKind) {
  const date = new Date(timestamp);

  if (kind === "1d" || kind === "7d" || kind === "14d") {
    return AXIS_DATE_FORMATTER.format(date);
  }

  return AXIS_HOUR_FORMATTER.format(date);
}

function toStats(transactions: DashboardChartTransaction[]): DashboardChartStats {
  const totalCount = transactions.length;
  const winCount = transactions.filter((transaction) => transaction.grossPL > 0).length;

  return {
    winCount,
    totalCount,
    winRatio: totalCount === 0 ? 0 : (winCount / totalCount) * 100,
  };
}

function buildLineSeries(
  transactions: DashboardChartTransaction[],
  dateFrom: string,
  dateTo: string,
  tickKind: TickKind
) {
  const start = parseUtcDateInput(dateFrom);
  const endExclusive = parseUtcDateInput(dateTo) + DAY_MS;

  const sortedTransactions = [...transactions]
    .map((transaction) => ({
      ...transaction,
      closeTimeMs: new Date(transaction.closeTime).getTime(),
    }))
    .filter(
      (transaction) =>
        Number.isFinite(transaction.closeTimeMs) &&
        transaction.closeTimeMs >= start &&
        transaction.closeTimeMs <= endExclusive
    )
    .sort((left, right) => left.closeTimeMs - right.closeTimeMs);

  const points: LinePoint[] = [
    {
      x: start,
      y: 0,
      label: formatTickLabel(start, tickKind),
      tradeValue: 0,
      symbols: [],
      isStart: true,
      isVirtual: true,
    },
  ];

  let runningTotal = 0;

  sortedTransactions.forEach((transaction) => {
    runningTotal += transaction.grossPL;
    points.push({
      x: transaction.closeTimeMs,
      y: runningTotal,
      label: formatTickLabel(transaction.closeTimeMs, tickKind),
      tradeValue: transaction.grossPL,
      symbols: [transaction.symbol],
      isStart: false,
    });
  });

  if (points[points.length - 1]?.x !== endExclusive) {
    points.push({
      x: endExclusive,
      y: runningTotal,
      label: formatTickLabel(endExclusive, tickKind),
      tradeValue: 0,
      symbols: [],
      isStart: false,
      isVirtual: true,
    });
  }

  return points;
}

function buildXAxisTicks(dateFrom: string, dateTo: string) {
  const start = parseUtcDateInput(dateFrom);
  const endExclusive = parseUtcDateInput(dateTo) + DAY_MS;
  const config = getTickConfig(dateFrom, dateTo);
  const ticks: XAxisTick[] = [];

  for (let current = start; current <= endExclusive; current += config.sizeMs) {
    ticks.push({
      x: current,
      label: formatTickLabel(current, config.kind),
    });
  }

  return {
    ticks,
    label: config.kind,
    kind: config.kind,
  };
}

function PieChartCard({
  label,
  stats,
  accentClassName,
  strokeColor,
}: PieChartCardProps) {
  const total = stats.totalCount;
  const wins = Math.max(0, Math.min(stats.winCount, total));
  const losses = Math.max(total - wins, 0);
  const winAngle = total > 0 ? (wins / total) * Math.PI * 2 : 0;

  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            {label}
          </p>
          <p className={`mt-2 text-2xl font-semibold ${accentClassName}`}>
            {PERCENT_FORMATTER.format(stats.winRatio)}%
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {wins} wygranych / {total} wszystkich
          </p>
        </div>

        <svg viewBox="0 0 120 120" className="h-24 w-24 shrink-0">
          <circle
            cx="60"
            cy="60"
            r="42"
            fill="none"
            stroke="#e4e4e7"
            strokeWidth="16"
          />
          {total > 0 ? (
            <>
              <path
                d={getPieChartPath(60, 60, 42, -Math.PI / 2, -Math.PI / 2 + winAngle)}
                fill={strokeColor}
              />
              {losses > 0 ? (
                <path
                  d={getPieChartPath(
                    60,
                    60,
                    42,
                    -Math.PI / 2 + winAngle,
                    -Math.PI / 2 + Math.PI * 2
                  )}
                  fill="#f4f4f5"
                />
              ) : null}
            </>
          ) : null}
          <circle cx="60" cy="60" r="24" fill="white" />
        </svg>
      </div>
    </article>
  );
}

export default function SummaryPage() {
  const router = useRouter();
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [data, setData] = useState<DashboardChartsResponse | null>(null);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [isSymbolSelectorOpen, setIsSymbolSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    }
  }, [router]);

  const loadCharts = useCallback(
    async (nextDateFrom: string, nextDateTo: string) => {
      const accessToken = getAccessToken();
      if (!accessToken) {
        clearAccessToken();
        router.replace("/login");
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getDashboardCharts(accessToken, {
          dateFrom: nextDateFrom,
          dateTo: nextDateTo,
        });

        setData(response);
        setSelectedSymbols(response.symbols);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAccessToken();
          router.replace("/login");
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Nie udalo sie pobrac danych wykresow.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!isLoggedIn()) {
      return;
    }

    void loadCharts(defaultRange.dateFrom, defaultRange.dateTo);
  }, [defaultRange.dateFrom, defaultRange.dateTo, loadCharts]);

  const availableSymbols = data?.symbols ?? [];

  const filteredTransactions = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.transactions.filter((transaction) =>
      selectedSymbols.includes(transaction.symbol)
    );
  }, [data, selectedSymbols]);

  const filteredPieStats = useMemo(
    () => ({
      buy: toStats(
        filteredTransactions.filter((transaction) => transaction.type === "BUY")
      ),
      sell: toStats(
        filteredTransactions.filter((transaction) => transaction.type === "SELL")
      ),
      overall: toStats(filteredTransactions),
    }),
    [filteredTransactions]
  );

  const xAxis = useMemo(() => buildXAxisTicks(dateFrom, dateTo), [dateFrom, dateTo]);

  const linePoints = useMemo(
    () => buildLineSeries(filteredTransactions, dateFrom, dateTo, xAxis.kind),
    [dateFrom, dateTo, filteredTransactions, xAxis.kind]
  );

  const chartMetrics = useMemo(() => {
    if (linePoints.length === 0) {
      return null;
    }

    const width = 900;
    const height = 360;
    const padding = { top: 24, right: 24, bottom: 56, left: 72 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const minX = parseUtcDateInput(dateFrom);
    const maxX = parseUtcDateInput(dateTo) + DAY_MS;
    const minY = Math.min(0, ...linePoints.map((point) => point.y));
    const maxY = Math.max(0, ...linePoints.map((point) => point.y));
    const yRange = maxY - minY || 1;
    const xRange = maxX - minX || 1;

    const points = linePoints.map((point) => ({
      ...point,
      chartX: padding.left + ((point.x - minX) / xRange) * chartWidth,
      chartY:
        padding.top + chartHeight - ((point.y - minY) / yRange) * chartHeight,
    }));

    const path = points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.chartX} ${point.chartY}`
      )
      .join(" ");

    const zeroLineY =
      padding.top + chartHeight - ((0 - minY) / yRange) * chartHeight;

    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const value = minY + (yRange / 4) * index;
      return {
        value,
        y: padding.top + chartHeight - (chartHeight / 4) * index,
      };
    });

    const xTicks = xAxis.ticks.map((tick) => ({
      ...tick,
      chartX: padding.left + ((tick.x - minX) / xRange) * chartWidth,
    }));

    return {
      width,
      height,
      padding,
      path,
      points,
      xTicks,
      yTicks,
      zeroLineY,
    };
  }, [dateFrom, dateTo, linePoints, xAxis.ticks]);

  function handleSymbolToggle(symbol: string) {
    setSelectedSymbols((current) =>
      current.includes(symbol)
        ? current.filter((currentSymbol) => currentSymbol !== symbol)
        : [...current, symbol].sort((left, right) => left.localeCompare(right))
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f3f4f6_0%,#e4e7eb_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <TopNavigation />

        <section className="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
                  AI Trading Journal
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                  Dashboard wykresow
                </h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:flex">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-700">Od</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-700">Do</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void loadCharts(dateFrom, dateTo)}
                  disabled={isLoading || !dateFrom || !dateTo || dateFrom > dateTo}
                  className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500 lg:self-end"
                >
                  {isLoading ? "Odswiezanie..." : "Odswiez"}
                </button>
              </div>
            </div>

            <div className="relative max-w-sm">
              <button
                type="button"
                onClick={() => setIsSymbolSelectorOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <span>
                  Symbole ({selectedSymbols.length}/{availableSymbols.length})
                </span>
                <span className="text-zinc-500">
                  {isSymbolSelectorOpen ? "Ukryj" : "Pokaz"}
                </span>
              </button>

              {isSymbolSelectorOpen ? (
                <div className="absolute z-10 mt-2 w-full rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                  {availableSymbols.length === 0 ? (
                    <p className="text-sm text-zinc-500">Brak symboli w wybranym zakresie.</p>
                  ) : (
                    <div className="max-h-64 space-y-3 overflow-y-auto">
                      {availableSymbols.map((symbol) => (
                        <label
                          key={symbol}
                          className="flex items-center gap-3 rounded-2xl border border-zinc-100 px-3 py-2 text-sm text-zinc-700"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSymbols.includes(symbol)}
                            onChange={() => handleSymbolToggle(symbol)}
                            className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-400"
                          />
                          <span>{symbol}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {dateFrom > dateTo ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Data poczatkowa nie moze byc pozniejsza niz data koncowa.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_340px]">
              <div className="rounded-[28px] border border-zinc-200 bg-zinc-50/80 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
                      Skumulowany wynik
                    </p>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {filteredTransactions.length} transakcji
                  </p>
                </div>

                <div className="mt-6 overflow-x-auto">
                  {isLoading ? (
                    <div className="flex h-80 items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/70 text-sm text-zinc-500">
                      Ladowanie wykresu...
                    </div>
                  ) : chartMetrics ? (
                    <svg
                      viewBox={`0 0 ${chartMetrics.width} ${chartMetrics.height}`}
                      className="min-w-180"
                    >
                      {chartMetrics.yTicks.map((tick) => (
                        <g key={tick.y}>
                          <line
                            x1={chartMetrics.padding.left}
                            x2={chartMetrics.width - chartMetrics.padding.right}
                            y1={tick.y}
                            y2={tick.y}
                            stroke="#e4e4e7"
                            strokeDasharray="4 6"
                          />
                          <text
                            x={chartMetrics.padding.left - 12}
                            y={tick.y + 4}
                            textAnchor="end"
                            className="fill-zinc-500 text-[11px]"
                          >
                            {formatMoney(tick.value)}
                          </text>
                        </g>
                      ))}

                      <line
                        x1={chartMetrics.padding.left}
                        x2={chartMetrics.width - chartMetrics.padding.right}
                        y1={chartMetrics.zeroLineY}
                        y2={chartMetrics.zeroLineY}
                        stroke="#18181b"
                        strokeWidth="1.5"
                      />

                      <path
                        d={chartMetrics.path}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />

                      {chartMetrics.points.map((point) => (
                        <g key={`${point.x}-${point.label}-${point.tradeValue}`}>
                          <circle
                            cx={point.chartX}
                            cy={point.chartY}
                            r="4"
                            fill="#ffffff"
                            stroke="#0ea5e9"
                            strokeWidth="2.5"
                          />
                          <title>
                            {point.isStart
                              ? `Start | ${point.label} | ${formatMoney(point.y)}`
                              : `${point.symbols.join(", ") || "Brak"} | ${point.label} | ${formatMoney(point.tradeValue)} | suma ${formatMoney(point.y)}`}
                          </title>
                        </g>
                      ))}

                      {chartMetrics.xTicks.map((tick) => (
                        <g key={`${tick.x}-${tick.label}`}>
                          <line
                            x1={tick.chartX}
                            x2={tick.chartX}
                            y1={chartMetrics.height - chartMetrics.padding.bottom}
                            y2={chartMetrics.height - chartMetrics.padding.bottom + 8}
                            stroke="#71717a"
                          />
                          <text
                            x={tick.chartX}
                            y={chartMetrics.height - 20}
                            textAnchor="middle"
                            className="fill-zinc-500 text-[11px]"
                          >
                            {tick.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  ) : (
                    <div className="flex h-80 items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/70 text-sm text-zinc-500">
                      Brak transakcji dla wybranych filtrow.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 self-start">
                <PieChartCard
                  label="Pozycje dlugie"
                  stats={filteredPieStats.buy}
                  accentClassName="text-sky-700"
                  strokeColor="#0ea5e9"
                />
                <PieChartCard
                  label="Pozycje krotkie"
                  stats={filteredPieStats.sell}
                  accentClassName="text-orange-700"
                  strokeColor="#f97316"
                />
                <PieChartCard
                  label="Razem"
                  stats={filteredPieStats.overall}
                  accentClassName="text-zinc-950"
                  strokeColor="#18181b"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
