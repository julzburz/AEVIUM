import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Info, XCircle, RefreshCw, Clock, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContinuityAlert {
  id: number;
  projectId: number;
  sceneId?: number | null;
  message: string;
  severity: "info" | "warning" | "error";
  isResolved: boolean;
  dismissedAs?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

interface ContinuityPanelProps {
  projectId: number;
  sceneId?: number;
}

function SeverityIcon({ severity }: { severity: ContinuityAlert["severity"] }) {
  if (severity === "error") return <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
}

function severityBg(severity: ContinuityAlert["severity"]) {
  if (severity === "error") return "border-destructive/40 bg-destructive/5";
  if (severity === "warning") return "border-yellow-500/30 bg-yellow-500/5";
  return "border-blue-400/30 bg-blue-400/5";
}

function isDismissed(alert: ContinuityAlert) {
  return alert.isResolved || !!alert.dismissedAs;
}

export function ContinuityPanel({ projectId, sceneId }: ContinuityPanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");

  const { data: alerts = [], isLoading, refetch } = useQuery<ContinuityAlert[]>({
    queryKey: ["continuity-alerts", projectId, sceneId],
    queryFn: async () => {
      const url = sceneId
        ? `/api/projects/${projectId}/continuity-alerts?sceneId=${sceneId}`
        : `/api/projects/${projectId}/continuity-alerts`;
      return customFetch<ContinuityAlert[]>(url);
    },
    staleTime: 30_000,
  });

  async function handleResolve(id: number) {
    try {
      await customFetch(`/api/projects/${projectId}/continuity-alerts/${id}/resolve`, {
        method: "PATCH",
      });
      qc.invalidateQueries({ queryKey: ["continuity-alerts", projectId] });
      toast({ title: t("continuity.resolved") });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    }
  }

  async function handleDismiss(id: number, action: "postponed" | "ignored") {
    try {
      await customFetch(`/api/projects/${projectId}/continuity-alerts/${id}/dismiss`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      qc.invalidateQueries({ queryKey: ["continuity-alerts", projectId] });
      toast({ title: action === "postponed" ? t("continuity.postponed") : t("continuity.ignored") });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    }
  }

  const filtered = alerts.filter((a) => {
    if (filter === "open") return !isDismissed(a);
    if (filter === "resolved") return isDismissed(a);
    return true;
  });

  const openCount = alerts.filter((a) => !isDismissed(a)).length;

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">{t("editor.continuity")}</span>
          {openCount > 0 && (
            <Badge variant="destructive" className="text-[9px] h-4 px-1">{openCount}</Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex rounded border overflow-hidden text-[10px] shrink-0">
        {(["open", "all", "resolved"] as const).map((f) => (
          <button
            key={f}
            className={`flex-1 py-1 transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setFilter(f)}
          >
            {t(`continuity.filter.${f}`)}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500/40 mb-2" />
            <p className="text-xs text-muted-foreground">{t("continuity.empty")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-md border p-2 flex flex-col gap-1.5 ${severityBg(alert.severity)} ${isDismissed(alert) ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-1.5">
                  <SeverityIcon severity={alert.severity} />
                  <p className="text-[11px] leading-relaxed flex-1">{alert.message}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px] h-4 px-1">{alert.severity}</Badge>
                    {alert.dismissedAs && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">{alert.dismissedAs}</Badge>
                    )}
                    {alert.sceneId && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">#{alert.sceneId}</Badge>
                    )}
                  </div>
                  {!isDismissed(alert) && (
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-[9px] px-1.5 text-muted-foreground hover:text-foreground"
                        title={t("continuity.postpone")}
                        onClick={() => handleDismiss(alert.id, "postponed")}
                      >
                        <Clock className="w-2.5 h-2.5 mr-0.5" />
                        {t("continuity.postpone")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-[9px] px-1.5 text-muted-foreground hover:text-foreground"
                        title={t("continuity.ignore")}
                        onClick={() => handleDismiss(alert.id, "ignored")}
                      >
                        <EyeOff className="w-2.5 h-2.5 mr-0.5" />
                        {t("continuity.ignore")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-[9px] px-1.5 text-green-600 hover:text-green-700"
                        onClick={() => handleResolve(alert.id)}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                        {t("continuity.resolve")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
