import type { ExpenseUser } from "@/features/expenses/types";
export type SettlementSuggestion = {
  from: ExpenseUser;
  to: ExpenseUser;
  amount: number;
};
export type SettlementPayment = {
  _id: string;
  groupId: string;
  from: ExpenseUser | null;
  to: ExpenseUser | null;
  recordedBy: ExpenseUser | null;
  amount: number;
  paidAt: string;
  createdAt: string;
};
export type SuggestionsResponse = {
  success: true;
  data: { settlements: SettlementSuggestion[] };
};
export type SettlementHistoryResponse = {
  success: true;
  data: { settlements: SettlementPayment[] };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
export type RecordPaymentRequest = {
  requestId?: string;
  to: string;
  amount: number;
  paidAt: string;
};
export type RecordPaymentResponse = {
  success: true;
  message: string;
  data: {
    settlement: {
      _id: string;
      groupId: string;
      from: string;
      to: string;
      recordedBy: string;
      amount: number;
      paidAt: string;
    };
  };
};
