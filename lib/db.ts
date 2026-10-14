import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { addDays, today } from "./dates";

export type RoomStatus = "clean" | "dirty" | "inspecting" | "ooo";
export type ReservationStatus =
  | "booked"
  | "in_house"
  | "checked_out"
  | "cancelled";
export type Channel =
  | "direct"
  | "walkin"
  | "booking"
  | "expedia"
  | "rakuten"
  | "jalan";

export const CHANNELS: Channel[] = [
  "direct",
  "walkin",
  "booking",
  "expedia",
  "rakuten",
  "jalan",
];

export interface RoomType {
  id: number;
  code: string;
  name_ja: string;
  name_zh: string;
  capacity: number;
  base_rate: number;
}

export interface Room {
  id: number;
  number: string;
  floor: number;
  type_id: number;
  status: RoomStatus;
}

export interface Reservation {
  id: number;
  code: string;
  guest_name: string;
  phone: string;
  email: string;
  adults: number;
  room_id: number;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
  channel: Channel;
  rate: number;
  pin: string | null;
  notes: string;
  created_at: string;
}

export interface Payment {
  id: number;
  reservation_id: number;
  amount: number;
  method: string;
  paid_on: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS room_types (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_ja TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  base_rate INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  floor INTEGER NOT NULL,
  type_id INTEGER NOT NULL REFERENCES room_types(id),
  status TEXT NOT NULL DEFAULT 'clean'
);
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  adults INTEGER NOT NULL DEFAULT 1,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  channel TEXT NOT NULL DEFAULT 'direct',
  rate INTEGER NOT NULL,
  pin TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_res_dates ON reservations(check_in, check_out);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id),
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  paid_on TEXT NOT NULL
);
`;

const globalForDb = globalThis as unknown as { __hotelDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!globalForDb.__hotelDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const conn = new DatabaseSync(path.join(dir, "hotel.db"));
    conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    conn.exec(SCHEMA);
    const row = conn.prepare("SELECT COUNT(*) AS n FROM rooms").get() as {
      n: number;
    };
    if (row.n === 0) seed(conn);
    globalForDb.__hotelDb = conn;
  }
  return globalForDb.__hotelDb;
}

export function nights(checkIn: string, checkOut: string): number {
  return Math.round(
    (Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000,
  );
}

export function randomPin(rand: () => number = Math.random): string {
  return String(Math.floor(rand() * 9000) + 1000);
}

// Demo data is generated relative to today so the prototype always looks live.
function seed(conn: DatabaseSync) {
  let s = 20261013;
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  const types: Omit<RoomType, "id">[] = [
    { code: "SGL", name_ja: "シングル", name_zh: "单人间", capacity: 1, base_rate: 7800 },
    { code: "DBL", name_ja: "ダブル", name_zh: "大床房", capacity: 2, base_rate: 11000 },
    { code: "TWN", name_ja: "ツイン", name_zh: "双床房", capacity: 2, base_rate: 12500 },
    { code: "JPN", name_ja: "和室", name_zh: "和室", capacity: 4, base_rate: 18000 },
  ];
  const insType = conn.prepare(
    "INSERT INTO room_types (code, name_ja, name_zh, capacity, base_rate) VALUES (?, ?, ?, ?, ?)",
  );
  for (const t of types)
    insType.run(t.code, t.name_ja, t.name_zh, t.capacity, t.base_rate);

  const insRoom = conn.prepare(
    "INSERT INTO rooms (number, floor, type_id, status) VALUES (?, ?, ?, ?)",
  );
  const layout = [1, 1, 1, 2, 2, 3];
  for (let floor = 2; floor <= 4; floor++) {
    layout.forEach((typeId, i) => {
      const t = floor === 4 && i >= 4 ? 4 : typeId;
      insRoom.run(`${floor}0${i + 1}`, floor, t, "clean");
    });
  }
  const rooms = conn.prepare("SELECT * FROM rooms").all() as unknown as Room[];

  const names = [
    "山田 太郎", "佐藤 花子", "鈴木 一郎", "高橋 美咲", "田中 健",
    "伊藤 由美", "渡辺 翔", "中村 さくら", "小林 大輔", "加藤 愛",
    "王 伟", "李 娜", "张 敏", "刘 洋", "陈 静",
    "John Smith", "Emma Brown", "Kim Minjun", "Nguyen Van An", "Maria Garcia",
  ];
  const channels: Channel[] = [
    "direct", "booking", "booking", "expedia", "rakuten", "rakuten", "jalan", "walkin",
  ];
  const t0 = today();
  const insRes = conn.prepare(`INSERT INTO reservations
    (code, guest_name, phone, email, adults, room_id, check_in, check_out, status, channel, rate, pin, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)`);
  const insPay = conn.prepare(
    "INSERT INTO payments (reservation_id, amount, method, paid_on) VALUES (?, ?, ?, ?)",
  );
  const typeById = new Map(
    (conn.prepare("SELECT * FROM room_types").all() as unknown as RoomType[]).map(
      (t) => [t.id, t],
    ),
  );

  let seq = 1000;
  for (const room of rooms) {
    let cursor = addDays(t0, -21 + Math.floor(rand() * 3));
    const end = addDays(t0, 21);
    while (cursor < end) {
      cursor = addDays(cursor, Math.floor(rand() * 3));
      const len = 1 + Math.floor(rand() * 3);
      const ci = cursor;
      const co = addDays(ci, len);
      cursor = co;
      if (rand() < 0.25) continue;
      const type = typeById.get(room.type_id)!;
      const rate = type.base_rate + Math.floor(rand() * 4) * 500;
      let status: ReservationStatus = "booked";
      if (co <= t0) status = "checked_out";
      else if (ci < t0) status = "in_house";
      else if (ci === t0 && rand() < 0.4) status = "in_house";
      const name = pick(names);
      const code = `R${++seq}`;
      const result = insRes.run(
        code,
        name,
        `090-${1000 + Math.floor(rand() * 9000)}-${1000 + Math.floor(rand() * 9000)}`,
        `guest${seq}@example.com`,
        1 + Math.floor(rand() * type.capacity),
        room.id,
        ci,
        co,
        status,
        pick(channels),
        rate,
        status === "booked" ? null : randomPin(rand),
        addDays(ci, -Math.floor(rand() * 30) - 1),
      );
      if (status === "checked_out") {
        insPay.run(
          Number(result.lastInsertRowid),
          rate * len,
          pick(["cash", "card", "card", "qr"]),
          co,
        );
      }
    }
  }

  // Rooms vacated today need cleaning; a few random rooms are mid-inspection.
  conn.exec(`UPDATE rooms SET status = 'dirty' WHERE id IN
    (SELECT room_id FROM reservations WHERE status = 'checked_out' AND check_out = '${t0}')`);
  const anyRoom = rooms[Math.floor(rand() * rooms.length)];
  conn.prepare("UPDATE rooms SET status = 'inspecting' WHERE id = ? AND status = 'clean'").run(anyRoom.id);
  // Room 305 is out of service: move its current and future bookings off the books.
  conn.prepare(`UPDATE reservations SET status = 'cancelled'
    WHERE check_out > ? AND room_id = (SELECT id FROM rooms WHERE number = '305')`).run(t0);
  conn.prepare("UPDATE rooms SET status = 'ooo' WHERE number = '305'").run();
}
