import { useListScenes, getListScenesQueryKey } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface ChapterViewProps {
  chapterId: number;
  chapterTitle: string;
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").trim();
}

export function ChapterView({ chapterId, chapterTitle }: ChapterViewProps) {
  const { t } = useI18n();
  const { data: scenes = [], isLoading } = useListScenes(chapterId, {
    query: { queryKey: getListScenesQueryKey(chapterId) }
  });

  const totalWords = scenes.reduce((acc, s) => acc + countWords(s.content ?? ""), 0);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-8 md:p-12 lg:p-16">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto w-full px-8 md:px-12 lg:px-16 py-10">
        <div className="mb-8 pb-4 border-b">
          <h1 className="text-2xl font-bold font-serif text-foreground" data-testid="text-chapter-view-title">{chapterTitle}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {scenes.length} {t('editor.scenes')} · {totalWords.toLocaleString()} {t('editor.words')}
          </p>
        </div>

        {scenes.length === 0 ? (
          <p className="text-muted-foreground text-sm italic text-center py-8">{t('editor.noScenes')}</p>
        ) : (
          <div className="space-y-8">
            {scenes.map((scene, idx) => (
              <div key={scene.id} data-testid={`chapter-scene-${scene.id}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground/60">{String(idx + 1).padStart(2, "0")}</span>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{scene.title}</h2>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground/60">{countWords(scene.content ?? "").toLocaleString()} {t('editor.words')}</span>
                </div>
                <div
                  className="font-serif text-base leading-relaxed text-foreground prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: scene.content ?? `<p class="text-muted-foreground italic">${t('editor.noScenes')}</p>` }}
                />
                {idx < scenes.length - 1 && (
                  <div className="mt-8 flex items-center gap-4 text-muted-foreground/30">
                    <Separator className="flex-1" />
                    <span className="text-lg tracking-[0.5em]">* * *</span>
                    <Separator className="flex-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
