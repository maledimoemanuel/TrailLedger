import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  orderBy,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { getParkConfig } from "./config";
import { addMinutes } from "./rental-utils";
import type { Bike, Rental } from "./types";
import type { ParkConfig } from "./types";

const BIKES = "bikes";
const RENTALS = "rentals";

function bikesCol() {
  if (!db) throw new Error("Firestore not initialized");
  return collection(db, BIKES);
}

function rentalsCol() {
  if (!db) throw new Error("Firestore not initialized");
  return collection(db, RENTALS);
}

export async function getBikeByBikeId(bikeId: string): Promise<Bike | null> {
  if (!db) return null;
  const q = query(
    collection(db, BIKES),
    where("bikeId", "==", bikeId.toUpperCase().trim())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Bike;
}

export async function getBikeById(docId: string): Promise<Bike | null> {
  if (!db) return null;
  const ref = doc(db, BIKES, docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Bike;
}

export async function getAllBikes(): Promise<Bike[]> {
  const snap = await getDocs(bikesCol());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bike));
}

export async function getActiveRentals(): Promise<Rental[]> {
  if (!db) return [];
  const q = query(
    collection(db, RENTALS),
    where("status", "in", ["buffer", "active", "overdue"]),
    orderBy("startedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rental));
}

export function subscribeActiveRentals(
  callback: (rentals: Rental[]) => void
): Unsubscribe {
  if (!db) return () => {};
  const q = query(
    collection(db, RENTALS),
    where("status", "in", ["buffer", "active", "overdue"]),
    orderBy("startedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const rentals = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Rental[];
    callback(rentals);
  });
}

export async function checkOut(
  bikeDocId: string,
  bikeId: string,
  staffId: string,
  staffEmail: string
): Promise<string> {
  if (!db) throw new Error("Firestore not initialized");
  const existing = await findActiveRentalByBikeId(bikeId);
  if (existing) {
    throw new Error("This bike already has an active rental. Check it in first.");
  }
  const config = await getParkConfig();
  const now = new Date();
  const bufferEndsAt = addMinutes(now, config.bufferMinutes);
  const rentalEndsAt = addMinutes(bufferEndsAt, config.rentalDurationMinutes);

  const batch = writeBatch(db);
  const rentalRef = doc(collection(db, RENTALS));
  batch.set(rentalRef, {
    bikeId,
    bikeDocId,
    status: "buffer",
    staffId,
    staffEmail,
    startedAt: now,
    bufferEndsAt,
    rentalEndsAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const bikeRef = doc(db, BIKES, bikeDocId);
  batch.update(bikeRef, {
    status: "out",
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return rentalRef.id;
}

export async function checkIn(rentalId: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  const rentalRef = doc(db, RENTALS, rentalId);
  const rentalSnap = await getDoc(rentalRef);
  if (!rentalSnap.exists()) throw new Error("Rental not found");
  const data = rentalSnap.data();
  const bikeDocId = data.bikeDocId as string;
  const startedAt = data.startedAt?.toDate?.() ?? new Date(data.startedAt);
  const now = new Date();
  const totalMinutes = Math.round(
    (now.getTime() - startedAt.getTime()) / 60000
  );

  const batch = writeBatch(db);
  batch.update(rentalRef, {
    status: "returned",
    returnedAt: serverTimestamp(),
    totalMinutes,
    updatedAt: serverTimestamp(),
  });
  const bikeRef = doc(db, BIKES, bikeDocId);
  batch.update(bikeRef, {
    status: "available",
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function findActiveRentalByBikeId(
  bikeId: string
): Promise<{ id: string; rental: Rental } | null> {
  if (!db) return null;
  const q = query(
    collection(db, RENTALS),
    where("bikeId", "==", bikeId.toUpperCase().trim()),
    where("status", "in", ["buffer", "active", "overdue"])
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, rental: { id: d.id, ...d.data() } as Rental };
}

export async function seedBikes(count: number): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  const batch = writeBatch(db);
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const bikeId = `TL-${String(i).padStart(3, "0")}`;
    const ref = doc(collection(db, BIKES));
    batch.set(ref, {
      bikeId,
      label: `Bike ${i}`,
      status: "available",
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
}

export interface AddBikeOptions {
  label?: string;
  model?: string;
  size?: string;
  notes?: string;
  photoUrls?: string[];
}

export async function addBike(
  bikeId: string,
  label?: string,
  options?: AddBikeOptions
): Promise<string> {
  if (!db) throw new Error("Firestore not initialized");
  const normalized = bikeId.toUpperCase().trim();
  const existing = await getBikeByBikeId(normalized);
  if (existing) throw new Error(`Bike ${normalized} already exists.`);
  const ref = doc(collection(db, BIKES));
  const now = new Date();
  const data: Record<string, unknown> = {
    bikeId: normalized,
    label: label ?? options?.label ?? normalized,
    status: "available",
    photoUrls: options?.photoUrls ?? [],
    createdAt: now,
    updatedAt: now,
  };
  if (options?.model != null) data.model = options.model;
  if (options?.size != null) data.size = options.size;
  if (options?.notes != null) data.notes = options.notes;
  await setDoc(ref, data);
  return ref.id;
}

export async function updateBikePhotoUrls(
  bikeDocId: string,
  photoUrls: string[]
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  const ref = doc(db, BIKES, bikeDocId);
  await updateDoc(ref, { photoUrls, updatedAt: serverTimestamp() });
}

export async function updateBikeStatus(
  bikeDocId: string,
  status: Bike["status"]
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  const ref = doc(db, BIKES, bikeDocId);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
}

export async function deleteBike(bikeDocId: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  const bikeSnap = await getDoc(doc(db, BIKES, bikeDocId));
  if (!bikeSnap.exists()) throw new Error("Bike not found.");
  const bikeId = (bikeSnap.data() as { bikeId?: string })?.bikeId ?? "";
  const active = await findActiveRentalByBikeId(bikeId);
  if (active) throw new Error("Cannot remove bike with an active rental. Check it in first.");
  await deleteDoc(doc(db, BIKES, bikeDocId));
}

export async function updateRentalIncidentNote(rentalId: string, note: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  const ref = doc(db, RENTALS, rentalId);
  await updateDoc(ref, { incidentNote: note, updatedAt: serverTimestamp() });
}

export async function getRentalsByDateRange(start: Date, end: Date): Promise<Rental[]> {
  if (!db) return [];
  const q = query(
    collection(db, RENTALS),
    where("startedAt", ">=", start),
    where("startedAt", "<=", end),
    orderBy("startedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rental));
}

export async function seedDemo(staffId: string, staffEmail: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  const config = await getParkConfig();
  let bike1 = await getBikeByBikeId("TL-001");
  let bike2 = await getBikeByBikeId("TL-002");
  if (!bike1 || !bike2) {
    await seedBikes(20);
    bike1 = await getBikeByBikeId("TL-001");
    bike2 = await getBikeByBikeId("TL-002");
    if (!bike1 || !bike2) throw new Error("Demo seed failed: bikes not found");
  }
  const now = new Date();
  const batch = writeBatch(db);

  const overdueStarted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const overdueBufferEnd = addMinutes(overdueStarted, config.bufferMinutes);
  const overdueRentalEnd = addMinutes(overdueBufferEnd, config.rentalDurationMinutes);
  const rental1Ref = doc(collection(db, RENTALS));
  batch.set(rental1Ref, {
    bikeId: bike1.bikeId,
    bikeDocId: bike1.id,
    status: "overdue",
    staffId,
    staffEmail,
    startedAt: overdueStarted,
    bufferEndsAt: overdueBufferEnd,
    rentalEndsAt: overdueRentalEnd,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, BIKES, bike1.id), { status: "out", updatedAt: serverTimestamp() });

  const bufferStarted = new Date(now.getTime() - 1 * 60 * 1000);
  const bufferEndsAt = addMinutes(bufferStarted, config.bufferMinutes);
  const bufferRentalEnd = addMinutes(bufferEndsAt, config.rentalDurationMinutes);
  const rental2Ref = doc(collection(db, RENTALS));
  batch.set(rental2Ref, {
    bikeId: bike2.bikeId,
    bikeDocId: bike2.id,
    status: "buffer",
    staffId,
    staffEmail,
    startedAt: bufferStarted,
    bufferEndsAt,
    rentalEndsAt: bufferRentalEnd,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, BIKES, bike2.id), { status: "out", updatedAt: serverTimestamp() });

  await batch.commit();
}
