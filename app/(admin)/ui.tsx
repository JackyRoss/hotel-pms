import Link from "next/link";
import { nights } from "@/lib/db";
import { getDict, yen } from "@/lib/i18n";
import type { ReservationRow } from "@/lib/queries";

export function Badge({ kind, label }: { kind: string; label: string }) {
  return <span className={`badge b-${kind}`}>{label}</span>;
}

export async function ReservationTable({
  rows,
  emptyText,
}: {
  rows: ReservationRow[];
  emptyText?: string;
}) {
  const { t } = await getDict();
  if (rows.length === 0) return <p style={{ color: "var(--muted)" }}>{emptyText ?? t.dashboard.none}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t.fields.code}</th>
            <th>{t.fields.guest}</th>
            <th>{t.fields.room}</th>
            <th>{t.fields.checkIn}</th>
            <th>{t.fields.checkOut}</th>
            <th className="num">{t.fields.total}</th>
            <th>{t.fields.channel}</th>
            <th>{t.fields.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link href={`/reservations/${r.id}`}>{r.code}</Link>
              </td>
              <td>{r.guest_name}</td>
              <td>{r.room_number}</td>
              <td>{r.check_in}</td>
              <td>{r.check_out}</td>
              <td className="num">{yen(r.rate * nights(r.check_in, r.check_out))}</td>
              <td>{t.channel[r.channel]}</td>
              <td>
                <Badge kind={r.status} label={t.status[r.status]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
