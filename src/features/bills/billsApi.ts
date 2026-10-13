import { api } from "@/services/api";
import type { BillsResponse, GetBillsRequest } from "./types";

export const billsApi = api
  .enhanceEndpoints({
    addTagTypes: ["Bills"],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getGroupBills: builder.query<BillsResponse, GetBillsRequest>({
        query: ({ groupId, page = 1, limit = 10, status }) => ({
          url: `/groups/${encodeURIComponent(groupId)}/bills`,
          params: {
            page,
            limit,
            ...(status ? { status } : {}),
          },
        }),
        providesTags: (_result, _error, { groupId }) => [
          { type: "Bills", id: groupId },
        ],
      }),
    }),
  });

export const { useGetGroupBillsQuery } = billsApi;