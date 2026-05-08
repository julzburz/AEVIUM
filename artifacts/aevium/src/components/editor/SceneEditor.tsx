import { useState, useEffect, useRef, useCallback } from "react";
import {
  useGetScene, getGetSceneQueryKey,
  useUpdateScene,
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface SceneEditorProps {
  sceneId: number;
  chapterId: number;
  onWordCountChange: (count: number) => void;
}

export function SceneEditor({ sceneId, chapterId, onWordCountChange }: SceneEditorProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  const { data: scene, isLoading } = useGetScene(chapterId, sceneId, {
    query: { enabled: !!sceneId && !!chapterId, queryKey: getGetSceneQueryKey(chapterId, sceneId) }
  });

  const updateScene = useUpdateScene();

  useEffect(() => {
    if (scene && scene.content !== lastSaved.current) {
      setContent(scene.content ?? "");
      lastSaved.current = scene.content ?? "";
    }
  }, [scene]);

  const countWords = useCallback((text: string): number => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, []);

  useEffect(() => {
    onWordCountChange(countWords(content));
  }, [content, countWords, onWordCountChange]);

  const save = useCallback((text: string) => {
    if (text === lastSaved.current) return;
    setSaveStatus("saving");
    updateScene.mutate(
      { chapterId, id: sceneId, data: { content: text } },
      {
        onSuccess: () => {
          lastSaved.current = text;
          setSaveStatus("saved");
          queryClient.invalidateQueries({ queryKey: getGetSceneQueryKey(chapterId, sceneId) });
          setTimeout(() => setSaveStatus("idle"), 2000);
        },
        onError: () => setSaveStatus("idle"),
      }
    );
  }, [chapterId, sceneId, updateScene, queryClient]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(text), 1500);
  };

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    save(content);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 md:p-12 lg:p-16">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {saveStatus !== "idle" && (
        <div className="absolute top-2 right-4 text-xs text-muted-foreground" data-testid="status-save">
          {saveStatus === "saving" ? t('editor.saving') : t('editor.saved')}
        </div>
      )}
      <textarea
        data-testid="textarea-scene-content"
        className="flex-1 resize-none outline-none bg-transparent text-foreground font-serif text-base leading-relaxed p-8 md:p-12 lg:p-16 max-w-2xl mx-auto w-full placeholder:text-muted-foreground/40 min-h-full"
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={t('editor.typeHere')}
        spellCheck
      />
    </div>
  );
}
