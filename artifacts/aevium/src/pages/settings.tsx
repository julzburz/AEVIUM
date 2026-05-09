import { useState } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n";
import { useUpdateProfile } from "@/lib/useProfile";
import { Sun, Moon, Monitor, Globe, Palette, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiSettingsSection } from "@/components/settings/AiSettingsSection";

type SettingsTab = "appearance" | "language" | "ai";

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const isEs = lang === "es";
  const { theme, setTheme } = useTheme();
  const updateProfile = useUpdateProfile();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  const handleSetTheme = (value: string) => {
    setTheme(value);
    updateProfile.mutate({ theme: value });
  };

  const handleSetLang = (value: "en" | "es") => {
    setLang(value);
    updateProfile.mutate({ language: value });
  };

  const navItems: { id: SettingsTab; labelEs: string; labelEn: string; icon: React.ReactNode }[] = [
    { id: "appearance", labelEs: "Apariencia", labelEn: "Appearance", icon: <Palette className="w-4 h-4" /> },
    { id: "language", labelEs: "Idioma", labelEn: "Language", icon: <Globe className="w-4 h-4" /> },
    { id: "ai", labelEs: "Inteligencia Artificial", labelEn: "Artificial Intelligence", icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b px-8 py-5">
        <h1 className="text-xl font-semibold" data-testid="text-settings-title">{t("settings.title")}</h1>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-52 shrink-0 border-r p-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors",
                activeTab === item.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-secondary hover:bg-secondary/15")}>
              {item.icon}
              {isEs ? item.labelEs : item.labelEn}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">

          {activeTab === "appearance" && (
            <div className="max-w-lg space-y-6">
              <div>
                <h2 className="text-base font-semibold">{isEs ? "Apariencia" : "Appearance"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("settings.theme.desc")}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "light", icon: <Sun className="w-5 h-5" />, labelEs: "Claro", labelEn: "Light" },
                  { value: "dark", icon: <Moon className="w-5 h-5" />, labelEs: "Oscuro", labelEn: "Dark" },
                  { value: "system", icon: <Monitor className="w-5 h-5" />, labelEs: "Sistema", labelEn: "System" },
                ].map((opt) => (
                  <button key={opt.value} data-testid={`option-theme-${opt.value}`} onClick={() => handleSetTheme(opt.value)}
                    className={cn("flex flex-col items-center gap-2.5 border rounded-xl p-4 transition-all",
                      theme === opt.value ? "border-primary bg-primary/8 ring-2 ring-primary/30" : "hover:border-border/80 hover:bg-muted/40")}>
                    <div className={cn("p-2 rounded-lg", theme === opt.value ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                      {opt.icon}
                    </div>
                    <span className={cn("text-sm font-medium", theme === opt.value ? "text-primary" : "")}>
                      {isEs ? opt.labelEs : opt.labelEn}
                    </span>
                    {theme === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "language" && (
            <div className="max-w-lg space-y-6">
              <div>
                <h2 className="text-base font-semibold">{isEs ? "Idioma" : "Language"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("settings.language.desc")}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "es" as const, flag: "🇪🇸", label: "Español", sublabel: "Spanish" },
                  { value: "en" as const, flag: "🇬🇧", label: "English", sublabel: "Inglés" },
                ].map((opt) => (
                  <button key={opt.value} data-testid={`option-lang-${opt.value}`} onClick={() => handleSetLang(opt.value)}
                    className={cn("flex items-center gap-3 border rounded-xl p-4 transition-all text-left",
                      lang === opt.value ? "border-primary bg-primary/8 ring-2 ring-primary/30" : "hover:border-border/80 hover:bg-muted/40")}>
                    <span className="text-2xl">{opt.flag}</span>
                    <div>
                      <p className={cn("text-sm font-medium", lang === opt.value ? "text-primary" : "")}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.sublabel}</p>
                    </div>
                    {lang === opt.value && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="max-w-lg">
              <AiSettingsSection />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
