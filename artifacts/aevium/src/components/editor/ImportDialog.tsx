import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useCreateChapter, useCreateScene, getListChaptersQueryKey, getListScenesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Upload } from "lucide-react";

interface ParsedScene { title: string; content: string }
interface ParsedChapter { title: string; scenes: ParsedScene[] }

function parseFile(text: string): ParsedChapter[] {
  const lines = text.split("\n");
  const chapters: ParsedChapter[] = [];
  let currentChapter: ParsedChapter | null = null;
  let currentScene: ParsedScene | null = null;
  let contentBuffer: string[] = [];

  const flushScene = () => {
    if (currentScene && currentChapter) {
      currentScene.content = contentBuffer.join("\n").trim();
      currentChapter.scenes.push(currentScene);
      currentScene = null;
      contentBuffer = [];
    }
  };
  const flushChapter = () => {
    flushScene();
    if (currentChapter) chapters.push(currentChapter);
    currentChapter = null;
  };

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);

    if (h1) {
      flushChapter();
      currentChapter = { title: h1[1].trim(), scenes: [] };
    } else if (h2) {
      if (!currentChapter) currentChapter = { title: "Capítulo 1", scenes: [] };
      flushScene();
      currentScene = { title: h2[1].trim(), content: "" };
    } else if (h3) {
      if (!currentChapter) currentChapter = { title: "Capítulo 1", scenes: [] };
      flushScene();
      currentScene = { title: h3[1].trim(), content: "" };
    } else {
      if (currentScene) {
        contentBuffer.push(line);
      } else if (currentChapter) {
        if (!currentScene && line.trim()) {
          if (!currentScene) {
            currentScene = { title: "Escena 1", content: "" };
          }
          contentBuffer.push(line);
        }
      }
    }
  }
  flushChapter();

  if (chapters.length === 0) {
    const paragraphs = text.split(/\n{2,}/).filter(p => p.trim());
    const newChapter: ParsedChapter = { title: "Capítulo importado", scenes: [] };
    const chunkSize = 5;
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      const chunk = paragraphs.slice(i, i + chunkSize).join("\n\n");
      newChapter.scenes.push({ title: `Escena ${Math.floor(i / chunkSize) + 1}`, content: chunk });
    }
    if (newChapter.scenes.length === 0 && text.trim()) {
      newChapter.scenes.push({ title: "Escena 1", content: text.trim() });
    }
    chapters.push(newChapter);
  }

  return chapters.filter(c => c.scenes.length > 0);
}

interface ImportDialogProps {
  bookId: number;
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ bookId, open, onClose }: ImportDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedChapter[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const createChapter = useCreateChapter();
  const createScene = useCreateScene();

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const result = parseFile(text);
      setParsed(result);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    try {
      for (const chapter of parsed) {
        const newChapter = await new Promise<{ id: number }>((resolve, reject) => {
          createChapter.mutate({ bookId, data: { title: chapter.title } }, {
            onSuccess: resolve,
            onError: reject,
          });
        });
        await queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(bookId) });

        for (const scene of chapter.scenes) {
          await new Promise<void>((resolve, reject) => {
            createScene.mutate({ chapterId: newChapter.id, data: { title: scene.title, content: scene.content } }, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(newChapter.id) });
                resolve();
              },
              onError: reject,
            });
          });
        }
      }
      toast({ title: t('editor.import.success') });
      setParsed([]);
      setFileName("");
      onClose();
    } catch {
      toast({ title: t('editor.import.error'), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const totalScenes = parsed.reduce((a, c) => a + c.scenes.length, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setParsed([]); setFileName(""); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('editor.import.title')}</DialogTitle>
          <DialogDescription>{t('editor.import.desc')}</DialogDescription>
        </DialogHeader>

        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          data-testid="dropzone-import"
        >
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{fileName || t('editor.import.dropOrClick')}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('editor.import.supported')}</p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.markdown"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            data-testid="input-import-file"
          />
        </div>

        {parsed.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              {t('editor.import.preview')} — {parsed.length} capítulos · {totalScenes} escenas
            </p>
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-3">
                {parsed.map((ch, ci) => (
                  <div key={ci} className="border rounded-lg p-3" data-testid={`preview-chapter-${ci}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-medium">{ch.title}</span>
                      <span className="text-xs text-muted-foreground">({ch.scenes.length} escenas)</span>
                    </div>
                    <div className="ml-5 space-y-1">
                      {ch.scenes.map((sc, si) => (
                        <div key={si} className="flex items-center gap-2 text-xs text-muted-foreground" data-testid={`preview-scene-${ci}-${si}`}>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          <span className="truncate">{sc.title}</span>
                          <span className="shrink-0 text-muted-foreground/50">
                            {sc.content.trim().split(/\s+/).filter(Boolean).length}p
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setParsed([]); setFileName(""); onClose(); }}>{t('form.cancel')}</Button>
          <Button onClick={handleImport} disabled={parsed.length === 0 || importing} data-testid="button-confirm-import">
            {importing ? t('editor.import.importing') : t('editor.import.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
