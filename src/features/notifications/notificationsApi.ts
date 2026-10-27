import { api } from "@/services/api";
export type DeviceStatus = { enabled: boolean; timeZone: string | null; workerEnabled: boolean; deliveryState: string | null; lastError: string | null };
type StatusResponse = { success: true; data: { device: DeviceStatus } };
export type InboxNotification = { id: string; type: "bill-reminder" | "invitation"; title: string; body: string; createdAt: string; readAt: string | null; groupId?: string; billId?: string };
export type InboxResponse = { success: true; data: { notifications: InboxNotification[]; unreadCount: number; pagination: { page: number; total: number; totalPages: number } } };
export const notificationsApi = api.enhanceEndpoints({ addTagTypes: ["Inbox", "Bills", "Groups", "Invitations"] }).injectEndpoints({ endpoints: builder => ({
  getInbox: builder.query<InboxResponse, number>({ query: page => `/notifications/inbox?page=${page}`, providesTags: ["Inbox", "Bills", "Groups", "Invitations"] }),
  getUnreadCount: builder.query<{ success: true; data: { unreadCount: number } }, void>({ query: () => "/notifications/unread-count", providesTags: ["Inbox", "Bills", "Groups", "Invitations"] }),
  readNotification: builder.mutation<{ success: true }, string>({ query: id => ({ url: `/notifications/inbox/${encodeURIComponent(id)}/read`, method: "POST" }), invalidatesTags: ["Inbox"] }),
  readAllNotifications: builder.mutation<{ success: true }, void>({ query: () => ({ url: "/notifications/inbox/read-all", method: "POST" }), invalidatesTags: ["Inbox"] }),
  registerPushDevice: builder.mutation<StatusResponse, { token: string; timeZone: string }>({ query: body => ({ url: "/notifications/devices", method: "POST", body }) }),
  getPushDeviceStatus: builder.mutation<StatusResponse, { token: string }>({ query: body => ({ url: "/notifications/status", method: "POST", body }) }),
  disablePushDevice: builder.mutation<{ success: true }, { token: string }>({ query: body => ({ url: "/notifications/devices", method: "DELETE", body }) }),
  testPushDevice: builder.mutation<{ success: true; message: string }, { token: string }>({ query: body => ({ url: "/notifications/test", method: "POST", body }) }),
}) });

export const { useGetInboxQuery, useGetUnreadCountQuery, useReadNotificationMutation, useReadAllNotificationsMutation } = notificationsApi;
