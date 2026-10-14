import Link from "next/link";
import { nights } from "@/lib/db";
import { addDays, isDate, today, weekday } from "@/lib/dates";
import { getDict } from "@/lib/i18n";
import { reservationsInRange, rooms, type ReservationRow } from "@/lib/queries";

const DAYS = 14;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { t } = await getDict();
  const t0 = today();
  const start = isDate(sp.start) ? sp.start : addDays(t0, -2);
  const end = addDays(start, DAYS);
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  const byRoom = new Map<number, ReservationRow[]>();
  for (const r of reservationsInRange(start, end)) {
    byRoom.set(r.room_id, [...(byRoom.get(r.room_id) ?? []), r]);
  }

  return (
    <>
      <div className="row between">
        <h1>{t.calendar.title}</h1>
        <div className="row">
          <Link className="btn" href={`/calendar?start=${addDays(start, -7)}`}>
            ← {t.calendar.prev}
          </Link>
          <Link className="btn" href={`/calendar?start=${addDays(t0, -2)}`}>
            {t.calendar.today}
          </Link>
          <Link className="btn" href={`/calendar?start=${addDays(start, 7)}`}>
            {t.calendar.next} →
          </Link>
        </div>
      </div>
      <section className="panel table-wrap" style={{ padding: 0 }}>
        <table className="tl">
          <thead>
            <tr>
              <th className="room-col">{t.fields.room}</th>
              {days.map((d) => {
                const wd = weekday(d);
                return (
                  <th key={d} className={`${wd === 0 || wd === 6 ? "wkend" : ""} ${d === t0 ? "today" : ""}`}>
                    {d.slice(5).replace("-", "/")}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rooms().map((room) => {
              const list = byRoom.get(room.id) ?? [];
              const cells: React.ReactNode[] = [];
              for (let i = 0; i < DAYS; ) {
                const d = days[i];
                const r = list.find((x) => x.check_in <= d && x.check_out > d);
                if (r) {
                  const span = Math.min(nights(d, r.check_out), DAYS - i);
                  cells.push(
                    <td key={d} colSpan={span}>
                      <Link
                        className={`bar st-${r.status}`}
                        href={`/reservations/${r.id}`}
                        title={`${r.code} ${r.guest_name} ${r.check_in}〜${r.check_out}`}
                      >
                        {r.guest_name}
                      </Link>
                    </td>,
                  );
                  i += span;
                } else {
                  cells.push(
                    <td key={d}>
                      {room.status !== "ooo" && d >= t0 && (
                        <Link href={`/reservations/new?room=${room.id}&date=${d}`} title={t.actions.newReservation}
                          style={{ display: "block", textAlign: "center", color: "var(--line)" }}>
                          +
                        </Link>
                      )}
                    </td>,
                  );
                  i += 1;
                }
              }
              return (
                <tr key={room.id}>
                  <td className="room-col">
                    <strong>{room.number}</strong>
                  </td>
                  {cells}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
