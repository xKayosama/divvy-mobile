import { updateUser, type AuthState } from "./authSlice";
import { api } from "@/services/api";
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  RegisterRequest,
  User,
} from "./types";
export type DeletionPreview = { success: true; data: { planHash: string; groups: { id: string; name: string; deleted: boolean; action: "TRANSFER" | "DELETE"; successor: { id: string; firstName: string; lastName: string } | null }[] } };
export const authApi = api.enhanceEndpoints({ addTagTypes: ["Profile", "Groups", "Dashboard", "Expenses", "Settlements", "Activity"] }).injectEndpoints({
  endpoints: (builder) => ({
    updateProfile: builder.mutation<MeResponse, { firstName: string; lastName: string }>({
      query: body => ({ url: "/auth/me", method: "PATCH", body }),
      invalidatesTags: (_result, error) => error ? [] : ["Profile", "Groups", "Dashboard", "Expenses", "Settlements", "Activity"],
      async onQueryStarted(_body, { dispatch, queryFulfilled, getState }) {
        const token = (getState() as unknown as { auth: AuthState }).auth.token;
        try {
          const { data } = await queryFulfilled;
          if (token === (getState() as unknown as { auth: AuthState }).auth.token) dispatch(updateUser(data.data.user));
        } catch { /* Keep the existing profile on failure. */ }
      },
    }),
    requestEmailChange: builder.mutation<{ success: true; message: string }, { email: string; password: string }>({
      query: body => ({ url: "/auth/email-change", method: "POST", body }),
    }),
    confirmEmailChange: builder.mutation<LoginResponse, { email: string; code: string }>({
      query: body => ({ url: "/auth/email-change/confirm", method: "POST", body }),
    }),
    getDeletionPreview: builder.query<DeletionPreview, void>({ query: () => "/auth/deletion-preview", providesTags: ["Groups"] }),
    deleteAccount: builder.mutation<{ success: true; message: string }, { password: string; confirmation: string; planHash: string }>({
      query: body => ({ url: "/auth/me", method: "DELETE", body }),
    }),
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    register: builder.mutation<
      { success: true; data: { user: Omit<User, "role"> } },
      RegisterRequest
    >({ query: (body) => ({ url: "/auth/register", method: "POST", body }) }),
    requestPasswordReset: builder.mutation<{ success: true; message: string }, { email: string }>({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
    }),
    resetPassword: builder.mutation<{ success: true; message: string }, { email: string; code: string; password: string }>({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
    }),
    me: builder.query<MeResponse, void>({ query: () => "/auth/me", providesTags: ["Profile"] }),
    logout: builder.mutation<{ success: true }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
  }),
});
export const { useLoginMutation, useRegisterMutation, useLogoutMutation, useRequestPasswordResetMutation, useResetPasswordMutation, useUpdateProfileMutation, useRequestEmailChangeMutation, useConfirmEmailChangeMutation, useGetDeletionPreviewQuery, useDeleteAccountMutation } =
  authApi;
