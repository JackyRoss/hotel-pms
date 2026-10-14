import { setRoomStatus } from "@/lib/actions";
import type { RoomStatus } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { rooms, roomTypes } from "@/lib/queries";
import { Badge } from "../ui";

const ORDER: Record<RoomStatus, number> = { dirty: 0, inspecting: 1, clean: 2, ooo: 3 };

export default async function HousekeepingPage() {
  const { lang, t } = await getDict();
  const types = new Map(roomTypes().map((x) => [x.id, x]));
  const list = rooms().sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.number.localeCompare(b.number));
  const todo = list.filter((r) => r.status === "dirty" || r.status === "inspecting");

  const button = (id: number, status: RoomStatus, label: string, primary = false) => (
    <form action={setRoomStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={primary ? "primary" : ""}>{label}</button>
    </form>
  );

  return (
    <div className="hk">
      <h1>{t.housekeeping.title}</h1>
      <p style={{ color: "var(--muted)", marginTop: -8 }}>{t.housekeeping.hint}</p>
      <h2>
        {t.housekeeping.todo}（{todo.length}）
      </h2>
      {list.map((room) => {
        const type = types.get(room.type_id)!;
        return (
          <div key={room.id} className="panel card">
            <div>
              <div className="no">{room.number}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {lang === "zh" ? type.name_zh : type.name_ja}
              </div>
            </div>
            <Badge kind={room.status} label={t.roomStatus[room.status]} />
            <div className="row" style={{ justifyContent: "flex-end" }}>
              {room.status === "dirty" && button(room.id, "inspecting", t.actions.markInspecting, true)}
              {room.status === "inspecting" && button(room.id, "clean", t.actions.markClean, true)}
              {room.status === "clean" && button(room.id, "dirty", t.actions.markDirty)}
              {room.status === "ooo" && button(room.id, "dirty", t.actions.markDirty)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
