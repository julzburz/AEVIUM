import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";
import { Bot, CheckCircle2, XCircle, Trash2, Plus, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AiSettingsSection() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleTestBuiltin() {
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await customFetch<{ ok: boolean; message: string }>(`/api/projects/0/ai-credentials/test`, {
        method: "POST",
        body: JSON.stringify({ provider: "replit" }),
      });
      setTestResult(resp);
      toast({
        title: resp.ok ? t("settings.ai.testOk") : t("settings.ai.testFail"),
        variant: resp.ok ? "default" : "destructive",
      });
    } catch (e) {
      setTestResult({ ok: false, message: String(e) });
      toast({ variant: "destructive", title: t("settings.ai.testFail"), description: String(e) });
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold border-b pb-2">{t("settings.ai")}</h2>
      <p className="text-sm text-muted-foreground">{t("settings.ai.desc")}</p>

      {/* Built-in Gemini */}
      <div className="border rounded-lg bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{t("settings.ai.replit")}</p>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  <Zap className="w-2.5 h-2.5 mr-0.5" />
                  Default
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.ai.replitDesc")}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-xs h-8"
            onClick={handleTestBuiltin}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3 mr-1.5" />
            )}
            Test
          </Button>
        </div>

        {testResult && (
          <div className={`flex items-center gap-1.5 text-xs rounded p-2 ${testResult.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
            {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Info about per-project credentials */}
      <div className="border rounded-lg bg-card/50 p-4">
        <div className="flex items-start gap-2">
          <Plus className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">{t("settings.ai.addKey")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("settings.ai.noCredentials")}
            </p>
            <p className="text-xs text-muted-foreground mt-1 opacity-70">
              Custom API keys can be configured per project in the project settings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
