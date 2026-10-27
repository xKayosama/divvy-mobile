import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

export function useInboxRefresh() {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== "background");
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      setActive(state === "active");
    });
    return () => subscription.remove();
  }, []);
  return focused && active;
}
