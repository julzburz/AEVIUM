import { useI18n } from "@/lib/i18n";
import { ThemeToggle, LangToggle } from "@/components/navigation/ThemeLangToggle";

export default function SettingsPage() {
  const { t } = useI18n();

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-3xl font-bold mb-8" data-testid="text-settings-title">{t('settings.title')}</h1>

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{t('settings.theme')}</h2>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div>
              <p className="font-medium">{t('settings.theme')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.theme.desc')}</p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{t('settings.language')}</h2>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div>
              <p className="font-medium">{t('settings.language')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.language.desc')}</p>
            </div>
            <LangToggle />
          </div>
        </section>
      </div>
    </div>
  );
}
