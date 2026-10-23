import { api } from "@/services/api";
import type {
  BillPaymentRequest,
  BillResponse,
  BillsResponse,
  CreateBillRequest,
  GetBillsRequest,
} from "./types";

export const billsApi = api
  .enhanceEndpoints({
    addTagTypes: ["Bills", "Dashboard", "Expenses"],
  })
  .injectEndpoints({
    // Replace stale query definitions when Metro reevaluates this module.
    overrideExisting: typeof __DEV__ !== "undefined" && __DEV__,
    endpoints: (builder) => ({
      updateBill: builder.mutation<
        BillResponse,
        { groupId: string; billId: string; body: CreateBillRequest }
      >({
        query: ({ billId, body }) => ({
          url: `/bills/${encodeURIComponent(billId)}`,
          method: "PUT",
          body,
        }),
        invalidatesTags: (_result, error, { groupId, billId }) =>
          error && error.status !== 409
            ? []
            : [
                { type: "Bills", id: groupId },
                { type: "Bills", id: `bill:${billId}` },
                { type: "Dashboard", id: groupId },
              ],
      }),
      deleteBill: builder.mutation<
        { success: true; code: number; message: string },
        { groupId: string; billId: string }
      >({
        query: ({ billId }) => ({
          url: `/bills/${encodeURIComponent(billId)}`,
          method: "DELETE",
        }),
        invalidatesTags: (_result, error, { groupId, billId }) =>
          error && error.status !== 409
            ? []
            : [
                { type: "Bills", id: groupId },
                { type: "Bills", id: `bill:${billId}` },
                { type: "Dashboard", id: groupId },
              ],
      }),
      getBill: builder.query<BillResponse, string>({
        query: (billId) => `/bills/${encodeURIComponent(billId)}`,
        providesTags: (_result, _error, billId) => [
          { type: "Bills", id: `bill:${billId}` },
        ],
      }),
      createBill: builder.mutation<
        BillResponse,
        { groupId: string; body: CreateBillRequest }
      >({
        query: ({ groupId, body }) => ({
          url: `/groups/${encodeURIComponent(groupId)}/bills`,
          method: "POST",
          body,
        }),
        invalidatesTags: (_result, error, { groupId }) =>
          error
            ? []
            : [
                { type: "Bills", id: groupId },
                { type: "Dashboard", id: groupId },
              ],
      }),
      markBillPaid: builder.mutation<
        BillResponse,
        { groupId: string; billId: string; body: BillPaymentRequest }
      >({
        query: ({ billId, body }) => ({
          url: `/bills/${encodeURIComponent(billId)}/pay`,
          method: "POST",
          body,
        }),
        invalidatesTags: (result, error, { groupId, billId }) =>
          error && error.status !== 409 && error.status !== 503
            ? []
            : [
                { type: "Bills", id: groupId },
                { type: "Bills", id: `bill:${billId}` },
                { type: "Dashboard", id: groupId },
                { type: "Expenses", id: groupId },
                ...(result?.data.expense
                  ? [
                      {
                        type: "Expenses" as const,
                        id: `expense:${result.data.expense._id}`,
                      },
                    ]
                  : []),
              ],
      }),
      getGroupBills: builder.query<BillsResponse, GetBillsRequest>({
        query: ({
          groupId,
          page = 1,
          limit = 10,
          status,
          view,
          category,
          search,
          isRecurring,
          sort,
        }) => ({
          url: `/groups/${encodeURIComponent(groupId)}/bills`,
          params: {
            page,
            limit,
            view: view ?? (status === "PAID" ? "history" : "upcoming"),
            ...(status ? { status } : {}),
            category,
            search,
            sort,
            isRecurring,
          },
        }),
        providesTags: (_result, _error, { groupId }) => [
          { type: "Bills", id: groupId },
        ],
      }),
    }),
  });

export const {
  useGetGroupBillsQuery,
  useGetBillQuery,
  useCreateBillMutation,
  useMarkBillPaidMutation,
  useUpdateBillMutation,
  useDeleteBillMutation,
} = billsApi;
