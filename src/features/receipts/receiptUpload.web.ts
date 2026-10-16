import { MAX_RECEIPT_BYTES } from "./receiptDraft";

export async function receiptUpload(uri: string): Promise<FormData> {
  const response = await fetch(uri);
  if (!response.ok)
    throw new Error(
      "The receipt photo is no longer available. Choose it again.",
    );
  const blob = await response.blob();
  if (blob.size <= 0)
    throw new Error("The receipt photo is empty. Choose another photo.");
  if (blob.size > MAX_RECEIPT_BYTES)
    throw new Error("Receipt must be no larger than 10 MB.");
  const body = new FormData();
  body.append("receipt", blob, "receipt.jpg");
  return body;
}
