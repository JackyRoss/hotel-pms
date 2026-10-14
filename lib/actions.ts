"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CHANNELS, db, nights, randomPin, type Channel, type RoomStatus } from "./db";
import { isDate, today } from "./dates";
import { hasOverlap, paidTotal, reservation, reservationByCode } from "./queries";

export async function setLang(formData: FormData) {
  const lang = formData.get("lang") === "zh" ? "zh" : "ja";
  (await cookies()).set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export type FormState = { error?: "overlap" | "invalid" } | undefined;

export async function createReservation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const guest = String(formData.get("guest_name") ?? "").trim();
  const roomId = Number(formData.get("room_id"));
  const checkIn = formData.get("check_in");
  const checkOut = formData.get("check_out");
  const adults = Number(formData.get("adults") ?? 1);
  const rate = Number(formData.get("rate"));
  const channel = String(formData.get("channel")) as Channel;

  if (
    !guest ||
    !roomId ||
    !isDate(checkIn) ||
    !isDate(checkOut) ||
    nights(checkIn, checkOut) < 1 ||
    !(adults >= 1) ||
    !(rate >= 0) ||
    !CHANNELS.includes(channel)
  ) {
    return { error: "invalid" };
  }
  if (hasOverlap(roomId, checkIn, checkOut)) return { error: "overlap" };

  const conn = db();
  const max = conn.prepare("SELECT MAX(id) AS m FROM reservations").get() as { m: number | null };
  const code = `R${1001 + (max.m ?? 0)}`;
  const res = conn
    .prepare(
      `INSERT INTO reservations
       (code, guest_name, phone, email, adults, room_id, check_in, check_out, status, channel, rate, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?, ?)`,
    )
    .run(
      code,
      guest,
      String(formData.get("phone") ?? ""),
      String(formData.get("email") ?? ""),
      adults,
      roomId,
      checkIn,
      checkOut,
      channel,
      rate,
      String(formData.get("notes") ?? ""),
      today(),
    );
  revalidatePath("/", "layout");
  redirect(`/reservations/${res.lastInsertRowid}`);
}

function doCheckIn(id: number): boolean {
  const r = reservation(id);
  if (!r || r.status !== "booked") return false;
  db()
    .prepare("UPDATE reservations SET status = 'in_house', pin = ? WHERE id = ?")
    .run(randomPin(), id);
  return true;
}

export async function checkIn(formData: FormData) {
  const id = Number(formData.get("id"));
  doCheckIn(id);
  revalidatePath("/", "layout");
}

export async function checkOut(formData: FormData) {
  const id = Number(formData.get("id"));
  const method = String(formData.get("method") ?? "cash");
  const r = reservation(id);
  if (!r || r.status !== "in_house") return;
  const conn = db();
  const balance = r.rate * nights(r.check_in, r.check_out) - paidTotal(id);
  if (balance > 0) {
    conn
      .prepare("INSERT INTO payments (reservation_id, amount, method, paid_on) VALUES (?, ?, ?, ?)")
      .run(id, balance, method, today());
  }
  conn.prepare("UPDATE reservations SET status = 'checked_out', pin = NULL WHERE id = ?").run(id);
  conn.prepare("UPDATE rooms SET status = 'dirty' WHERE id = ?").run(r.room_id);
  revalidatePath("/", "layout");
}

export async function cancelReservation(formData: FormData) {
  const id = Number(formData.get("id"));
  db().prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ? AND status = 'booked'").run(id);
  revalidatePath("/", "layout");
}

export async function reissuePin(formData: FormData) {
  const id = Number(formData.get("id"));
  db()
    .prepare("UPDATE reservations SET pin = ? WHERE id = ? AND status = 'in_house'")
    .run(randomPin(), id);
  revalidatePath("/", "layout");
}

const ROOM_STATUSES: RoomStatus[] = ["clean", "dirty", "inspecting", "ooo"];

export async function setRoomStatus(formData: FormData) {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as RoomStatus;
  if (!ROOM_STATUSES.includes(status)) return;
  db().prepare("UPDATE rooms SET status = ? WHERE id = ?").run(status, id);
  revalidatePath("/", "layout");
}

// --- Self check-in kiosk -------------------------------------------------

export async function kioskFind(formData: FormData) {
  const q = String(formData.get("q") ?? "").trim();
  if (!q) redirect("/kiosk");
  const t = today();
  const byCode = reservationByCode(q.toUpperCase());
  const match =
    byCode && byCode.check_in === t
      ? byCode
      : (db()
          .prepare(
            `SELECT code FROM reservations WHERE check_in = ? AND status IN ('booked','in_house')
             AND REPLACE(guest_name, ' ', '') = REPLACE(?, ' ', '') LIMIT 1`,
          )
          .get(t, q) as { code: string } | undefined);
  redirect(match ? `/kiosk?code=${match.code}` : "/kiosk?nf=1");
}

export async function kioskCheckIn(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const r = reservationByCode(code);
  if (!r || r.check_in !== today()) redirect("/kiosk?nf=1");
  if (r.status === "booked") {
    // Unattended check-in must never hand out a room that is not ready.
    const room = db().prepare("SELECT status FROM rooms WHERE id = ?").get(r.room_id) as { status: string };
    if (room.status !== "clean") redirect(`/kiosk?code=${code}`);
    // Demo payment: settle the full stay up front, as unattended hotels usually do.
    const total = r.rate * nights(r.check_in, r.check_out) - paidTotal(r.id);
    if (total > 0) {
      db()
        .prepare("INSERT INTO payments (reservation_id, amount, method, paid_on) VALUES (?, ?, 'card', ?)")
        .run(r.id, total, today());
    }
    doCheckIn(r.id);
  }
  revalidatePath("/", "layout");
  redirect(`/kiosk/done?code=${code}`);
}
