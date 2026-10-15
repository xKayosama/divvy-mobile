import { api } from "@/services/api";
import type {
  CreateExpenseRequest,
  CreateExpenseResponse,
  ExpensesResponse,
  GetExpensesRequest,
  ExpenseResponse,
  DeleteExpenseResponse,
} from "./types";

export const expensesApi = api
  .enhanceEndpoints({
    addTagTypes: ["Expenses", "Dashboard"],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getExpense: builder.query<ExpenseResponse, string>({
        query: (expenseId) => `/expenses/${encodeURIComponent(expenseId)}`,
        providesTags: (_result, _error, expenseId) => [
          { type: "Expenses", id: `expense:${expenseId}` },
        ],
      }),
      updateExpense: builder.mutation<
        ExpenseResponse,
        { groupId: string; expenseId: string; body: CreateExpenseRequest }
      >({
        query: ({ expenseId, body }) => ({
          url: `/expenses/${encodeURIComponent(expenseId)}`,
          method: "PUT",
          body,
        }),
        invalidatesTags: (_result, error, { groupId, expenseId }) =>
          error
            ? []
            : [
                { type: "Expenses", id: groupId },
                { type: "Expenses", id: `expense:${expenseId}` },
                { type: "Dashboard", id: groupId },
              ],
      }),
      deleteExpense: builder.mutation<
        DeleteExpenseResponse,
        { groupId: string; expenseId: string }
      >({
        query: ({ expenseId }) => ({
          url: `/expenses/${encodeURIComponent(expenseId)}`,
          method: "DELETE",
        }),
        invalidatesTags: (_result, error, { groupId, expenseId }) =>
          error
            ? []
            : [
                { type: "Expenses", id: groupId },
                { type: "Expenses", id: `expense:${expenseId}` },
                { type: "Dashboard", id: groupId },
              ],
      }),
      getGroupExpenses: builder.query<ExpensesResponse, GetExpensesRequest>({
        query: ({
          groupId,
          page = 1,
          limit = 10,
          category,
          startDate,
          endDate,
        }) => ({
          url: `/groups/${encodeURIComponent(groupId)}/expenses`,
          params: { page, limit, category, startDate, endDate },
        }),
        providesTags: (_result, _error, { groupId }) => [
          { type: "Expenses", id: groupId },
        ],
      }),

      createExpense: builder.mutation<
        CreateExpenseResponse,
        { groupId: string; body: CreateExpenseRequest }
      >({
        query: ({ groupId, body }) => ({
          url: `/groups/${encodeURIComponent(groupId)}/expenses`,
          method: "POST",
          body,
        }),
        invalidatesTags: (_result, error, { groupId }) =>
          error
            ? []
            : [
                { type: "Expenses", id: groupId },
                { type: "Dashboard", id: groupId },
              ],
      }),
    }),
  });

export const {
  useGetGroupExpensesQuery,
  useCreateExpenseMutation,
  useGetExpenseQuery,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} = expensesApi;
