import { useState, useRef } from "react";
import mammoth from "mammoth";
import { useI18n } from "@/lib/i18n";
import {
  useCreateChapter, useCreateScene, useListBooks,
  getListChaptersQueryKey, getListScenesQueryKey, getListBooksQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";

interface ParsedScene { title: string; content: string }
interface ParsedChapter { title: string; scenes: ParsedScene[] }

type FileStatus = "pending" | "extracting" | "analyzing" | "done" | "error";
interface FileEntry {
  file: File;
  status: FileStatus;
  chapter?: ParsedChapter;
  error?: string;
}

interface ImportDialogProps {
  projectId: number;
  bookId?: number | null;
  open: boolean;
  onClose: (rawText?: string) => void;
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

async function analyzeWithAI(
  text: string,
  filename: string,
  projectId: number
): Promise<ParsedChapter> {
  const res = await fetch("/api/ai/import-structure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, text, filename }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json() as { chapterTitle: string; scenes: { title: string; content: string }[] };
  return { title: data.chapterTitle, scenes: data.scenes };
}

export function ImportDialog({ projectId, bookId: initialBookId, open, onClose }: ImportDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(initialBookId ?? null);

  const { data: books = [] } = useListBooks(projectId, {
    query: { queryKey: getListBooksQueryKey(projectId) }
  });

  const createChapter = useCreateChapter();
  const createScene = useCreateScene();

  const effectiveBookId = selectedBookId ?? initialBookId ?? null;

  const handleReset = () => {
    setEntries([]);
    setProcessing(false);
    setImporting(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const setEntryStatus = (idx: number, patch: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  const processFiles = async (files: File[]) => {
    const rejected = files.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "doc";
    });
    if (rejected.length > 0) {
      toast({ title: t('editor.import.docLegacy'), variant: "destructive" });
    }

    const accepted = files.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ["docx", "txt", "md", "markdown"].includes(ext ?? "");
    });

    if (accepted.length === 0) return;

    const initial: FileEntry[] = accepted.map((f) => ({ file: f, status: "pending" }));
    setEntries(initial);
    setProcessing(true);

    for (let i = 0; i < accepted.length; i++) {
      const file = accepted[i];
      try {
        setEntryStatus(i, { status: "extracting" });
        const text = await extractText(file);

        setEntryStatus(i, { status: "analyzing" });
        const chapter = await analyzeWithAI(text, file.name, projectId);

        setEntryStatus(i, { status: "done", chapter });
      } catch (err) {
        setEntryStatus(i, { status: "error", error: String(err) });
      }
    }

    setProcessing(false);
  };

  const handleFilePick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    await processFiles(Array.from(e.dataTransfer.files));
  };

  const handleImport = async () => {
    if (!effectiveBookId) return;
    const ready = entries.filter((e) => e.status === "done" && e.chapter);
    if (ready.length === 0) return;

    setImporting(true);
    try {
      for (const entry of ready) {
        const ch = entry.chapter!;
        const newChapter = await new Promise<{ id: number }>((resolve, reject) => {
          createChapter.mutate(
            { bookId: effectiveBookId, data: { title: ch.title } },
            { onSuccess: resolve, onError: reject }
          );
        });
        await queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(effectiveBookId) });

        for (const scene of ch.scenes) {
          await new Promise<void>((resolve, reject) => {
            createScene.mutate(
              { chapterId: newChapter.id, data: { title: scene.title, content: scene.content } },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(newChapter.id) });
                  resolve();
                },
                onError: reject,
              }
            );
          });
        }
      }

      toast({ title: t('editor.import.success') });
      handleReset();
      onClose();
    } catch {
      toast({ title: t('editor.import.error'), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const doneCount = entries.filter((e) => e.status === "done").length;
  const totalScenes = entries
    .filter((e) => e.status === "done")
    .reduce((a, e) => a + (e.chapter?.scenes.length ?? 0), 0);
  const allDone = entries.length > 0 && !processing;
  const progressPct = entries.length > 0
    ? Math.round((entries.filter((e) => e.status === "done" || e.status === "error").length / entries.length) * 100)
    : 0;

  const statusIcon = (status: FileStatus) => {
    if (status === "done") return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
    if (status === "error") return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
    return <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />;
  };

  const statusLabel = (e: FileEntry) => {
    if (e.status === "extracting") return t('editor.import.aiExtracting');
    if (e.status === "analyzing") return t('editor.import.aiAnalyzing');
    if (e.status === "done") return `${e.chapter?.scenes.length ?? 0} ${t('editor.import.scenes')}`;
    if (e.status === "error") return t('editor.import.error');
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {t('editor.import.title')}
          </DialogTitle>
          <DialogDescription>{t('editor.import.desc')}</DialogDescription>
        </DialogHeader>

        {/* Book selector */}
        {books.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">{t('editor.import.targetBook')}</Label>
            <Select
              value={effectiveBookId?.toString() ?? ""}
              onValueChange={(v) => setSelectedBookId(Number(v))}
            >
              <SelectTrigger className="h-8 text-sm" data-testid="select-import-book">
                <SelectValue placeholder={t('editor.import.selectBook')} />
              </SelectTrigger>
              <SelectContent>
                {books.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()} className="text-sm">{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Drop zone — only shown before files are loaded */}
        {entries.length === 0 && (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            data-testid="dropzone-import"
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">{t('editor.import.dropOrClick')}</p>
            <p className="text-xs text-muted-foreground">{t('editor.import.multipleHint')}</p>
            <p className="text-xs text-muted-foreground/60 mt-2">{t('editor.import.supported')}</p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".docx,.doc,.txt,.md,.markdown"
              multiple
              onChange={(e) => handleFilePick(e.target.files)}
              data-testid="input-import-file"
            />
          </div>
        )}

        {/* File processing list */}
        {entries.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {processing && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                    {t('editor.import.aiProcessing')}
                  </span>
                  <span>{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-1.5" />
              </div>
            )}

            {allDone && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {t('editor.import.preview')} — {doneCount} {t('editor.import.chaptersLabel')} · {totalScenes} {t('editor.import.scenes')}
              </p>
            )}

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-1">
                {entries.map((entry, i) => (
                  <div key={i} className="border rounded-lg overflow-hidden" data-testid={`file-entry-${i}`}>
                    {/* File header */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                      {entry.status === "pending"
                        ? <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        : statusIcon(entry.status)
                      }
                      <span className="text-sm font-medium flex-1 truncate">
                        {entry.chapter?.title ?? entry.file.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {statusLabel(entry)}
                      </span>
                    </div>

                    {/* Scenes preview */}
                    {entry.status === "done" && entry.chapter && (
                      <div className="px-3 py-2 space-y-1">
                        {entry.chapter.scenes.map((sc, si) => (
                          <div key={si} className="flex items-center gap-2 text-xs text-muted-foreground" data-testid={`preview-scene-${i}-${si}`}>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                            <span className="flex-1 truncate">{sc.title}</span>
                            <span className="shrink-0 text-muted-foreground/50">
                              {sc.content.trim().split(/\s+/).filter(Boolean).length}p
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Re-select button */}
            {allDone && (
              <Button
                variant="outline"
                size="sm"
                className="self-start text-xs h-7"
                onClick={() => { handleReset(); setTimeout(() => fileRef.current?.click(), 50); }}
              >
                <Upload className="w-3 h-3 mr-1.5" /> {t('editor.import.addMore')}
              </Button>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".docx,.doc,.txt,.md,.markdown"
          multiple
          onChange={(e) => handleFilePick(e.target.files)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('form.cancel')}</Button>
          <Button
            onClick={handleImport}
            disabled={!allDone || importing || !effectiveBookId || doneCount === 0}
            data-testid="button-confirm-import"
          >
            {importing ? t('editor.import.importing') : t('editor.import.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
