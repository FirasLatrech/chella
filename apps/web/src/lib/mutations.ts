"use client";

import type { FeedKind } from "@/components/dashboard/feed-item";
import type { Block } from "@/lib/content";

/*
 * Browser-side mutations against the Go API. All requests carry the session
 * cookie (localhost:4100 → :4120 is same-site, so Lax cookies flow).
 *
 * Every helper throws ApiError on failure; callers check `status === 401`
 * to route to /login.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4120";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function send<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const post = <T = unknown,>(path: string, body?: unknown) =>
  send<T>("POST", path, body);

export interface ProfileDetailsInput {
  bio: string;
  github: string;
  linkedin: string;
  website: string;
  cvUrl: string;
  avatar: string;
}

export function updateProfile(input: ProfileDetailsInput) {
  return send<ProfileDetailsInput>("PUT", "/api/me/profile", input);
}

export function login(identifier: string, password: string) {
  return post<{ handle: string; name: string }>("/api/auth/login", {
    identifier,
    password,
  });
}

export interface SignupInput {
  email: string;
  firstName: string;
  lastName: string;
  handle: string;
  password: string;
}

export function signup(input: SignupInput) {
  return post<{ handle: string; name: string }>("/api/auth/signup", input);
}

/** Live uniqueness check for the signup form. */
export async function checkAvailable(params: {
  handle?: string;
  email?: string;
}): Promise<{ handle: boolean; email: boolean }> {
  const q = new URLSearchParams();
  if (params.handle) q.set("handle", params.handle);
  if (params.email) q.set("email", params.email);
  const res = await fetch(`${API_URL}/api/auth/available?${q}`, {
    credentials: "include",
  });
  if (!res.ok) return { handle: true, email: true };
  return res.json();
}

export function forgotPassword(email: string) {
  return post<{ status: string }>("/api/auth/forgot", { email });
}

export function resetPassword(token: string, password: string) {
  return post("/api/auth/reset", { token, password });
}

export function logout() {
  return post("/api/auth/logout");
}

export function createPost(input: {
  kind: FeedKind;
  title: string;
  body: string;
  blocks?: Block[];
  tags: string[];
  imageUrl?: string;
}) {
  return post<{ id: string }>("/api/posts", input);
}

/** Upload a file (image or PDF, ≤5 MB); returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/uploads`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new ApiError(res.status, message);
  }
  return (await res.json()).url;
}

/** Same endpoint — the server sniffs the type; PDFs are for the CV only. */
export const uploadFile = uploadImage;

export function readNotification(id: string) {
  return post(`/api/notifications/${id}/read`);
}

export function readAllNotifications() {
  return post("/api/notifications/read-all");
}

export function createReply(postId: string, text: string) {
  return post<{ id: string }>(`/api/posts/${postId}/replies`, { text });
}

export function votePost(postId: string, direction: -1 | 0 | 1) {
  return post<{ votes: number; myVote: number }>(`/api/posts/${postId}/vote`, {
    direction,
  });
}

export function voteReply(replyId: string, up: boolean) {
  return post<{ votes: number; myVote: boolean }>(
    `/api/replies/${replyId}/vote`,
    { up },
  );
}

export function updatePost(
  id: string,
  input: { title: string; body?: string; blocks?: Block[]; tags: string[] },
) {
  return send("PATCH", `/api/posts/${id}`, input);
}

export function deletePost(id: string) {
  return send("DELETE", `/api/posts/${id}`);
}

export function updateReply(id: string, text: string) {
  return send("PATCH", `/api/replies/${id}`, { text });
}

export function deleteReply(id: string) {
  return send("DELETE", `/api/replies/${id}`);
}

/** Toggles the bookmark; returns the new state. */
export function savePost(postId: string) {
  return post<{ saved: boolean }>(`/api/posts/${postId}/save`);
}

export function acceptReply(replyId: string) {
  return post(`/api/replies/${replyId}/accept`);
}
