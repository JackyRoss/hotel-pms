import { addDays, today } from "@/lib/dates";
import { getDict, yen } from "@/lib/i18n";
import { channelStats, dailyStats, rooms } from "@/lib/queries";

export default async function ReportsPage() {
  const { t } = await getDict();
  const to = addDays(today(), 1);
  const from = addDays(to, -30);
  const stats = dailyStats(from, 30).reverse();
  const sellable = rooms().filter((r) => r.status !== "ooo").length;
  const sold = stats.reduce((a, s) => a + s.sold, 0);
  const revenue = stats.reduce((a, s) => a + s.revenue, 0);
  const max = Math.max(1, ...stats.map((s) => s.revenue));
  const channels = channelStats(from, to);

  return (
    <>
      <h1>{t.reports.title}</h1>
      <div className="grid kpis">
        <div className="panel kpi">
          <div className="label">{t.reports.revenue}</div>
          <div className="value">{yen(revenue)}</div>
        </div>
        <div className="panel kpi">
          <div className="label">{t.reports.sold}</div>
          <div className="value">{sold}</div>
        </div>
        <div className="panel kpi">
          <div className="label">{t.reports.adr}</div>
          <div className="value">{yen(sold ? Math.round(revenue / sold) : 0)}</div>
        </div>
        <div className="panel kpi">
          <div className="label">{t.reports.occ}</div>
          <div className="value">{Math.round((sold / (sellable * 30)) * 100)}%</div>
        </div>
      </div>
      <div className="grid two">
        <section className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.reports.date}</th>
                <th className="num">{t.reports.sold}</th>
                <th className="num">{t.reports.occ}</th>
                <th className="num">{t.reports.revenue}</th>
                <th style={{ width: "35%" }} />
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.date}>
                  <td>{s.date}</td>
                  <td className="num">{s.sold}</td>
                  <td className="num">{Math.round((s.sold / sellable) * 100)}%</td>
                  <td className="num">{yen(s.revenue)}</td>
                  <td>
                    <div style={{ height: 8, width: `${(s.revenue / max) * 100}%`, background: "var(--accent)", borderRadius: 4 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>{t.reports.byChannel}</h2>
          <table>
            <thead>
              <tr>
                <th>{t.fields.channel}</th>
                <th className="num">#</th>
                <th className="num">{t.reports.revenue}</th>
              </tr>
            </thead>
            <tbody>
              {channels.map(([c, v]) => (
                <tr key={c}>
                  <td>{t.channel[c as keyof typeof t.channel]}</td>
                  <td className="num">{v.count}</td>
                  <td className="num">{yen(v.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
