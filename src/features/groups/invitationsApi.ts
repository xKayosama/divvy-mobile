import { api } from "@/services/api";

export type Invitation = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  group: { id: string; name: string; currency: string; icon: string };
};
type ListResponse = { success: true; data: { invitations: Invitation[] } };
type Response = { success: true; message: string; data: { invitation: Invitation } };
type Answer = { id: string; createdAt: string };
const refresh = ["Invitations", "Groups", "Dashboard", "Activity"] as const;
export const invitationsApi = api.enhanceEndpoints({ addTagTypes: [...refresh] }).injectEndpoints({
  endpoints: (builder) => ({
    getInvitations: builder.query<ListResponse, void>({
      query: () => "/invitations", providesTags: ["Invitations"],
    }),
    getGroupInvitations: builder.query<ListResponse, string>({
      query: (groupId) => `/groups/${encodeURIComponent(groupId)}/invitations`, providesTags: ["Invitations"],
    }),
    createInvitation: builder.mutation<Response & { data: { invitation: Invitation; code: string } }, { groupId: string; email: string }>({
      query: ({ groupId, email }) => ({ url: `/groups/${encodeURIComponent(groupId)}/invitations`, method: "POST", body: { email: email.trim().toLowerCase() } }),
      invalidatesTags: (_result, error) => error ? [] : ["Invitations"],
    }),
    lookupInvitation: builder.mutation<Response, string>({
      query: (code) => ({ url: "/invitations/lookup", method: "POST", body: { code: code.trim().toLowerCase() } }),
    }),
    acceptInvitation: builder.mutation<Response, Answer & { code: string }>({
      query: ({ id, createdAt, code }) => ({ url: `/invitations/${encodeURIComponent(id)}/accept`, method: "POST", body: { createdAt, code: code.trim().toLowerCase() } }),
      invalidatesTags: (_result, error) => error ? ["Invitations"] : [...refresh],
    }),
    declineInvitation: builder.mutation<Response, Answer>({
      query: ({ id, createdAt }) => ({ url: `/invitations/${encodeURIComponent(id)}/decline`, method: "POST", body: { createdAt } }),
      invalidatesTags: ["Invitations"],
    }),
    revokeInvitation: builder.mutation<{ success: true; message: string }, Answer & { groupId: string }>({
      query: ({ groupId, id, createdAt }) => ({ url: `/groups/${encodeURIComponent(groupId)}/invitations/${encodeURIComponent(id)}/revoke`, method: "POST", body: { createdAt } }),
      invalidatesTags: ["Invitations"],
    }),
  }),
});
export const { useGetInvitationsQuery, useGetGroupInvitationsQuery, useCreateInvitationMutation, useLookupInvitationMutation, useAcceptInvitationMutation, useDeclineInvitationMutation, useRevokeInvitationMutation } = invitationsApi;
