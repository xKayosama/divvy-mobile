import { api } from "@/services/api";
import type {
    CreateExpenseRequest,
    CreateExpenseResponse,
    ExpensesResponse,
    GetExpensesRequest,
} from "./types";

export const expensesApi = api
  .enhanceEndpoints({
    addTagTypes: ["Expenses", "Dashboard"],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getGroupExpenses: builder.query<
        ExpensesResponse,
        GetExpensesRequest
      >({
        query: ({ groupId, page = 1, limit = 10 }) => ({
          url: `/groups/${encodeURIComponent(groupId)}/expenses`,
          params: { page, limit },
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
} = expensesApi;