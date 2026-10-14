import "server-only";
import { db, nights, type Reservation, type Room, type RoomStatus, type RoomType } from "./db";
import { addDays, today } from "./dates";

export type ReservationRow = Reservation & {
  room_number: string;
  room_status: RoomStatus;
  type_id: number;
};

const RES_SELECT = `SELECT r.*, rm.number AS room_number, rm.status AS room_status, rm.type_id
  FROM reservations r JOIN rooms rm ON rm.id = r.room_id`;

export function roomTypes(): RoomType[] {
  return db().prepare("SELECT * FROM room_types ORDER BY id").all() as unknown as RoomType[];
}

export function rooms(): Room[] {
  return db().prepare("SELECT * FROM rooms ORDER BY number").all() as unknown as Room[];
}

export function reservation(id: number): ReservationRow | undefined {
  return db().prepare(`${RES_SELECT} WHERE r.id = ?`).get(id) as unknown as
    | ReservationRow
    | undefined;
}

export function reservationByCode(code: string): ReservationRow | undefined {
  return db().prepare(`${RES_SELECT} WHERE r.code = ?`).get(code) as unknown as
    | ReservationRow
    | undefined;
}

export function searchReservations(opts: {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}): ReservationRow[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.q) {
    where.push("(r.guest_name LIKE ? OR r.code LIKE ? OR r.phone LIKE ?)");
    const like = `%${opts.q}%`;
    args.push(like, like, like);
  }
  if (opts.status) {
    where.push("r.status = ?");
    args.push(opts.status);
  }
  if (opts.from) {
    where.push("r.check_out > ?");
    args.push(opts.from);
  }
  if (opts.to) {
    where.push("r.check_in <= ?");
    args.push(opts.to);
  }
  const sql = `${RES_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY r.check_in, rm.number LIMIT 300`;
  return db().prepare(sql).all(...args) as unknown as ReservationRow[];
}

/** Active (non-cancelled) reservations overlapping [from, to). */
export function reservationsInRange(from: string, to: string): ReservationRow[] {
  return db()
    .prepare(
      `${RES_SELECT} WHERE r.status != 'cancelled' AND r.check_in < ? AND r.check_out > ?
       ORDER BY r.check_in`,
    )
    .all(to, from) as unknown as ReservationRow[];
}

export function hasOverlap(
  roomId: number,
  checkIn: string,
  checkOut: string,
  excludeId = 0,
): boolean {
  const row = db()
    .prepare(
      `SELECT 1 FROM reservations WHERE room_id = ? AND id != ? AND status != 'cancelled'
       AND check_in < ? AND check_out > ? LIMIT 1`,
    )
    .get(roomId, excludeId, checkOut, checkIn);
  return Boolean(row);
}

export function paidTotal(reservationId: number): number {
  const row = db()
    .prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE reservation_id = ?")
    .get(reservationId) as { s: number };
  return row.s;
}

export function dashboard() {
  const t = today();
  const all = rooms();
  const sellable = all.filter((r) => r.status !== "ooo").length;
  const arrivals = searchReservations({}).filter(
    (r) => r.check_in === t && r.status !== "cancelled",
  );
  const departures = searchReservations({}).filter(
    (r) => r.check_out === t && r.status !== "cancelled",
  );
  const stayingTonight = reservationsInRange(t, addDays(t, 1));
  const inHouse = stayingTonight.filter((r) => r.status === "in_house");
  const revenue = (
    db()
      .prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE paid_on = ?")
      .get(t) as { s: number }
  ).s;
  return {
    today: t,
    arrivals,
    departures,
    inHouse: inHouse.length,
    occupancy: sellable ? stayingTonight.length / sellable : 0,
    dirty: all.filter((r) => r.status === "dirty").length,
    revenue,
  };
}

export interface DayStat {
  date: string;
  sold: number;
  revenue: number;
}

/** Room revenue is recognised per night of stay (not on payment date). */
export function dailyStats(from: string, days: number): DayStat[] {
  const to = addDays(from, days);
  const list = reservationsInRange(from, to);
  const stats = new Map<string, DayStat>();
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    stats.set(d, { date: d, sold: 0, revenue: 0 });
  }
  for (const r of list) {
    for (let i = 0; i < nights(r.check_in, r.check_out); i++) {
      const s = stats.get(addDays(r.check_in, i));
      if (s) {
        s.sold += 1;
        s.revenue += r.rate;
      }
    }
  }
  return [...stats.values()];
}

export function channelStats(from: string, to: string) {
  const out = new Map<string, { count: number; revenue: number }>();
  for (const r of reservationsInRange(from, to)) {
    const cur = out.get(r.channel) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += r.rate * nights(r.check_in, r.check_out);
    out.set(r.channel, cur);
  }
  return [...out.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
}
