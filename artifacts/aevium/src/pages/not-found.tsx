import { useI18n } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <FileQuestion className="w-16 h-16 text-muted-foreground mx-auto opacity-40" />
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-not-found-title">
          {t('notFound.title')}
        </h1>
        <p className="text-muted-foreground" data-testid="text-not-found-message">
          {t('notFound.message')}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/" data-testid="link-go-home">{t('nav.dashboard')}</Link>
        </Button>
      </div>
    </div>
  );
}
