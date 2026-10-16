import type { ExpenseCategory, GetExpensesRequest } from "./types";

export const expenseCategories: ExpenseCategory[] = [
  "GROCERIES",
  "FOOD",
  "RENT",
  "UTILITIES",
  "INTERNET",
  "TRANSPORTATION",
  "HEALTHCARE",
  "ENTERTAINMENT",
  "SHOPPING",
  "OTHERS",
];

export type ExpenseFilters = Pick<
  GetExpensesRequest,
  "category" | "startDate" | "endDate"
>;

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function validateExpenseFilters(filters: ExpenseFilters): string {
  if (filters.startDate && !validDate(filters.startDate))
    return "Enter a valid start date in YYYY-MM-DD format.";
  if (filters.endDate && !validDate(filters.endDate))
    return "Enter a valid end date in YYYY-MM-DD format.";
  if (
    filters.startDate &&
    filters.endDate &&
    filters.startDate > filters.endDate
  )
    return "End date must be on or after start date.";
  return "";
}


export function expenseFiltersFromParams(params: {
  category?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
}): ExpenseFilters {
  if (Object.values(params).some(value => Array.isArray(value))) return {};
  const { category, startDate, endDate } = params;
  if (category && !expenseCategories.includes(category as ExpenseCategory)) return {};
  const filters: ExpenseFilters = {
    category: (category || undefined) as ExpenseCategory | undefined,
    startDate: (startDate || undefined) as string | undefined,
    endDate: (endDate || undefined) as string | undefined,
  };
  return validateExpenseFilters(filters) ? {} : filters;
}
