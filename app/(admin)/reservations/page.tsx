import Link from "next/link";
import { isDate } from "@/lib/dates";
import { getDict } from "@/lib/i18n";
import { searchReservations } from "@/lib/queries";
import { ReservationTable } from "../ui";

const STATUSES = ["booked", "in_house", "checked_out", "cancelled"] as const;

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { t } = await getDict();
  const status = STATUSES.find((s) => s === sp.status);
  const rows = searchReservations({
    q: sp.q?.trim() || undefined,
    status,
    from: isDate(sp.from) ? sp.from : undefined,
    to: isDate(sp.to) ? sp.to : undefined,
  });

  return (
    <>
      <div className="row between">
        <h1>{t.nav.reservations}</h1>
        <Link className="btn primary" href="/reservations/new">
          + {t.actions.newReservation}
        </Link>
      </div>
      <form className="panel row" style={{ marginBottom: 14 }}>
        <input name="q" defaultValue={sp.q} placeholder={t.filters.keyword} style={{ maxWidth: 220 }} />
        <select name="status" defaultValue={status ?? ""} style={{ maxWidth: 160 }}>
          <option value="">{t.filters.all}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.status[s]}
            </option>
          ))}
        </select>
        <span style={{ color: "var(--muted)" }}>{t.filters.from}</span>
        <input type="date" name="from" defaultValue={sp.from} style={{ maxWidth: 160 }} />
        〜
        <input type="date" name="to" defaultValue={sp.to} style={{ maxWidth: 160 }} />
        <button type="submit">{t.actions.search}</button>
      </form>
      <section className="panel">
        <ReservationTable rows={rows} />
      </section>
    </>
  );
}
