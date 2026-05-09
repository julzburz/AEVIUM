import { useState, useRef } from "react";
import mammoth from "mammoth";
import { useI18n } from "@/lib/i18n";
import {
  useCreateCharacter, getListCharactersQueryKey,
} from "@workspace/api-client-react";
import type { CreateCharacterBodyRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2, XCircle, Sparkles, User } from "lucide-react";

interface ParsedCharacter {
  name: string;
  role: string;
  physicalDescription: string | null;
  personality: string | null;
  motivations: string | null;
  currentState: string | null;
  injuries: string | null;
  secrets: string | null;
  selected: boolean;
}

type ImportStatus = "idle" | "extracting" | "analyzing" | "done" | "error";

interface CharacterImportDialogProps {
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

const ROLE_COLOR: Record<string, string> = {
  protagonist: "bg-primary/20 text-primary border-primary/30",
  antagonist: "bg-destructive/20 text-destructive border-destructive/30",
  secondary: "bg-muted text-muted-foreground border-border",
  minor: "bg-muted/50 text-muted-foreground border-border",
};

export function CharacterImportDialog({ projectId, open, onClose }: CharacterImportDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const createCharacter = useCreateCharacter();

  const [status, setStatus] = useState<ImportStatus>("idle");
  const [characters, setCharacters] = useState<ParsedCharacter[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; if (dragCounter.current === 1) setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); };

  const reset = () => {
    setStatus("idle");
    setCharacters([]);
    setIsDragging(false);
    dragCounter.current = 0;
    setImporting(false);
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const processFile = async (file: File) => {
    reset();
    try {
      setStatus("extracting");
      const text = await extractText(file);

      setStatus("analyzing");
      const res = await fetch("/api/ai/import-characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, text }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json() as { characters: Omit<ParsedCharacter, "selected">[] };

      setCharacters(data.characters.map(c => ({ ...c, selected: true })));
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

  const toggleCharacter = (idx: number) => {
    setCharacters(prev => prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c));
  };

  const handleImport = async () => {
    const selected = characters.filter(c => c.selected);
    if (selected.length === 0) return;

    setImporting(true);
    try {
      for (const ch of selected) {
        await new Promise<void>((resolve, reject) => {
          createCharacter.mutate(
            {
              projectId,
              data: {
                name: ch.name,
                role: ch.role as CreateCharacterBodyRole,
                physicalDescription: ch.physicalDescription ?? null,
                personality: ch.personality ?? null,
                motivations: ch.motivations ?? null,
                currentState: ch.currentState ?? null,
                injuries: ch.injuries ?? null,
                secrets: ch.secrets ?? null,
              },
            },
            { onSuccess: () => resolve(), onError: reject }
          );
        });
      }
      await qc.invalidateQueries({ queryKey: getListCharactersQueryKey(projectId) });
      toast({ title: t('editor.import.characters.success') });
      handleClose();
    } catch {
      toast({ title: t('editor.import.error'), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = characters.filter(c => c.selected).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {t('editor.import.characters.title')}
          </DialogTitle>
          <DialogDescription>{t('editor.import.characters.desc')}</DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        {status === "idle" && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-150 ${isDragging ? "border-primary bg-primary/8 scale-[1.02] shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]" : "border-border hover:border-primary/50"}`}
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); dragCounter.current = 0; handleFilePick(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            data-testid="dropzone-character-import"
          >
            <Upload className={`w-8 h-8 mx-auto mb-3 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-medium mb-1">{t('editor.import.dropOrClick')}</p>
            <p className="text-xs text-muted-foreground/60 mt-2">{t('editor.import.supported')}</p>
          </div>
        )}

        {/* Processing */}
        {(status === "extracting" || status === "analyzing") && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              {status === "extracting" ? t('editor.import.aiExtracting') : t('editor.import.characters.analyzing')}
            </div>
            <Progress value={status === "extracting" ? 40 : 80} className="h-1.5" />
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive py-4">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error ?? t('editor.import.error')}</span>
          </div>
        )}

        {/* Results */}
        {status === "done" && characters.length > 0 && (
          <div className="flex flex-col gap-2 overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              {characters.length} {t('editor.import.characters.found')} — {t('editor.import.characters.selectHint')}
            </p>
            <ScrollArea className="h-[340px]">
              <div className="space-y-2 pr-1">
                {characters.map((ch, i) => (
                  <div
                    key={i}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${ch.selected ? "border-primary/50 bg-primary/5" : "border-border/50 bg-muted/10 opacity-50"}`}
                    onClick={() => toggleCharacter(i)}
                    data-testid={`character-card-${i}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-4 h-4 mt-0.5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${ch.selected ? "bg-primary border-primary" : "border-border"}`}>
                        {ch.selected && <span className="text-primary-foreground text-[10px] font-bold leading-none">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-sm font-semibold">{ch.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ROLE_COLOR[ch.role] ?? ROLE_COLOR.secondary}`}>
                            {t(`editor.role.${ch.role}` as Parameters<typeof t>[0])}
                          </span>
                        </div>
                        {ch.physicalDescription && <p className="text-xs text-muted-foreground line-clamp-1"><span className="font-medium">{t('editor.character.physicalDescription')}:</span> {ch.physicalDescription}</p>}
                        {ch.personality && <p className="text-xs text-muted-foreground line-clamp-1"><span className="font-medium">{t('editor.character.personality')}:</span> {ch.personality}</p>}
                        {ch.motivations && <p className="text-xs text-muted-foreground line-clamp-1"><span className="font-medium">{t('editor.character.motivations')}:</span> {ch.motivations}</p>}
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
              <span className="text-xs text-muted-foreground">{selectedCount} {t('editor.import.characters.selected')}</span>
            </div>
          </div>
        )}

        {status === "done" && characters.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">{t('editor.import.characters.none')}</p>
        )}

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".docx,.txt,.md,.markdown"
          onChange={(e) => handleFilePick(e.target.files)}
          data-testid="input-character-file"
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('form.cancel')}</Button>
          {status === "error" && (
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              {t('editor.import.dropOrClick')}
            </Button>
          )}
          {status === "done" && (
            <Button onClick={handleImport} disabled={selectedCount === 0 || importing} data-testid="button-confirm-character-import">
              {importing ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
              {importing ? t('editor.import.importing') : `${t('editor.import.characters.import')} (${selectedCount})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
