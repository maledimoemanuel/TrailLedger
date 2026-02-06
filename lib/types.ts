export type BikeStatus = "available" | "out" | "overdue" | "maintenance";

export interface Bike {
  id: string;
  bikeId: string; // human-readable e.g. "TL-001", used in QR
  label?: string;
  status: BikeStatus;
  photoUrls?: string[];
  model?: string;
  size?: string;
  notes?: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

export type RentalStatus = "buffer" | "active" | "returned" | "overdue";

/** Renter (customer) info collected at checkout and stored on the rental. */
export interface RenterInfo {
  name: string;
  email?: string;
  phone?: string;
}

export interface Rental {
  id: string;
  bikeId: string;
  bikeDocId: string; // Firestore bikes/{id}
  status: RentalStatus;
  staffId: string;
  staffEmail: string;
  /** Who rented the bike (name, email, phone). Collected at checkout. */
  renterName?: string;
  renterEmail?: string;
  renterPhone?: string;
  startedAt: FirebaseTimestamp;
  bufferEndsAt: FirebaseTimestamp;
  rentalEndsAt: FirebaseTimestamp;
  returnedAt?: FirebaseTimestamp;
  totalMinutes?: number;
  incidentNote?: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

import type { Timestamp } from "firebase/firestore";
export type FirebaseTimestamp = Timestamp;

export type DashboardRentalState = "on_time" | "approaching" | "overdue" | "buffer";

export interface ParkConfig {
  bufferMinutes: number;
  rentalDurationMinutes: number;
  graceMinutes: number;
  warnBeforeEndMinutes: number;
}

export const DEFAULT_PARK_CONFIG: ParkConfig = {
  bufferMinutes: 5,
  rentalDurationMinutes: 120,
  graceMinutes: 10,
  warnBeforeEndMinutes: 15,
};
