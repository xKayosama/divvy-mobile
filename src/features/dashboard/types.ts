export type DashboardPeriod = "all_time" | "this_month" | "last_month";
export type DashboardRequest = { groupId: string; period?: DashboardPeriod };

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
  settlementPaid?: number;
  settlementReceived?: number;
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

export type BillReminderGroup = {
  count: number;
  amount: number;
  bills: UpcomingBill[];
};

export type BillReminders = {
  asOf: string;
  timeZone: "UTC";
  windowDays: 7;
  overdue: BillReminderGroup;
  dueToday: BillReminderGroup;
  dueSoon: BillReminderGroup;
};

export type DashboardSummaryResponse = {
  code: number;
  success: true;
  message: string;
  data: {
    period?: {
      value: DashboardPeriod;
      timeZone: "UTC";
      startDate: string | null;
      endDate: string | null;
    };
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
    billReminders?: BillReminders;
  };
};
