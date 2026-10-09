import { api } from "@/services/api";
import type { DashboardSummaryResponse } from "./types";

export const dashboardApi = api
  .enhanceEndpoints({ addTagTypes: ["Dashboard"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getGroupDashboard: builder.query<
        DashboardSummaryResponse,
        string
      >({
        query: (groupId) =>
          `/groups/${encodeURIComponent(groupId)}/dashboard`,
        providesTags: (_result, _error, groupId) => [
          { type: "Dashboard", id: groupId },
        ],
      }),
    }),
  });

export const { useGetGroupDashboardQuery } = dashboardApi;