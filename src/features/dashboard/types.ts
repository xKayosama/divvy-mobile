export type MemberBalance = {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  paid: number;
  owed: number;
  net: number;
};

export type UpcomingBill = {
  _id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  isRecurring: boolean;
  recurrence: "WEEKLY" | "MONTHLY" | "YEARLY" | null;
};

export type DashboardSummaryResponse = {
  code: number;
  success: true;
  message: string;
  data: {
    summary: {
      totalExpenses: number;
      totalPaid: number;
      totalOwed: number;
    };
    bills: {
      total: number;
      pending: number;
      overdue: number;
      paid: number;
      pendingAmount: number;
      overdueAmount: number;
      paidAmount: number;
    };
    balances: MemberBalance[];
    upcomingBills: UpcomingBill[];
  };
};