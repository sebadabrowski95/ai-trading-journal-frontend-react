import { apiRequest } from "./client";

export type TransactionsCalendarDay = {
  date: string;
  grossPl: number;
  tradeCount: number;
};

export type TransactionsCalendarWeek = {
  weekStart: string;
  weekEnd: string;
  grossPl: number;
  tradeCount: number;
};

export type TransactionsCalendarSummary = {
  grossPl: number;
  tradeCount: number;
};

export type TransactionType = "BUY" | "SELL" | string;

export type TransactionResponse = {
  id: number;
  position: string;
  symbol: string;
  type: TransactionType;
  volume: number;
  openTime: string;
  openPrice: number;
  closeTime: string | null;
  closePrice: number | null;
  sl: number | null;
  tp: number | null;
  margin: number | null;
  commission: number | null;
  swap: number | null;
  rollover: number | null;
  grossPl: number;
  comment: string | null;
};

export type TransactionsCalendarResponse = {
  year: number;
  month: number;
  days: TransactionsCalendarDay[];
  weeks: TransactionsCalendarWeek[];
  monthSummary: TransactionsCalendarSummary;
};

export type TransactionsDayResponse = {
  date: string;
  grossPl: number;
  tradeCount: number;
  transactions: TransactionResponse[];
};

export type CreateTransactionRequest = {
  position: string;
  symbol: string;
  type: string;
  volume: number;
  openTime: string;
  openPrice: number;
  closeTime?: string;
  closePrice?: number;
  sl?: number;
  tp?: number;
  margin?: number;
  commission?: number;
  swap?: number;
  rollover?: number;
  grossPl: number;
  comment?: string;
};

export type ImportTransactionsResponse = {
  importedCount: number;
  added: number;
  updated: number
};

export function getTransactionsCalendar(
  accessToken: string,
  year: number,
  month: number
) {
  return apiRequest<TransactionsCalendarResponse>(
    `/api/transactions/calendar?year=${year}&month=${month}`,
    { accessToken }
  );
}

export function getTransactionsDay(accessToken: string, date: string) {
  return apiRequest<TransactionsDayResponse>(
    `/api/transactions/day?date=${date}`,
    { accessToken }
  );
}

export function createTransaction(
  accessToken: string,
  payload: CreateTransactionRequest
) {
  return apiRequest<TransactionResponse>("/api/transactions", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function updateTransaction(accessToken: string, id: number, payload: CreateTransactionRequest) {
  return apiRequest<TransactionResponse>(`/api/transactions/${id}` , {
    method: "PUT",
    accessToken,
    body: payload,
  });
}

export function deleteTransaction(accessToken: string, id: number) {
  return apiRequest<void>(`/api/transactions/${id}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function importTransactions(accessToken: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/transactions/import", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = "Import request failed.";

    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) {
        message = data.message;
      }
    } catch {}

    throw new Error(message);
  }

  return (await response.json()) as ImportTransactionsResponse;
}
