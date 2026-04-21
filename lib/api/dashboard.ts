import { apiRequest } from "./client";

export type DashboardChartStats = {
  winCount: number;
  totalCount: number;
  winRatio: number;
};

export type DashboardChartTransaction = {
  closeTime: string;
  symbol: string;
  type: string;
  grossPL: number;
};

export type DashboardChartsResponse = {
  buy: DashboardChartStats;
  sell: DashboardChartStats;
  overall: DashboardChartStats;
  symbols: string[];
  transactions: DashboardChartTransaction[];
};

export type DashboardChartsRequest = {
  dateFrom: string;
  dateTo: string;
};

type DashboardChartsApiResponse = {
  buy?: Partial<DashboardChartStats>;
  sell?: Partial<DashboardChartStats>;
  overall?: Partial<DashboardChartStats>;
  symbols?: Array<string | null>;
  transactions?: Array<{
    closeTime?: string | null;
    symbol?: string | null;
    type?: string | null;
    grossPL?: number | string | null;
    grossPl?: number | string | null;
  }>;
};

export function getDashboardCharts(
  accessToken: string,
  payload: DashboardChartsRequest
) {
  return apiRequest<DashboardChartsApiResponse>("/api/dashboard/charts", {
    method: "POST",
    accessToken,
    body: payload,
  }).then((response) => ({
    buy: normalizeStats(response.buy),
    sell: normalizeStats(response.sell),
    overall: normalizeStats(response.overall),
    symbols: (response.symbols ?? [])
      .map((symbol) => symbol?.trim() || "")
      .filter((symbol): symbol is string => symbol.length > 0),
    transactions: (response.transactions ?? [])
      .map((transaction) => {
        const closeTime = transaction.closeTime ?? "";
        const grossPL = toNumber(transaction.grossPL ?? transaction.grossPl);

        if (!closeTime || !Number.isFinite(Date.parse(closeTime)) || !Number.isFinite(grossPL)) {
          return null;
        }

        return {
          closeTime,
          symbol: transaction.symbol?.trim() || "N/A",
          type: transaction.type?.trim() || "",
          grossPL,
        };
      })
      .filter((transaction): transaction is DashboardChartTransaction => transaction !== null),
  }));
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value.replace(",", ".").trim());
  }

  return Number.NaN;
}

function normalizeStats(stats?: Partial<DashboardChartStats>): DashboardChartStats {
  return {
    winCount: Number(stats?.winCount ?? 0),
    totalCount: Number(stats?.totalCount ?? 0),
    winRatio: Number(stats?.winRatio ?? 0),
  };
}
