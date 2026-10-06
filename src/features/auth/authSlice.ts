import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "./types";
export type AuthState = { token: string | null; user: User | null };
const initialState: AuthState = { token: null, user: null };
const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (_, action: PayloadAction<AuthState>) => action.payload,
    clearSession: () => initialState,
  },
});
export const { setSession, clearSession } = slice.actions;
export default slice.reducer;
