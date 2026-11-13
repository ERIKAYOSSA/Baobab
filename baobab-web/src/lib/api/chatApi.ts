import { apiRequest } from "./client";

export type ChatPerson = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  village?: string | null;
};

export type ChatConversation = {
  id: string;
  type: "direct" | "group" | string;
  name: string | null;
  createdAt: string;
  members: ChatPerson[];
  unread: number;
  last: { kind: string; text: string; senderId: string; createdAt: string } | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string | null;
  kind: "text" | "call" | "meeting" | string;
  text: string;
  meta: { room?: string; audioOnly?: boolean; url?: string; title?: string; startsAt?: string } | null;
  createdAt: string;
};

type Ok<T> = { ok: true; data: T };

export const getChatContacts = () => apiRequest<Ok<ChatPerson[]>>("/chat/contacts", { auth: true });

export const getChatUnread = () => apiRequest<Ok<{ unread: number }>>("/chat/unread", { auth: true });

export const listConversations = () => apiRequest<Ok<ChatConversation[]>>("/chat/conversations", { auth: true });

export const createDirectChat = (personId: string) =>
  apiRequest<Ok<{ id: string }>>("/chat/conversations", {
    method: "POST",
    auth: true,
    body: { type: "direct", personId },
  });

export const createGroupChat = (name: string, memberIds: string[]) =>
  apiRequest<Ok<{ id: string }>>("/chat/conversations", {
    method: "POST",
    auth: true,
    body: { type: "group", name, memberIds },
  });

export const getMessages = (id: string, after?: string) =>
  apiRequest<Ok<ChatMessage[]>>(
    `/chat/conversations/${id}/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`,
    { auth: true },
  );

export const sendMessage = (id: string, text: string) =>
  apiRequest<Ok<ChatMessage>>(`/chat/conversations/${id}/messages`, { method: "POST", auth: true, body: { text } });

export const startCall = (id: string, audioOnly: boolean) =>
  apiRequest<Ok<ChatMessage>>(`/chat/conversations/${id}/call`, { method: "POST", auth: true, body: { audioOnly } });

export const scheduleMeeting = (id: string, title: string, startsAt: string, audioOnly: boolean) =>
  apiRequest<Ok<ChatMessage>>(`/chat/conversations/${id}/meetings`, {
    method: "POST",
    auth: true,
    body: { title, startsAt, audioOnly },
  });

export const leaveConversation = (id: string) =>
  apiRequest<{ ok: true }>(`/chat/conversations/${id}/leave`, { method: "POST", auth: true });

export const getChatStreamTicket = () =>
  apiRequest<Ok<{ ticket: string }>>("/chat/stream-ticket", { method: "POST", auth: true });

export const markConversationRead = (id: string) =>
  apiRequest<{ ok: true }>(`/chat/conversations/${id}/read`, { method: "POST", auth: true });
