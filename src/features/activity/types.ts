export type ActivityAction =
  | "EXPENSE_ADDED"
  | "EXPENSE_EDITED"
  | "EXPENSE_DELETED"
  | "BILL_PAID"
  | "GROUP_UPDATED";
export interface GroupActivity {
  _id: string;
  actor: { _id: string; firstName?: string; lastName?: string } | null;
  action: ActivityAction;
  targetId: string;
  label: string;
  occurredAt: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  snapshot?: Record<string, unknown> & {
    automatic?: boolean;
    amount?: number;
    currency?: string;
    paidBy?: string;
    splitType?: string;
    expenseId?: string;
  };
}
export interface ActivityResponse {
  success: true;
  data: {
    activities: GroupActivity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
