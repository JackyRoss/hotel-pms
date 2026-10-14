import Link from "next/link";
import { kioskCheckIn, kioskFind } from "@/lib/actions";
import { nights } from "@/lib/db";
import { today } from "@/lib/dates";
import { getDict, yen } from "@/lib/i18n";
import { paidTotal, reservationByCode } from "@/lib/queries";
import { LangSwitch } from "../LangSwitch";

export default async function KioskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { lang, t } = await getDict();
  const r = sp.code ? reservationByCode(sp.code) : undefined;
  const valid = r && r.check_in === today() && (r.status === "booked" || r.status === "in_house");

  return (
    <div className="kiosk">
      <Link className="back" href="/">
        ← PMS
      </Link>
      <div className="lang">
        <LangSwitch lang={lang} label={t.langSwitch} />
      </div>
      <div className="card">
        {valid ? (
          <>
            <h1>{t.kiosk.confirm}</h1>
            <dl className="kv">
              <dt>{t.fields.code}</dt>
              <dd>{r.code}</dd>
              <dt>{t.fields.guest}</dt>
              <dd>{r.guest_name}</dd>
              <dt>{t.fields.checkIn}</dt>
              <dd>{r.check_in}</dd>
              <dt>{t.fields.checkOut}</dt>
              <dd>{r.check_out}</dd>
              <dt>{t.fields.balance}</dt>
              <dd>
                <strong>{yen(Math.max(0, r.rate * nights(r.check_in, r.check_out) - paidTotal(r.id)))}</strong>
              </dd>
            </dl>
            {r.status === "in_house" && <p>{t.kiosk.already}</p>}
            {r.status === "booked" && r.room_status !== "clean" ? (
              <div className="error">{t.kiosk.notReady}</div>
            ) : (
              <form action={kioskCheckIn}>
                <input type="hidden" name="code" value={r.code} />
                <button className="primary">{r.status === "in_house" ? t.kiosk.yourPin : t.kiosk.pay}</button>
              </form>
            )}
            <Link href="/kiosk" style={{ display: "block", marginTop: 14 }}>
              {t.actions.back}
            </Link>
          </>
        ) : (
          <>
            <h1>{t.kiosk.welcome}</h1>
            <p>{t.kiosk.lead}</p>
            {(sp.nf || sp.code) && <div className="error">{t.kiosk.notFound}</div>}
            <form action={kioskFind}>
              <input name="q" placeholder={t.kiosk.placeholder} autoFocus required />
              <button className="primary">{t.kiosk.find}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
