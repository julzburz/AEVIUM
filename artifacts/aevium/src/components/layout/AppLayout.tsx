import { Link, useLocation } from "wouter";
import { UserMenu } from "@/components/navigation/UserMenu";
import { ThemeToggle, LangToggle } from "@/components/navigation/ThemeLangToggle";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={`${basePath}/logo.svg`} alt="AEVIUM Logo" className="w-8 h-8" />
            <span className="font-bold tracking-tight text-lg hidden sm:inline-block">AEVIUM</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
          <div className="w-px h-4 bg-border mx-2" />
          <UserMenu />
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
