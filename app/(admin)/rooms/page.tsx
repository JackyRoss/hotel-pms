import Link from "next/link";
import { addDays, today } from "@/lib/dates";
import { getDict } from "@/lib/i18n";
import { reservationsInRange, rooms, roomTypes } from "@/lib/queries";
import { Badge } from "../ui";

export default async function RoomsPage() {
  const { lang, t } = await getDict();
  const d = today();
  const types = new Map(roomTypes().map((x) => [x.id, x]));
  const tonight = new Map(
    reservationsInRange(d, addDays(d, 1))
      .filter((r) => r.status === "in_house")
      .map((r) => [r.room_id, r]),
  );
  const all = rooms();
  const floors = [...new Set(all.map((r) => r.floor))].sort();

  return (
    <>
      <h1>{t.nav.rooms}</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        {(["occupied", "clean", "dirty", "inspecting", "ooo"] as const).map((k) => (
          <Badge key={k} kind={k} label={t.roomStatus[k]} />
        ))}
      </div>
      {floors.map((f) => (
        <section key={f} className="floor">
          <h2>
            {f}
            {t.fields.floor}
          </h2>
          <div className="rack">
            {all
              .filter((r) => r.floor === f)
              .map((room) => {
                const stay = tonight.get(room.id);
                const type = types.get(room.type_id)!;
                return (
                  <div key={room.id} className={`room s-${room.status} ${stay ? "occ" : ""}`}>
                    <div className="row between">
                      <span className="no">{room.number}</span>
                      <Badge kind={room.status} label={t.roomStatus[room.status]} />
                    </div>
                    <div className="sub">{lang === "zh" ? type.name_zh : type.name_ja}</div>
                    {stay ? (
                      <div style={{ marginTop: 6 }}>
                        <Link href={`/reservations/${stay.id}`}>{stay.guest_name}</Link>
                        <div className="sub">
                          〜{stay.check_out}
                        </div>
                      </div>
                    ) : (
                      <div className="sub" style={{ marginTop: 6 }}>—</div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}
