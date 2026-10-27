import { api } from "@/services/api";
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  RegisterRequest,
  User,
} from "./types";
export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
    me: builder.query<MeResponse, void>({ query: () => "/auth/me" }),
    logout: builder.mutation<{ success: true }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
  }),
});
export const { useLoginMutation, useRegisterMutation, useLogoutMutation, useRequestPasswordResetMutation, useResetPasswordMutation } =
  authApi;
