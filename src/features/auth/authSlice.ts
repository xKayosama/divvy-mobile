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
    updateUser: (state, action: PayloadAction<NonNullable<AuthState["user"]>>) => {
      if (state.user?.id === action.payload.id) state.user = action.payload;
    },
  },
});
export const { setSession, clearSession, updateUser } = slice.actions;
export default slice.reducer;
