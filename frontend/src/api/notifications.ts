import api from "@/api/client";
import { wrapArray } from "@/api/helpers";
import type {
  NotificationRead,
  PaginatedResponse,
  UnreadCountRead,
} from "@/api/types";

export async function getNotifications(
  params?: { page?: number; size?: number; is_read?: boolean },
): Promise<PaginatedResponse<NotificationRead>> {
  const { data } = await api.get("/notifications/", { params });
  return wrapArray(data, params?.page, params?.size);
}

export async function getUnreadCount(): Promise<UnreadCountRead> {
  const { data } = await api.get("/notifications/unread-count");
  return data;
}

export async function markAsRead(id: number): Promise<NotificationRead> {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
}

export async function markAllAsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
