import { api } from "@/services/api";
import type { ScanReceiptResponse } from "./types";

export const receiptsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    scanReceipt: builder.mutation<
      ScanReceiptResponse,
      { groupId: string; body: FormData }
    >({
      query: ({ groupId, body }) => ({
        url: `/groups/${encodeURIComponent(groupId)}/receipts/scan`,
        method: "POST",
        body,
        timeout: 75000,
      }),
    }),
  }),
});
export const { useScanReceiptMutation } = receiptsApi;
