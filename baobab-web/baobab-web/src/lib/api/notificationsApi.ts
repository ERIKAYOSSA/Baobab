import { apiRequest } from "./client";
import type { NotificationsPayload } from "./types";

export async function getNotifications() {
  return apiRequest<{ ok: true; data: NotificationsPayload }>("/notifications", { auth: true });
}
