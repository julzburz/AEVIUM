import { useState, useRef } from "react";
import mammoth from "mammoth";
import { useI18n } from "@/lib/i18n";
import { useCreateWorldRule, getListWorldRulesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, CheckCircle2, XCircle, Sparkles, Globe } from "lucide-react";

interface ParsedRule {
  title: string;
  category: string | null;
  content: string;
  selected: boolean;
}

type ImportStatus = "idle" | "extracting" | "analyzing" | "done" | "error";

interface WorldRuleImportDialogProps {
  projectId: number;
  open: boolean;
  onClose: () => void;
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "docx") {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

export function WorldRuleImportDialog({ projectId, open, onClose }: WorldRuleImportDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const createRule = useCreateWorldRule();

  const [status, setStatus] = useState<ImportStatus>("idle");
  const [rules, setRules] = useState<ParsedRule[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setStatus("idle"); setRules([]); setImporting(false); setError(null); };
  const handleClose = () => { reset(); onClose(); };

  const processFile = async (file: File) => {
    reset();
    try {
      setStatus("extracting");
      const text = await extractText(file);

      setStatus("analyzing");
      const res = await fetch("/api/ai/import-world-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, text }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json() as { worldRules: Omit<ParsedRule, "selected">[] };

      setRules(data.worldRules.map(r => ({ ...r, selected: true })));
      setStatus("done");
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  };

  const handleFilePick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    processFile(files[0]);
  };

  const toggle = (idx: number) =>
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));

  const handleImport = async () => {
    const selected = rules.filter(r => r.selected);
    if (selected.length === 0) return;

    setImporting(true);
    try {
      for (const rule of selected) {
        await new Promise<void>((resolve, reject) => {
          createRule.mutate(
            { projectId, data: { title: rule.title, content: rule.content, category: rule.category ?? null } },
            { onSuccess: () => resolve(), onError: reject }
          );
        });
      }
      await qc.invalidateQueries({ queryKey: getListWorldRulesQueryKey(projectId) });
      toast({ title: t('editor.import.worldRules.success') });
      handleClose();
    } catch {
      toast({ title: t('editor.import.error'), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = rules.filter(r => r.selected).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {t('editor.import.worldRules.title')}
          </DialogTitle>
          <DialogDescription>{t('editor.import.worldRules.desc')}</DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); handleFilePick(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">{t('editor.import.dropOrClick')}</p>
            <p className="text-xs text-muted-foreground/60 mt-2">{t('editor.import.supported')}</p>
          </div>
        )}

        {(status === "extracting" || status === "analyzing") && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              {status === "extracting" ? t('editor.import.aiExtracting') : t('editor.import.worldRules.analyzing')}
            </div>
            <Progress value={status === "extracting" ? 40 : 80} className="h-1.5" />
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive py-4">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error ?? t('editor.import.error')}</span>
          </div>
        )}

        {status === "done" && rules.length > 0 && (
          <div className="flex flex-col gap-2 overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              {rules.length} {t('editor.import.worldRules.found')} — {t('editor.import.worldRules.selectHint')}
            </p>
            <ScrollArea className="h-[340px]">
              <div className="space-y-2 pr-1">
                {rules.map((rule, i) => (
                  <div
                    key={i}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${rule.selected ? "border-primary/50 bg-primary/5" : "border-border/50 bg-muted/10 opacity-50"}`}
                    onClick={() => toggle(i)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-4 h-4 mt-0.5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${rule.selected ? "bg-primary border-primary" : "border-border"}`}>
                        {rule.selected && <span className="text-primary-foreground text-[10px] font-bold leading-none">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-sm font-semibold">{rule.title}</span>
                          {rule.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground border-border font-medium capitalize">
                              {rule.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{rule.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => fileRef.current?.click()}>
                <Upload className="w-3 h-3 mr-1.5" />{t('editor.import.addMore')}
              </Button>
              <span className="text-xs text-muted-foreground">{selectedCount} {t('editor.import.worldRules.selected')}</span>
            </div>
          </div>
        )}

        {status === "done" && rules.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">{t('editor.import.worldRules.none')}</p>
        )}

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".docx,.txt,.md,.markdown"
          onChange={(e) => handleFilePick(e.target.files)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('form.cancel')}</Button>
          {status === "error" && (
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              {t('editor.import.dropOrClick')}
            </Button>
          )}
          {status === "done" && (
            <Button onClick={handleImport} disabled={selectedCount === 0 || importing}>
              {importing ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
              {importing ? t('editor.import.importing') : `${t('editor.import.worldRules.import')} (${selectedCount})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
