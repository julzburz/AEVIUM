import { useState } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n";
import { useUpdateProfile } from "@/lib/useProfile";
import { Sun, Moon, Monitor, Globe, Info, Palette, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

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
      {/* Page header */}
      <div className="border-b px-8 py-5">
        <h1 className="text-xl font-semibold" data-testid="text-settings-title">
          {t("settings.title")}
        </h1>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-52 shrink-0 border-r p-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors",
                activeTab === item.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {item.icon}
              {isEs ? item.labelEs : item.labelEn}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Appearance */}
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
                  <button
                    key={opt.value}
                    data-testid={`option-theme-${opt.value}`}
                    onClick={() => handleSetTheme(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-2.5 border rounded-xl p-4 transition-all",
                      theme === opt.value
                        ? "border-primary bg-primary/8 ring-2 ring-primary/30"
                        : "hover:border-border/80 hover:bg-muted/40"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg", theme === opt.value ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                      {opt.icon}
                    </div>
                    <span className={cn("text-sm font-medium", theme === opt.value ? "text-primary" : "")}>
                      {isEs ? opt.labelEs : opt.labelEn}
                    </span>
                    {theme === opt.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Language */}
          {activeTab === "language" && (
            <div className="max-w-lg space-y-6">
              <div>
                <h2 className="text-base font-semibold">{isEs ? "Idioma" : "Language"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("settings.language.desc")}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "es" as const, flag: "🇪🇸", label: "Español", sublabel: "Español" },
                  { value: "en" as const, flag: "🇬🇧", label: "English", sublabel: "English" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    data-testid={`option-lang-${opt.value}`}
                    onClick={() => handleSetLang(opt.value)}
                    className={cn(
                      "flex items-center gap-3 border rounded-xl p-4 transition-all text-left",
                      lang === opt.value
                        ? "border-primary bg-primary/8 ring-2 ring-primary/30"
                        : "hover:border-border/80 hover:bg-muted/40"
                    )}
                  >
                    <span className="text-2xl">{opt.flag}</span>
                    <div>
                      <p className={cn("text-sm font-medium", lang === opt.value ? "text-primary" : "")}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.sublabel}</p>
                    </div>
                    {lang === opt.value && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI */}
          {activeTab === "ai" && (
            <div className="max-w-lg space-y-6">
              <div>
                <h2 className="text-base font-semibold">{isEs ? "Inteligencia Artificial" : "Artificial Intelligence"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isEs ? "Configuración global de IA para AEVIUM." : "Global AI configuration for AEVIUM."}
                </p>
              </div>

              {/* Built-in info card */}
              <div className="border rounded-xl p-5 bg-card space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t("settings.ai.replit")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.ai.replitDesc")}</p>
                  </div>
                  <div className="ml-auto px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-medium border border-green-500/20">
                    {isEs ? "Activo" : "Active"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-dashed p-4 bg-muted/20">
                <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {isEs
                    ? "Para conectar tu cuenta personal de Gemini, OpenAI o Claude, ve a los ajustes de tu proyecto y selecciona la pestaña «IA»."
                    : "To connect your personal Gemini, OpenAI, or Claude account, go to your project settings and select the «AI» tab."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
