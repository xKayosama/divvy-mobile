export type ReceiptExtraction = {
  isReceipt: boolean;
  merchant: string | null;
  date: string | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  total: number | null;
  items: {
    description: string | null;
    quantity: number | null;
    unitPrice: number | null;
    total: number | null;
  }[];
  warnings: string[];
};
export type ScanReceiptResponse = {
  success: true;
  message: string;
  data: { groupId: string; requiresReview: true; receipt: ReceiptExtraction };
};
