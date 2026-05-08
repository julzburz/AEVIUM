import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n";
import { useUpdateProfile } from "@/lib/useProfile";
import { Moon, Sun, Monitor, Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const { t } = useI18n();
  const updateProfile = useUpdateProfile();

  const handleSetTheme = (value: string) => {
    setTheme(value);
    updateProfile.mutate({ theme: value });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9" aria-label={t('settings.theme')} data-testid="button-theme-toggle">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSetTheme("light")} data-testid="option-theme-light">
          <Sun className="mr-2 h-4 w-4" />
          {t('settings.theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetTheme("dark")} data-testid="option-theme-dark">
          <Moon className="mr-2 h-4 w-4" />
          {t('settings.theme.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetTheme("system")} data-testid="option-theme-system">
          <Monitor className="mr-2 h-4 w-4" />
          {t('settings.theme.system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  const updateProfile = useUpdateProfile();

  const handleSetLang = (value: "en" | "es") => {
    setLang(value);
    updateProfile.mutate({ language: value });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9" aria-label={t('settings.language')} data-testid="button-lang-toggle">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSetLang("en")} data-testid="option-lang-en">
          <span className={lang === 'en' ? 'font-bold' : ''}>{t('project.language.en')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetLang("es")} data-testid="option-lang-es">
          <span className={lang === 'es' ? 'font-bold' : ''}>{t('project.language.es')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
