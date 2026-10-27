export function notificationRoute(data: Record<string, unknown> | undefined, userId: string) {
  if (data?.type !== "bill-reminder" || data.userId !== userId) return null;
  const id = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
  if (id(data.groupId) && id(data.billId)) return { pathname: "/groups/[groupId]/bills/[billId]" as const, params: { groupId: data.groupId, billId: data.billId } };
  if (id(data.groupId)) return { pathname: "/groups/[groupId]/bills" as const, params: { groupId: data.groupId } };
  return "/groups" as const;
}
