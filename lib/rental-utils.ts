import type { Timestamp } from "firebase/firestore";
import type { DashboardRentalState, ParkConfig } from "./types";
import { DEFAULT_PARK_CONFIG } from "./types";

export function addMinutes(date: Date, minutes: number): Date {
  const out = new Date(date);
  out.setMinutes(out.getMinutes() + minutes);
  return out;
}

export function toDate(t: Timestamp): Date {
  return t.toDate ? t.toDate() : new Date(t.seconds * 1000);
}

export function getDashboardState(
  bufferEndsAt: Timestamp,
  rentalEndsAt: Timestamp,
  returnedAt: Timestamp | undefined,
  status: string,
  config: ParkConfig = DEFAULT_PARK_CONFIG
): DashboardRentalState {
  if (returnedAt || status === "returned") return "on_time";
  const now = new Date();
  const bufferEnd = toDate(bufferEndsAt);
  const rentalEnd = toDate(rentalEndsAt);
  const overdueAt = addMinutes(rentalEnd, config.graceMinutes);

  if (now < bufferEnd) return "buffer";
  if (now >= overdueAt) return "overdue";
  if (now >= addMinutes(rentalEnd, -config.warnBeforeEndMinutes)) return "approaching";
  return "on_time";
}

export function getMinutesOverdue(rentalEndsAt: Timestamp, config: ParkConfig = DEFAULT_PARK_CONFIG): number {
  const end = toDate(rentalEndsAt);
  const overdueAt = addMinutes(end, config.graceMinutes);
  const now = new Date();
  if (now < overdueAt) return 0;
  return Math.round((now.getTime() - overdueAt.getTime()) / 60000);
}

export function getRemainingMinutes(rentalEndsAt: Timestamp): number {
  const end = toDate(rentalEndsAt);
  const now = new Date();
  return Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000));
}

export function getElapsedMinutes(startedAt: Timestamp): number {
  const start = toDate(startedAt);
  const now = new Date();
  return Math.round((now.getTime() - start.getTime()) / 60000);
}
