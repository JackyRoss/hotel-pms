import { setLang } from "@/lib/actions";
import type { Lang } from "@/lib/i18n";

export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  return (
    <form action={setLang}>
      <input type="hidden" name="lang" value={lang === "ja" ? "zh" : "ja"} />
      <button type="submit">🌐 {label}</button>
    </form>
  );
}
