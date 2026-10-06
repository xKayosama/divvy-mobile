import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { api } from "@/services/api";
import { authApi } from "./authApi";
import { clearSession, setSession } from "./authSlice";
import { readToken, writeToken } from "./sessionStorage";
import { errorStatus } from "./errors";
import type { LoginResponse } from "./types";
const Context = createContext<{
  loading: boolean;
  restoreError: string;
  retry: () => void;
  signIn: (response: LoginResponse) => Promise<void>;
  clear: () => Promise<void>;
} | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const previouslySignedIn = useRef(false);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const busy = useRef(false);
  const restore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const saved = await readToken();
      if (!saved) dispatch(clearSession());
      if (saved) {
        dispatch(setSession({ token: saved, user: null }));
        const request = dispatch(
          authApi.endpoints.me.initiate(undefined, { forceRefetch: true }),
        );
        try {
          const result = await request.unwrap();
          dispatch(setSession({ token: saved, user: result.data.user }));
        } catch (error) {
          if (errorStatus(error) !== 401) throw error;
        } finally {
          request.unsubscribe();
        }
      }
    } catch {
      setRestoreError(
        "Could not restore your session. Check your connection and try again.",
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [dispatch]);
  useEffect(() => {
    // Start asynchronous session hydration after the initial render.
    void Promise.resolve().then(restore);
  }, [restore]);
  useEffect(() => {
    if (previouslySignedIn.current && !user) dispatch(api.util.resetApiState());
    previouslySignedIn.current = !!user;
  }, [user, dispatch]);
  async function signIn(response: LoginResponse) {
    await writeToken(response.data.token);
    dispatch(api.util.resetApiState());
    dispatch(setSession(response.data));
  }
  async function clear() {
    await writeToken(null);
    dispatch(clearSession());
    dispatch(api.util.resetApiState());
    setRestoreError("");
  }
  return (
    <Context.Provider
      value={{
        loading,
        restoreError,
        retry: () => {
          setLoading(true);
          setRestoreError("");
          void restore();
        },
        signIn,
        clear,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("SessionProvider is required");
  return value;
}
