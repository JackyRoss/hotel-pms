import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { LangSwitch } from "../LangSwitch";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getDict();
  return (
    <div className="shell">
      <nav className="side">
        <div className="brand">🏨 {t.appName}</div>
        <Link href="/">{t.nav.dashboard}</Link>
        <Link href="/rooms">{t.nav.rooms}</Link>
        <Link href="/reservations">{t.nav.reservations}</Link>
        <Link href="/calendar">{t.nav.calendar}</Link>
        <Link href="/housekeeping">{t.nav.housekeeping}</Link>
        <Link href="/reports">{t.nav.reports}</Link>
        <Link href="/kiosk" target="_blank">↗ {t.nav.kiosk}</Link>
        <div className="spacer" />
        <LangSwitch lang={lang} label={t.langSwitch} />
      </nav>
      <main className="main">
        {children}
        <p className="note">{t.demoNote}</p>
      </main>
    </div>
  );
}
