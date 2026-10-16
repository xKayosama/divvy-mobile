import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { Button } from "./button";
import { Text } from "./text";
import { errorStatus } from "@/features/auth/errors";
import { useTheme } from "@/theme/ThemeProvider";

export function ContentState({ title, description, icon = "file-tray-outline", actionLabel, onAction, busy = false, secondaryLabel, onSecondary }: {
  title: string;
  description: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const { colors, surfaces } = useTheme();
  return (
    <View className="items-center gap-3 rounded-[24px] bg-card p-6" style={surfaces.card} accessibilityLiveRegion="polite">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
        <Ionicons name={icon} size={27} color={colors.primary} accessible={false} />
      </View>
      <Text accessibilityRole="header" className="text-center text-lg font-semibold">{title}</Text>
      <Text className="text-center text-sm leading-5 text-muted-foreground">{description}</Text>
      {onAction && actionLabel ? <Button variant="outline" className="mt-1 w-full" disabled={busy} onPress={onAction}><Text>{busy ? "Trying again…" : actionLabel}</Text></Button> : null}
      {onSecondary && secondaryLabel ? <Button variant="ghost" className="w-full" onPress={onSecondary}><Text>{secondaryLabel}</Text></Button> : null}
    </View>
  );
}

export function QueryErrorState({ error, subject, onRetry, busy, onBack, backLabel = "Back to groups" }: {
  error?: unknown;
  subject: string;
  onRetry: () => void;
  busy?: boolean;
  onBack?: () => void;
  backLabel?: string;
}) {
  const status = errorStatus(error);
  const network = status === "FETCH_ERROR" || status === "TIMEOUT_ERROR";
  const unavailable = status === 403 || status === 404;
  return <ContentState
    icon={network ? "cloud-offline-outline" : unavailable ? "lock-closed-outline" : "alert-circle-outline"}
    title={network ? "Couldn’t connect" : status === 403 ? "Access unavailable" : status === 404 ? `${subject} not found` : `Couldn’t load ${subject.toLowerCase()}`}
    description={network ? "Check your connection, then try again." : status === 403 ? "Your access may have changed. Return to your groups to choose an available group." : status === 404 ? "This may have been removed or is no longer available." : "Something went wrong while loading. Try again in a moment."}
    actionLabel={unavailable ? undefined : "Try again"}
    onAction={unavailable ? undefined : onRetry}
    busy={busy}
    secondaryLabel={backLabel}
    onSecondary={onBack}
  />;
}
