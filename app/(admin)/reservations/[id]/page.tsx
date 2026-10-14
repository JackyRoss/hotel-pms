import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelReservation, checkIn, checkOut, reissuePin } from "@/lib/actions";
import { nights } from "@/lib/db";
import { today } from "@/lib/dates";
import { getDict, yen } from "@/lib/i18n";
import { paidTotal, reservation, roomTypes } from "@/lib/queries";
import { Badge } from "../../ui";

export default async function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = reservation(Number(id));
  if (!r) notFound();
  const { lang, t } = await getDict();
  const type = roomTypes().find((x) => x.id === r.type_id)!;
  const n = nights(r.check_in, r.check_out);
  const total = r.rate * n;
  const paid = paidTotal(r.id);

  return (
    <>
      <div className="row between">
        <h1>
          {r.code} <Badge kind={r.status} label={t.status[r.status]} />
        </h1>
        <Link href="/reservations">← {t.actions.back}</Link>
      </div>
      <div className="grid two">
        <section className="panel">
          <dl className="kv">
            <dt>{t.fields.guest}</dt>
            <dd>{r.guest_name}</dd>
            <dt>{t.fields.phone}</dt>
            <dd>{r.phone || "—"}</dd>
            <dt>{t.fields.email}</dt>
            <dd>{r.email || "—"}</dd>
            <dt>{t.fields.adults}</dt>
            <dd>{r.adults}</dd>
            <dt>{t.fields.room}</dt>
            <dd>
              {r.room_number}（{lang === "zh" ? type.name_zh : type.name_ja}）
            </dd>
            <dt>{t.fields.checkIn}</dt>
            <dd>{r.check_in}</dd>
            <dt>{t.fields.checkOut}</dt>
            <dd>{r.check_out}</dd>
            <dt>{t.fields.nights}</dt>
            <dd>{n}</dd>
            <dt>{t.fields.channel}</dt>
            <dd>{t.channel[r.channel]}</dd>
            <dt>{t.fields.notes}</dt>
            <dd>{r.notes || "—"}</dd>
          </dl>
        </section>
        <section className="panel">
          <dl className="kv">
            <dt>{t.fields.rate}</dt>
            <dd>{yen(r.rate)}</dd>
            <dt>{t.fields.total}</dt>
            <dd>
              <strong>{yen(total)}</strong>
            </dd>
            <dt>{t.fields.paid}</dt>
            <dd>{yen(paid)}</dd>
            <dt>{t.fields.balance}</dt>
            <dd>{yen(Math.max(0, total - paid))}</dd>
            {r.status === "in_house" && (
              <>
                <dt>{t.fields.pin}</dt>
                <dd>
                  <strong style={{ fontSize: 20, letterSpacing: 2 }}>{r.pin}</strong>
                </dd>
              </>
            )}
          </dl>
          {r.status === "booked" && r.room_status !== "clean" && (
            <div className="error" style={{ marginTop: 18, marginBottom: 0 }}>
              {t.errors.roomNotReady}（{t.roomStatus[r.room_status]}）
            </div>
          )}
          <div className="row" style={{ marginTop: 18 }}>
            {r.status === "booked" && (
              <>
                <form action={checkIn}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="primary" disabled={r.check_in > today()}>
                    {t.actions.checkIn}
                  </button>
                </form>
                <form action={cancelReservation}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="danger">{t.actions.cancel}</button>
                </form>
              </>
            )}
            {r.status === "in_house" && (
              <>
                <form action={checkOut} className="row">
                  <input type="hidden" name="id" value={r.id} />
                  <select name="method" style={{ width: "auto" }}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="qr">QR (PayPay)</option>
                  </select>
                  <button className="primary">{t.actions.checkOut}</button>
                </form>
                <form action={reissuePin}>
                  <input type="hidden" name="id" value={r.id} />
                  <button>{t.actions.reissuePin}</button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
