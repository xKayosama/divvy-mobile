import { Linking, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useBillNotifications } from "./BillNotificationProvider";
export function BillNotificationSettings() {
  const notifications = useBillNotifications();
  return <View className="gap-4 rounded-[24px] bg-card p-5">
    <Text className="text-lg font-semibold">Bill notifications</Text>
    {!notifications.supported ? <Text className="text-sm leading-6 text-muted-foreground">Push reminders are available in the iOS and Android development app. They aren’t available on web or in Expo Go.</Text> : <>
      <Text className="text-sm leading-6 text-muted-foreground">A daily reminder at 9 AM in this device’s timezone for overdue bills and bills due today or tomorrow, across your groups. Paid bills are excluded.</Text>
      <Text className="font-medium">{notifications.enabled ? notifications.permitted ? "Enabled on this device" : "Blocked in device settings" : "Off on this device"}</Text>
      {notifications.enabled && !notifications.status?.workerEnabled ? <Text className="text-sm text-muted-foreground">This device is connected. Automatic reminders will start once the backend notification worker is enabled.</Text> : null}
      {notifications.status?.lastError ? <Text className="text-sm text-destructive">Delivery needs attention. Check push credentials and try reconnecting this device.</Text> : null}
      <Button disabled={notifications.busy} onPress={notifications.enabled ? notifications.disable : notifications.enable}><Text>{notifications.busy ? "Please wait…" : notifications.enabled ? "Turn off notifications" : "Enable bill notifications"}</Text></Button>
      {notifications.enabled ? <Button variant="outline" disabled={notifications.busy || !notifications.permitted} onPress={notifications.test}><Text>Send test notification</Text></Button> : null}
      {!notifications.permitted ? <Button variant="ghost" disabled={notifications.busy} onPress={() => { void Linking.openSettings().catch(() => {}); }}><Text>Open device settings</Text></Button> : null}
      <Button variant="ghost" disabled={notifications.busy} onPress={notifications.refresh}><Text>Refresh notification status</Text></Button>
    </>}
    {notifications.message ? <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-muted-foreground">{notifications.message}</Text> : null}
  </View>;
}
