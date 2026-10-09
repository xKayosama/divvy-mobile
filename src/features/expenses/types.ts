export type ExpenseUser = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
};

export type ExpenseCategory =
  | "FOOD"
  | "RENT"
  | "UTILITIES"
  | "INTERNET"
  | "TRANSPORTATION"
  | "GROCERIES"
  | "HEALTHCARE"
  | "ENTERTAINMENT"
  | "SHOPPING"
  | "OTHERS";

export type Expense = {
  _id: string;
  groupId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: ExpenseUser | null;
  splitType: "EQUAL" | "EXACT" | "PERCENTAGE";
  participants: {
    userId: ExpenseUser | null;
    amount: number;
    percentage: number | null;
  }[];
  date: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpensesResponse = {
  code: number;
  success: true;
  message: string;
  data: {
    expenses: Expense[];
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

export type GetExpensesRequest = {
  groupId: string;
  page?: number;
  limit?: number;
};

type ExpenseFields = {
  description: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string;
  date?: string;
  notes?: string;
};

export type CreateExpenseRequest = ExpenseFields &
  (
    | {
        splitType: "EQUAL";
        participants: { userId: string }[];
      }
    | {
        splitType: "EXACT";
        participants: { userId: string; amount: number }[];
      }
    | {
        splitType: "PERCENTAGE";
        participants: { userId: string; percentage: number }[];
      }
  );

export type CreateExpenseResponse = {
  code: number;
  success: true;
  message: string;
  data: {
    expense: Expense;
  };
};