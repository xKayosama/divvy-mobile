import Constants, { ExecutionEnvironment } from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { router, useRootNavigationState } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState, Platform } from "react-native";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useSession } from "@/features/auth/SessionProvider";
import { authError } from "@/features/auth/errors";
import { groupsApi } from "@/features/groups/groupsApi";
import { notificationRoute } from "./notificationRoute";
import { notificationsApi, type DeviceStatus } from "./notificationsApi";

const STORAGE_KEY = "divvy.push.device";
type SavedDevice = { userId: string; token: string };
type ContextValue = { supported: boolean; enabled: boolean; permitted: boolean; busy: boolean; message: string; status: DeviceStatus | null; enable: () => Promise<void>; disable: () => Promise<void>; test: () => Promise<void>; refresh: () => Promise<void> };
const Context = createContext<ContextValue | null>(null);
const supported = Platform.OS !== "web" && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
export function BillNotificationProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(state => state.auth.user?.id);
  const authToken = useAppSelector(state => state.auth.token);
  const { loading } = useSession();
  const navigation = useRootNavigationState();
  const [enabled, setEnabled] = useState(false);
  const [ownerId, setOwnerId] = useState<string | undefined>();
  const [permitted, setPermitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const saved = useRef<SavedDevice | null>(null);
  const lock = useRef(false);
  const current = useRef({ userId, authToken });
  useEffect(() => { current.current = { userId, authToken }; }, [userId, authToken]);

  const reconcile = useCallback(async (ask: boolean) => {
    if (!supported || !userId || !authToken || lock.current) return;
    lock.current = true; setBusy(true); setMessage(""); setOwnerId(userId);
    const stillCurrent = () => current.current.userId === userId && current.current.authToken === authToken;
    try {
      const Notifications = await import("expo-notifications");
      if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("bill-reminders", { name: "Bill reminders", importance: Notifications.AndroidImportance.DEFAULT, sound: "default" });
      let permission = await Notifications.getPermissionsAsync();
      if (ask && !permission.granted) permission = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
      if (!stillCurrent()) return;
      const granted = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      setPermitted(granted);
      setOwnerId(userId);
      let previous = saved.current;
      if (!previous) {
        const value = await SecureStore.getItemAsync(STORAGE_KEY);
        if (value) { const parsed = JSON.parse(value); if (typeof parsed.userId === "string" && typeof parsed.token === "string") previous = parsed; }
      }
      if (!stillCurrent()) return;
      if (!ask) {
        if (previous?.userId !== userId) { setEnabled(false); setStatus(null); return; }
        saved.current = previous;
        const response = await dispatch(notificationsApi.endpoints.getPushDeviceStatus.initiate({ token: previous.token })).unwrap();
        if (!stillCurrent()) return;
        setEnabled(response.data.device.enabled); setStatus(response.data.device);
        if (!response.data.device.enabled || !granted) return;
      }
      if (!granted) { setMessage("Notifications are blocked. Allow them in device settings, then try again."); return; }
      const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
      if (typeof projectId !== "string") throw new Error("Missing EAS project ID. Rebuild the app with its Expo project configured.");
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (!stillCurrent()) return;
      const response = await dispatch(notificationsApi.endpoints.registerPushDevice.initiate({ token, timeZone: timezone() })).unwrap();
      if (!stillCurrent()) return;
      saved.current = { userId, token };
      setEnabled(response.data.device.enabled); setStatus(response.data.device);
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(saved.current));
      if (previous?.userId === userId && previous.token !== token) await dispatch(notificationsApi.endpoints.disablePushDevice.initiate({ token: previous.token })).unwrap();
    } catch (error) {
      if (stillCurrent()) setMessage(authError(error, "Could not connect notifications. Check your connection and use a development build with push credentials configured."));
    } finally { lock.current = false; setBusy(false); }
  }, [dispatch, userId, authToken]);
  const refresh = useCallback(() => reconcile(false), [reconcile]);
  const enable = useCallback(() => reconcile(true), [reconcile]);
  const disable = useCallback(async () => {
    const device = saved.current;
    if (lock.current || !device || device.userId !== userId) return;
    lock.current = true; setBusy(true); setMessage("");
    try {
      await dispatch(notificationsApi.endpoints.disablePushDevice.initiate({ token: device.token })).unwrap();
      if (current.current.userId !== userId) return;
      setEnabled(false); setStatus(previous => previous ? { ...previous, enabled: false } : previous);
      const Notifications = await import("expo-notifications");
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) { setMessage(authError(error, "Could not disable notifications. Please try again.")); }
    finally { lock.current = false; setBusy(false); }
  }, [dispatch, userId]);
  const test = useCallback(async () => {
    const device = saved.current;
    if (lock.current || !device || device.userId !== userId) return;
    lock.current = true; setBusy(true); setMessage("");
    try {
      const response = await dispatch(notificationsApi.endpoints.testPushDevice.initiate({ token: device.token })).unwrap();
      if (current.current.userId === userId) setMessage(response.message);
    } catch (error) { setMessage(authError(error, "Could not request the notification test.")); }
    finally { lock.current = false; setBusy(false); }
  }, [dispatch, userId]);

  useEffect(() => {
    // A new account starts opted out. Restore only this account's registered device.
    saved.current = null;
    void Promise.resolve().then(refresh);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  useEffect(() => {
    if (!supported || loading || !navigation?.key) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("expo-notifications").then(Notifications => {
      if (disposed) return;
      const handle = (response: import("expo-notifications").NotificationResponse | null) => {
        if (!response || !userId) return;
        const route = notificationRoute(response.notification.request.content.data, userId);
        Notifications.clearLastNotificationResponse();
        if (route) router.push(route);
      };
      Notifications.setNotificationHandler({ handleNotification: async notification => {
        const show = !!current.current.userId && notification.request.content.data?.userId === current.current.userId;
        return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
      } });
      const response = Notifications.addNotificationResponseReceivedListener(handle);
      const token = Notifications.addPushTokenListener(() => { void refresh(); });
      const received = Notifications.addNotificationReceivedListener(notification => {
        if (!!userId && notification.request.content.data?.userId === userId) dispatch(groupsApi.util.invalidateTags(["Groups", "Dashboard", "Bills"]));
      });
      handle(Notifications.getLastNotificationResponse());
      cleanup = () => { response.remove(); token.remove(); received.remove(); };
      if (!userId) void Notifications.dismissAllNotificationsAsync();
    }).catch(() => { /* Existing native builds may need rebuilding with this module. */ });
    return () => { disposed = true; cleanup?.(); };
  }, [userId, loading, navigation?.key, dispatch, refresh]);
  return <Context.Provider value={{ supported, enabled: ownerId === userId && enabled, permitted, busy, message: ownerId === userId ? message : "", status: ownerId === userId ? status : null, enable, disable, test, refresh }}>{children}</Context.Provider>;
}
export function useBillNotifications() {
  const context = useContext(Context);
  if (!context) throw new Error("BillNotificationProvider is required");
  return context;
}
