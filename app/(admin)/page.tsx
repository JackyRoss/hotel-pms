import Link from "next/link";
import { getDict, yen } from "@/lib/i18n";
import { dashboard } from "@/lib/queries";
import { ReservationTable } from "./ui";

export default async function DashboardPage() {
  const { t } = await getDict();
  const d = dashboard();
  const kpis = [
    { label: t.dashboard.arrivals, value: d.arrivals.length },
    { label: t.dashboard.departures, value: d.departures.length },
    { label: t.dashboard.inHouse, value: d.inHouse },
    { label: t.dashboard.occupancy, value: `${Math.round(d.occupancy * 100)}%` },
    { label: t.dashboard.dirty, value: d.dirty, href: "/housekeeping" },
    { label: t.dashboard.revenueToday, value: yen(d.revenue) },
  ];
  return (
    <>
      <div className="row between">
        <h1>
          {t.dashboard.title} <span style={{ color: "var(--muted)", fontSize: 14 }}>{d.today}</span>
        </h1>
        <Link className="btn primary" href="/reservations/new">
          + {t.actions.newReservation}
        </Link>
      </div>
      <div className="grid kpis">
        {kpis.map((k) => (
          <div key={k.label} className="panel kpi">
            <div className="label">{k.href ? <Link href={k.href}>{k.label}</Link> : k.label}</div>
            <div className="value">{k.value}</div>
          </div>
        ))}
      </div>
      <div className="grid">
        <section className="panel">
          <h2>{t.dashboard.arrivalsList}</h2>
          <ReservationTable rows={d.arrivals} />
        </section>
        <section className="panel">
          <h2>{t.dashboard.departuresList}</h2>
          <ReservationTable rows={d.departures} />
        </section>
      </div>
    </>
  );
}
