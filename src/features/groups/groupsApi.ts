import type { GroupCurrency } from "./currencies";
import type { GroupIcon } from "./groupIcons";
import { api } from "@/services/api";
import type {
  CreateGroupRequest,
  CreateGroupResponse,
  GroupMembersResponse,
  GroupsResponse,
  GroupDetailsResponse,
  AddGroupMemberResponse,
} from "./types";

export const groupsApi = api
  .enhanceEndpoints({ addTagTypes: ["Groups", "Dashboard"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getGroupDetails: builder.query<GroupDetailsResponse, string>({
        query: (groupId) => `/groups/${encodeURIComponent(groupId)}`,
        providesTags: ["Groups"],
      }),
      renameGroup: builder.mutation<
        CreateGroupResponse,
        { groupId: string; name: string; icon?: GroupIcon; currency?: GroupCurrency }
      >({
        query: ({ groupId, name, icon, currency }) => ({
          url: `/groups/${encodeURIComponent(groupId)}`,
          method: "PUT",
          body: { name: name.trim(), ...(icon !== undefined ? { icon } : {}), ...(currency !== undefined ? { currency } : {}) },
        }),
        invalidatesTags: (_result, error, { groupId, currency }) => error ? [] : ["Groups", ...(currency !== undefined ? [{ type: "Dashboard" as const, id: groupId }] : [])],
      }),
      removeGroupMember: builder.mutation<
        { success: true; message: string },
        { groupId: string; userId: string }
      >({
        query: ({ groupId, userId }) => ({
          url: `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
          method: "DELETE",
        }),
        invalidatesTags: (_result, error, { groupId }) =>
          error ? [] : ["Groups", { type: "Dashboard", id: groupId }],
      }),
      addGroupMember: builder.mutation<
        AddGroupMemberResponse,
        { groupId: string; email: string }
      >({
        query: ({ groupId, email }) => ({
          url: `/groups/${encodeURIComponent(groupId)}/members`,
          method: "POST",
          body: { email: email.trim().toLowerCase() },
        }),
        invalidatesTags: (_result, error, { groupId }) =>
          error ? [] : ["Groups", { type: "Dashboard", id: groupId }],
      }),
      getMyGroups: builder.query<GroupsResponse, void>({
        query: () => "/groups",
        providesTags: ["Groups"],
      }),

      createGroup: builder.mutation<CreateGroupResponse, CreateGroupRequest>({
        query: (body) => ({
          url: "/groups",
          method: "POST",
          body,
        }),
        invalidatesTags: ["Groups"],
      }),

      getGroupMembers: builder.query<GroupMembersResponse, string>({
        query: (groupId) => `/groups/${encodeURIComponent(groupId)}/members`,
        providesTags: ["Groups"],
      }),
    }),
  });

export const {
  useGetMyGroupsQuery,
  useGetGroupDetailsQuery,
  useCreateGroupMutation,
  useGetGroupMembersQuery,
  useAddGroupMemberMutation,
  useRenameGroupMutation,
  useRemoveGroupMemberMutation,
} = groupsApi;
