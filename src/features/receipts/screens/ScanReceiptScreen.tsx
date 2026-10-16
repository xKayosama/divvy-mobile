import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { FormMessage } from "@/components/auth/FormField";
import { receiptError } from "../receiptError";
import { receiptUpload } from "../receiptUpload";
import CreateExpenseScreen from "@/features/expenses/screens/CreateExpenseScreen";
import { useTheme } from "@/theme/ThemeProvider";
import { MAX_RECEIPT_BYTES } from "../receiptDraft";
import { useScanReceiptMutation } from "../receiptsApi";
import type { ReceiptExtraction } from "../types";

type PendingScan = {
  abort: () => void;
  unwrap: () => Promise<import("../types").ScanReceiptResponse>;
};
export default function ScanReceiptScreen({ groupId }: { groupId: string }) {
  const { colors, surfaces } = useTheme();
  const [photo, setPhoto] = useState<{ uri: string; bytes: number } | null>(
    null,
  );
  const [receipt, setReceipt] = useState<ReceiptExtraction | null>(null);
  const [message, setMessage] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [scan, { isLoading: scanning }] = useScanReceiptMutation();
  const pending = useRef<PendingScan | null>(null);
  const selecting = useRef(false);
  const startingScan = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.abort();
    };
  }, []);
  const busy = preparing || scanning;
  async function choose(camera: boolean) {
    if (selecting.current || pending.current) return;
    selecting.current = true;
    setMessage("");
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setMessage(
            "Camera access is needed to photograph receipts. Enable it in your device settings, or choose an existing photo.",
          );
          return;
        }
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 1,
            allowsEditing: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 1,
            allowsEditing: false,
          });
      if (result.canceled || !result.assets[0] || !mounted.current) return;
      setPreparing(true);
      const asset = result.assets[0];
      const context = ImageManipulator.manipulate(asset.uri);
      if (Math.max(asset.width, asset.height) > 2400)
        context.resize(
          asset.width > asset.height ? { width: 2400 } : { height: 2400 },
        );
      const rendered = await context.renderAsync();
      const converted = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.9,
        base64: true,
      });
      const encoded = converted.base64 ?? "";
      const bytes =
        Math.floor((encoded.length * 3) / 4) -
        (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
      if (!encoded || bytes > MAX_RECEIPT_BYTES)
        throw new Error("Choose a smaller receipt photo (up to 10 MB).");
      if (mounted.current) setPhoto({ uri: converted.uri, bytes });
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to open this photo. Please try another.",
        );
    } finally {
      selecting.current = false;
      if (mounted.current) setPreparing(false);
    }
  }
  async function scanPhoto() {
    if (!photo || pending.current || selecting.current || startingScan.current)
      return;
    startingScan.current = true;
    setMessage("");
    try {
      const body = await receiptUpload(photo.uri);
      if (!mounted.current) return;
      const request = scan({ groupId, body });
      pending.current = request;
      const result = await request.unwrap();
      if (mounted.current) {
        if (result.data.groupId !== groupId || !result.data.receipt.isReceipt)
          throw new Error(
            "Unable to identify a receipt for this group. Try another photo.",
          );
        setReceipt(result.data.receipt);
      }
    } catch (error) {
      if (mounted.current) setMessage(receiptError(error));
    } finally {
      pending.current = null;
      startingScan.current = false;
    }
  }
  if (receipt)
    return (
      <CreateExpenseScreen
        key="receipt-review"
        groupId={groupId}
        receipt={receipt}
        receiptImageUri={photo?.uri}
      />
    );
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, flexGrow: 1 }}>
        <View className="flex-row items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            accessibilityLabel="Back to expenses"
            onPress={() => {
              pending.current?.abort();
              router.navigate({
                pathname: "/groups/[groupId]/expenses",
                params: { groupId },
              });
            }}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={colors.foreground}
              accessible={false}
            />
          </Button>
          <Text className="text-3xl font-semibold">Scan receipt</Text>
        </View>
        <View
          className="gap-4 rounded-[24px] bg-card p-5"
          style={surfaces.card}
        >
          {photo ? (
            <Image
              source={{ uri: photo.uri }}
              contentFit="contain"
              style={{ height: 300, width: "100%", borderRadius: 16 }}
              accessibilityLabel="Selected receipt photo"
            />
          ) : (
            <View className="items-center gap-4 py-8">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <Ionicons
                  name="scan-outline"
                  size={38}
                  color={colors.primary}
                  accessible={false}
                />
              </View>
              <Text className="text-center text-xl font-semibold">
                Less typing. More sharing.
              </Text>
              <Text className="text-center text-sm leading-6 text-muted-foreground">
                Photograph the entire receipt in good lighting. We’ll read the
                details so you can review them before saving.
              </Text>
            </View>
          )}
          {Platform.OS !== "web" ? (
            <Button
              variant="outline"
              disabled={busy}
              onPress={() => void choose(true)}
            >
              <Ionicons
                name="camera-outline"
                size={20}
                color={colors.foreground}
                accessible={false}
              />
              <Text>Take a photo</Text>
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={busy}
            onPress={() => void choose(false)}
          >
            <Ionicons
              name="images-outline"
              size={20}
              color={colors.foreground}
              accessible={false}
            />
            <Text>{photo ? "Choose another photo" : "Choose photo"}</Text>
          </Button>
        </View>
        <FormMessage message={message} />
        {busy ? (
          <View className="items-center gap-3">
            <ActivityIndicator color={colors.primary} />
            <Text accessibilityLiveRegion="polite">
              {preparing
                ? "Preparing your photo…"
                : "Reading your receipt… This can take up to a minute."}
            </Text>
          </View>
        ) : null}
        <Button disabled={!photo || busy} onPress={() => void scanPhoto()}>
          <Text>{scanning ? "Scanning…" : "Scan and review"}</Text>
        </Button>
        <Text className="text-center text-xs leading-5 text-muted-foreground">
          The photo is uploaded for text extraction. Review every value before
          saving. Scanning alone does not create an expense.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
