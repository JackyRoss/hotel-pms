import Link from "next/link";
import { CHANNELS } from "@/lib/db";
import { addDays, isDate, today } from "@/lib/dates";
import { getDict } from "@/lib/i18n";
import { rooms, roomTypes } from "@/lib/queries";
import { NewReservationForm } from "./NewReservationForm";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { lang, t } = await getDict();
  const types = new Map(roomTypes().map((x) => [x.id, x]));
  const options = rooms()
    .filter((r) => r.status !== "ooo")
    .map((r) => {
      const type = types.get(r.type_id)!;
      return {
        id: r.id,
        label: `${r.number} — ${lang === "zh" ? type.name_zh : type.name_ja}`,
        rate: type.base_rate,
        capacity: type.capacity,
      };
    });
  const checkIn = isDate(sp.date) ? sp.date : today();

  return (
    <>
      <div className="row between">
        <h1>{t.actions.newReservation}</h1>
        <Link href="/reservations">← {t.actions.back}</Link>
      </div>
      <NewReservationForm
        rooms={options}
        channels={CHANNELS.map((c) => ({ value: c, label: t.channel[c] }))}
        labels={{ ...t.fields, ...t.errors, save: t.actions.save }}
        defaults={{ roomId: Number(sp.room) || 0, checkIn, checkOut: addDays(checkIn, 1) }}
      />
    </>
  );
}
