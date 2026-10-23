export type BillPaymentSplit = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";
export type BillPaymentRequest =
  | { resume: true }
  | ({ paidBy: string } & (
      | { splitType: "EQUAL"; participants: { userId: string }[] }
      | {
          splitType: "EXACT";
          participants: { userId: string; amount: number }[];
        }
      | {
          splitType: "PERCENTAGE";
          participants: { userId: string; percentage: number }[];
        }
      | {
          splitType: "SHARES";
          participants: { userId: string; shares: number }[];
        }
    ));
export type BillSort =
  "due_soonest" | "due_latest" | "amount_high" | "amount_low";

export type BillCategory =
  | "RENT"
  | "ELECTRICITY"
  | "WATER"
  | "INTERNET"
  | "PHONE"
  | "SUBSCRIPTION"
  | "INSURANCE"
  | "GAS"
  | "ASSOCIATION_DUES"
  | "EDUCATION"
  | "CHILDCARE"
  | "LOAN"
  | "CREDIT_CARD"
  | "PROPERTY_TAX"
  | "MAINTENANCE"
  | "OTHER";

export type BillStatus = "PENDING" | "PAID" | "OVERDUE";

export type BillRecurrence = "WEEKLY" | "MONTHLY" | "YEARLY";

export type CreateBillRequest = {
  name: string;
  amount: number;
  category: BillCategory;
  dueDate: string;
  notes: string;
} & (
  | { isRecurring: false; recurrence?: null }
  | { isRecurring: true; recurrence: BillRecurrence }
);

export type BillResponse = {
  code: number;
  success: true;
  message: string;
  data: { bill: Bill; expense?: { _id: string; billId: string } };
};

export type Bill = {
  _id: string;
  groupId: string;
  name: string;
  amount: number;
  category: BillCategory;
  dueDate: string;
  status: BillStatus;
  notes: string;
  isRecurring: boolean;
  recurrence: BillRecurrence | null;
  paidBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  } | null;
  expenseId?: string | null;
  paymentPending?: boolean;
  paidAt?: string | null;
  recurrenceSourceId?: string | null;
  occurrenceNumber?: number;
  generatedThrough?: number;
  createdAt: string;
  updatedAt: string;
};

export type GetBillsRequest = {
  view?: "upcoming" | "history";
  groupId: string;
  page?: number;
  limit?: number;
  status?: BillStatus;
  category?: BillCategory;
  search?: string;
  sort?: BillSort;
  isRecurring?: boolean;
};

export type BillsResponse = {
  code: number;
  success: true;
  message: string;
  data: {
    bills: Bill[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
