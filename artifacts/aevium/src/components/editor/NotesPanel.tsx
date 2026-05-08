import { useState, useEffect, useRef, useCallback } from "react";
import { useGetStyleGuide, getGetStyleGuideQueryKey, useUpsertStyleGuide } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { StickyNote } from "lucide-react";

interface NotesPanelProps { projectId: number }

export function NotesPanel({ projectId }: NotesPanelProps) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: guide, isLoading } = useGetStyleGuide(projectId, {
    query: { queryKey: getGetStyleGuideQueryKey(projectId) }
  });
  const upsert = useUpsertStyleGuide();
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!guide || initialized.current) return;
    initialized.current = true;
    setNotes(guide.additionalNotes ?? "");
  }, [guide]);

  const save = useCallback((text: string) => {
    setSaveStatus("saving");
    upsert.mutate({ projectId, data: { additionalNotes: text } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetStyleGuideQueryKey(projectId) });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      },
      onError: () => setSaveStatus("idle"),
    });
  }, [projectId, upsert, qc]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(val), 1500);
  };

  if (isLoading) {
    return <div className="space-y-2"><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <div className="flex flex-col h-full" data-testid="panel-notes">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <StickyNote className="w-3.5 h-3.5" />
          <span>{t('editor.notes')}</span>
        </div>
        {saveStatus !== "idle" && (
          <span className="text-xs text-muted-foreground" data-testid="status-notes-save">
            {saveStatus === "saving" ? t('editor.saving') : t('editor.notes.saved')}
          </span>
        )}
      </div>
      <textarea
        className="flex-1 w-full min-h-[300px] resize-none text-xs bg-muted/20 border border-border rounded-md p-3 outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/50 font-sans leading-relaxed"
        placeholder={t('editor.notes.placeholder')}
        value={notes}
        onChange={handleChange}
        data-testid="textarea-notes"
      />
    </div>
  );
}
