import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { ParkConfig } from "./types";
import { DEFAULT_PARK_CONFIG } from "./types";

const CONFIG_COLLECTION = "config";
const PARK_DOC = "park";

export async function getParkConfig(): Promise<ParkConfig> {
  if (!db) return DEFAULT_PARK_CONFIG;
  const ref = doc(db, CONFIG_COLLECTION, PARK_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) return DEFAULT_PARK_CONFIG;
  const data = snap.data();
  return {
    bufferMinutes: data.bufferMinutes ?? DEFAULT_PARK_CONFIG.bufferMinutes,
    rentalDurationMinutes: data.rentalDurationMinutes ?? DEFAULT_PARK_CONFIG.rentalDurationMinutes,
    graceMinutes: data.graceMinutes ?? DEFAULT_PARK_CONFIG.graceMinutes,
    warnBeforeEndMinutes: data.warnBeforeEndMinutes ?? DEFAULT_PARK_CONFIG.warnBeforeEndMinutes,
  };
}

export async function setParkConfig(config: ParkConfig): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  const ref = doc(db, CONFIG_COLLECTION, PARK_DOC);
  await setDoc(ref, {
    ...config,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
