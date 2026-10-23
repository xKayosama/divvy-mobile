import { api } from "@/services/api";
import type { ActivityResponse } from "./types";
export const activityApi = api
  .enhanceEndpoints({ addTagTypes: ["Activity"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getGroupActivity: builder.query<
        ActivityResponse,
        { groupId: string; page: number }
      >({
        query: ({ groupId, page }) =>
          `/groups/${encodeURIComponent(groupId)}/activity?page=${page}&limit=20`,
        providesTags: ["Activity"],
      }),
    }),
  });
export const { useGetGroupActivityQuery } = activityApi;
