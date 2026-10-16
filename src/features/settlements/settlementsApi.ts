import { api } from "@/services/api";
import type {
  SuggestionsResponse,
  SettlementHistoryResponse,
  RecordPaymentRequest,
  RecordPaymentResponse,
} from "./types";

export const settlementsApi = api
  .enhanceEndpoints({ addTagTypes: ["Settlements", "Dashboard"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getSettlementSuggestions: builder.query<SuggestionsResponse, string>({
        query: (groupId) =>
          `/groups/${encodeURIComponent(groupId)}/settlements`,
        // Expense and membership mutations invalidate Dashboard, keeping suggestions current too.
        providesTags: (_result, _error, groupId) => [
          { type: "Dashboard", id: groupId },
        ],
      }),
      getSettlementHistory: builder.query<
        SettlementHistoryResponse,
        { groupId: string; page?: number }
      >({
        query: ({ groupId, page = 1 }) => ({
          url: `/groups/${encodeURIComponent(groupId)}/settlements/history`,
          params: { page, limit: 10 },
        }),
        providesTags: (_result, _error, { groupId }) => [
          { type: "Settlements", id: groupId },
        ],
      }),
      recordSettlement: builder.mutation<
        RecordPaymentResponse,
        { groupId: string; body: RecordPaymentRequest }
      >({
        query: ({ groupId, body }) => ({
          url: `/groups/${encodeURIComponent(groupId)}/settlements`,
          method: "POST",
          body,
        }),
        invalidatesTags: (_result, error, { groupId }) =>
          error && error.status !== 409
            ? []
            : [
                { type: "Settlements", id: groupId },
                { type: "Dashboard", id: groupId },
              ],
      }),
    }),
  });
export const {
  useGetSettlementSuggestionsQuery,
  useGetSettlementHistoryQuery,
  useRecordSettlementMutation,
} = settlementsApi;
