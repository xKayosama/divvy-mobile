import { File } from "expo-file-system";
import { MAX_RECEIPT_BYTES } from "./receiptDraft";

export async function receiptUpload(uri: string): Promise<FormData> {
  const file = new File(uri);
  if (!file.exists || file.size <= 0)
    throw new Error(
      "The receipt photo is no longer available. Choose it again.",
    );
  if (file.size > MAX_RECEIPT_BYTES)
    throw new Error("Receipt must be no larger than 10 MB.");
  const body = new FormData();
  // SDK 57 uses expo/fetch, which reads File.bytes(); URI descriptor objects are unsupported.
  body.append("receipt", file);
  return body;
}
