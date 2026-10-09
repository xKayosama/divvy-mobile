import { api } from "@/services/api";
import type {
  CreateGroupRequest,
  CreateGroupResponse,
  GroupMembersResponse,
  GroupsResponse,
} from "./types";

export const groupsApi = api
  .enhanceEndpoints({ addTagTypes: ["Groups"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getMyGroups: builder.query<GroupsResponse, void>({
        query: () => "/groups",
        providesTags: ["Groups"],
      }),

      createGroup: builder.mutation<
        CreateGroupResponse,
        CreateGroupRequest
      >({
        query: (body) => ({
          url: "/groups",
          method: "POST",
          body,
        }),
        invalidatesTags: ["Groups"],
      }),

      getGroupMembers: builder.query<GroupMembersResponse, string>({
        query: (groupId) =>
          `/groups/${encodeURIComponent(groupId)}/members`,
        providesTags: ["Groups"],
      }),
    }),
  });

export const {
  useGetMyGroupsQuery,
  useCreateGroupMutation,
  useGetGroupMembersQuery,
} = groupsApi;