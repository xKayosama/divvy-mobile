import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { clearSession, type AuthState } from "@/features/auth/authSlice";
import { writeToken } from "@/features/auth/sessionStorage";
const rawQuery = fetchBaseQuery({
  baseUrl: process.env.EXPO_PUBLIC_API_URL?.trim(),
  timeout: 15000,
  prepareHeaders: (headers, { getState }) => {
    const { token } = (getState() as { auth: AuthState }).auth;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});
export const api = createApi({
  reducerPath: "api",
  baseQuery: async (args, queryApi, extraOptions) => {
    if (!process.env.EXPO_PUBLIC_API_URL?.trim())
      return {
        error: {
          status: "CUSTOM_ERROR" as const,
          error: "API URL missing",
          data: {
            message:
              "The API URL is missing. Configure it and restart the app.",
          },
        },
      };
    const token = (queryApi.getState() as { auth: AuthState }).auth.token;
    const result = await rawQuery(args, queryApi, extraOptions);
    if (
      result.error?.status === 401 &&
      token &&
      token === (queryApi.getState() as { auth: AuthState }).auth.token
    ) {
      // Invalidate in-memory credentials even if device storage is unavailable.
      try {
        await writeToken(null);
      } catch {
        /* A stale saved token is rejected again on restoration. */
      }
      if (token === (queryApi.getState() as { auth: AuthState }).auth.token)
        queryApi.dispatch(clearSession());
    }
    return result;
  },
  endpoints: () => ({}),
});
