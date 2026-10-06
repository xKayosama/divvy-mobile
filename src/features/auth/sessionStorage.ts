import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
const KEY = "divvy.auth.token";
export async function readToken(): Promise<string | null> {
  if (Platform.OS === "web")
    return typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}
export async function writeToken(token: string | null) {
  if (Platform.OS === "web") {
    if (token) window.sessionStorage.setItem(KEY, token);
    else window.sessionStorage.removeItem(KEY);
  } else if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
}
