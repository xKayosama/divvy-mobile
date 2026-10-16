export type BillCategory =
  | "RENT"
  | "ELECTRICITY"
  | "WATER"
  | "INTERNET"
  | "PHONE"
  | "SUBSCRIPTION"
  | "INSURANCE"
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
  data: { bill: Bill };
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
  recurrenceSourceId?: string | null;
  occurrenceNumber?: number;
  generatedThrough?: number;
  createdAt: string;
  updatedAt: string;
};

export type GetBillsRequest = {
  groupId: string;
  page?: number;
  limit?: number;
  status?: BillStatus;
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
