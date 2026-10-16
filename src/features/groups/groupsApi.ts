import { api } from "@/services/api";
import type {
  CreateGroupRequest,
  CreateGroupResponse,
  GroupMembersResponse,
  GroupsResponse,
  AddGroupMemberResponse,
} from "./types";

export const groupsApi = api
  .enhanceEndpoints({ addTagTypes: ["Groups", "Dashboard"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      renameGroup: builder.mutation<
        CreateGroupResponse,
        { groupId: string; name: string }
      >({
        query: ({ groupId, name }) => ({
          url: `/groups/${encodeURIComponent(groupId)}`,
          method: "PUT",
          body: { name: name.trim() },
        }),
        invalidatesTags: (_result, error) => (error ? [] : ["Groups"]),
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
  useCreateGroupMutation,
  useGetGroupMembersQuery,
  useAddGroupMemberMutation,
  useRenameGroupMutation,
  useRemoveGroupMemberMutation,
} = groupsApi;
