import Link from "next/link";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { reservationByCode } from "@/lib/queries";

export default async function KioskDonePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { code } = await searchParams;
  const r = code ? reservationByCode(code) : undefined;
  if (!r || r.status !== "in_house") redirect("/kiosk");
  const { t } = await getDict();

  return (
    <div className="kiosk">
      <div className="card">
        <h1>✅ {t.kiosk.done}</h1>
        <p>{t.kiosk.yourRoom}</p>
        <div className="big">{r.room_number}</div>
        <p>{t.kiosk.yourPin}</p>
        <div className="big">{r.pin}</div>
        <p>{t.kiosk.enjoy}</p>
        <Link className="btn" href="/kiosk" style={{ marginTop: 12 }}>
          {t.kiosk.restart}
        </Link>
      </div>
    </div>
  );
}
