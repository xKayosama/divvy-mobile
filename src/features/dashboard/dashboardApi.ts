import { api } from "@/services/api";
import type { DashboardRequest, DashboardSummaryResponse } from "./types";

export const dashboardApi = api
  .enhanceEndpoints({ addTagTypes: ["Dashboard"] })
  .injectEndpoints({
    overrideExisting: typeof __DEV__ !== "undefined" && __DEV__,
    endpoints: (builder) => ({
      getGroupDashboard: builder.query<
        DashboardSummaryResponse,
        string | DashboardRequest
      >({
        query: (request) => {
          if (typeof request === "string") return `/groups/${encodeURIComponent(request)}/dashboard`;
          const { groupId, period = "all_time" } = request;
          return { url: `/groups/${encodeURIComponent(groupId)}/dashboard`, params: { period } };
        },
        providesTags: (_result, _error, request) => [
          { type: "Dashboard", id: typeof request === "string" ? request : request.groupId },
        ],
      }),
    }),
  });

export const { useGetGroupDashboardQuery } = dashboardApi;