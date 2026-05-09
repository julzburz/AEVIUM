import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  useGetScene, getGetSceneQueryKey,
  useUpdateScene,
  useListCharacters, getListCharactersQueryKey,
  useListLocations, getListLocationsQueryKey,
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { customFetch } from "@workspace/api-client-react";
import { Bold, Italic, Quote, History, List, ListOrdered, Minus, Undo, Redo, Wand2 } from "lucide-react";

type SceneStatus = "draft" | "in_review" | "ready" | "blocked" | "needs_rewrite" | "needs_continuity";

const STATUS_CLASS: Record<SceneStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-yellow-400/20 text-yellow-600 dark:text-yellow-400",
  ready: "bg-green-500/20 text-green-700 dark:text-green-400",
  blocked: "bg-destructive/20 text-destructive",
  needs_rewrite: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  needs_continuity: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
};

interface SceneEditorProps {
  sceneId: number;
  chapterId: number;
  projectId: number;
  onWordCountChange: (count: number) => void;
  onSaveStatusChange?: (status: "idle" | "saving" | "saved") => void;
  onSelectedTextChange?: (text: string) => void;
  onInsertTextReady?: (insertFn: (text: string) => void) => void;
  onReplaceSelectionReady?: (replaceFn: (text: string) => void) => void;
  onAiRequest?: () => void;
}

interface SceneVersion {
  id: number;
  sceneId: number;
  originalContent: string | null;
  userInstruction: string | null;
  proposedContent: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

function VersionsDialog({ sceneId, chapterId, open, onClose }: { sceneId: number; chapterId: number; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [versions, setVersions] = useState<SceneVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    customFetch<SceneVersion[]>(`/api/chapters/${chapterId}/scenes/${sceneId}/versions`)
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [open, sceneId, chapterId]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('editor.versions.title')}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 pr-2">
          {loading ? (
            <div className="space-y-3 p-1"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-versions-empty">{t('editor.versions.empty')}</p>
          ) : (
            <div className="space-y-3 p-1">
              {versions.map((v) => (
                <div key={v.id} className="border rounded-lg p-3 space-y-2 text-sm" data-testid={`card-version-${v.id}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {v.status === "pending" ? t('editor.versions.pending') : v.status === "accepted" ? t('editor.versions.accepted') : t('editor.versions.rejected')}
                    </Badge>
                  </div>
                  {v.userInstruction && (
                    <p className="text-xs text-muted-foreground italic">
                      <span className="font-medium text-foreground not-italic">{t('editor.versions.instruction')}: </span>
                      {v.userInstruction}
                    </p>
                  )}
                  {v.proposedContent && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/50 p-2 rounded">
                        <p className="font-medium mb-1 text-muted-foreground">Original</p>
                        <p className="line-clamp-4 whitespace-pre-wrap">{v.originalContent}</p>
                      </div>
                      <div className="bg-primary/5 p-2 rounded">
                        <p className="font-medium mb-1 text-primary/70">IA</p>
                        <p className="line-clamp-4 whitespace-pre-wrap">{v.proposedContent}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean) =>
    `h-7 w-7 flex items-center justify-center rounded transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`;

  return (
    <div className="flex items-center gap-0.5 px-4 py-1.5 border-b bg-muted/5 shrink-0 flex-wrap">
      <button className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} data-testid="toolbar-bold"><Bold className="w-3.5 h-3.5" /></button>
      <button className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} data-testid="toolbar-italic"><Italic className="w-3.5 h-3.5" /></button>
      <span className="w-px h-4 bg-border mx-0.5" />
      <button className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} data-testid="toolbar-bullet"><List className="w-3.5 h-3.5" /></button>
      <button className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} data-testid="toolbar-ordered"><ListOrdered className="w-3.5 h-3.5" /></button>
      <button className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} data-testid="toolbar-quote"><Quote className="w-3.5 h-3.5" /></button>
      <button className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} data-testid="toolbar-hr"><Minus className="w-3.5 h-3.5" /></button>
      <span className="w-px h-4 bg-border mx-0.5" />
      <button className={btn(false)} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} data-testid="toolbar-undo"><Undo className="w-3.5 h-3.5" /></button>
      <button className={btn(false)} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} data-testid="toolbar-redo"><Redo className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export function SceneEditor({ sceneId, chapterId, projectId, onWordCountChange, onSaveStatusChange, onSelectedTextChange, onInsertTextReady, onReplaceSelectionReady, onAiRequest }: SceneEditorProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showVersions, setShowVersions] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef<number | null>(null);

  // Refs that always reflect current prop/state values — readable inside timer closures
  const sceneIdRef = useRef(sceneId);
  const chapterIdRef = useRef(chapterId);
  useEffect(() => { sceneIdRef.current = sceneId; }, [sceneId]);
  useEffect(() => { chapterIdRef.current = chapterId; }, [chapterId]);

  // Track the most recent non-empty selection range for rewrite replacement
  const selectionRangeRef = useRef<{ from: number; to: number } | null>(null);

  // Tracks whether there is unsaved content since last save — updated on every edit, cleared on save
  const pendingSnapshotRef = useRef<{ content: string; wordCount: number; sceneId: number; chapterId: number } | null>(null);

  const { data: scene, isLoading } = useGetScene(chapterId, sceneId, {
    query: { enabled: !!sceneId && !!chapterId, queryKey: getGetSceneQueryKey(chapterId, sceneId) }
  });
  const { data: characters = [] } = useListCharacters(projectId, {
    query: { queryKey: getListCharactersQueryKey(projectId) }
  });
  const { data: locations = [] } = useListLocations(projectId, {
    query: { queryKey: getListLocationsQueryKey(projectId) }
  });

  const updateScene = useUpdateScene();

  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>("draft");
  const [povId, setPovId] = useState<number | null>(null);
  const [locId, setLocId] = useState<number | null>(null);
  const [internalDate, setInternalDate] = useState("");
  const [narrativeGoal, setNarrativeGoal] = useState("");

  // Metadata refs so the timer can read latest values without closing over stale state
  const sceneTitleRef = useRef(sceneTitle);
  const sceneStatusRef = useRef(sceneStatus);
  const povIdRef = useRef(povId);
  const locIdRef = useRef(locId);
  const internalDateRef = useRef(internalDate);
  const narrativeGoalRef = useRef(narrativeGoal);
  useEffect(() => { sceneTitleRef.current = sceneTitle; }, [sceneTitle]);
  useEffect(() => { sceneStatusRef.current = sceneStatus; }, [sceneStatus]);
  useEffect(() => { povIdRef.current = povId; }, [povId]);
  useEffect(() => { locIdRef.current = locId; }, [locId]);
  useEffect(() => { internalDateRef.current = internalDate; }, [internalDate]);
  useEffect(() => { narrativeGoalRef.current = narrativeGoal; }, [narrativeGoal]);

  const updateSaveStatus = useCallback((s: "idle" | "saving" | "saved") => {
    setSaveStatus(s);
    onSaveStatusChange?.(s);
  }, [onSaveStatusChange]);

  // doSave receives a pre-captured content snapshot so it NEVER reads editor.getHTML() at fire time.
  // The sceneId/chapterId it targets are also captured at edit time via refs.
  const doSaveRef = useRef<(content: string, wordCount: number, forSceneId: number, forChapterId: number) => void>(() => {});

  useMemo(() => {
    doSaveRef.current = (content: string, wordCount: number, forSceneId: number, forChapterId: number) => {
      updateSaveStatus("saving");
      updateScene.mutate(
        {
          chapterId: forChapterId,
          id: forSceneId,
          data: {
            content,
            wordCount,
            title: sceneTitleRef.current,
            status: sceneStatusRef.current as SceneStatus,
            povCharacterId: povIdRef.current,
            locationId: locIdRef.current,
            timelinePosition: internalDateRef.current,
            narrativeGoal: narrativeGoalRef.current,
          }
        },
        {
          onSuccess: () => {
            // Clear pending snapshot only for the scene we just saved
            if (pendingSnapshotRef.current?.sceneId === forSceneId) {
              pendingSnapshotRef.current = null;
            }
            updateSaveStatus("saved");
            queryClient.invalidateQueries({ queryKey: getGetSceneQueryKey(forChapterId, forSceneId) });
            setTimeout(() => updateSaveStatus("idle"), 2000);
          },
          onError: () => updateSaveStatus("idle"),
        }
      );
    };
  }, [updateScene, queryClient, updateSaveStatus]);

  // On scene switch: flush any pending snapshot to the OLD scene before clearing the timer.
  // The closure captures the scene IDs at effect-creation time (i.e. the previous values).
  useEffect(() => {
    const prevSceneId = sceneId;
    const prevChapterId = chapterId;
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      // Flush pending edits for the scene we are leaving
      const snap = pendingSnapshotRef.current;
      if (snap && snap.sceneId === prevSceneId) {
        doSaveRef.current(snap.content, snap.wordCount, prevSceneId, prevChapterId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Placeholder.configure({ placeholder: t('editor.typeHere') }),
      CharacterCount,
    ],
    content: "",
    onSelectionUpdate: ({ editor: e }) => {
      const { from, to, empty } = e.state.selection;
      if (!empty) {
        selectionRangeRef.current = { from, to };
      }
    },
    onUpdate: ({ editor: e }) => {
      // Capture content + identity IMMEDIATELY at edit time — not at timer fire time
      const content = e.getHTML();
      const words = e.getText().trim().split(/\s+/).filter(Boolean).length;
      const forSceneId = sceneIdRef.current;
      const forChapterId = chapterIdRef.current;
      // Store snapshot so cleanup can flush it if user switches scene before timer fires
      pendingSnapshotRef.current = { content, wordCount: words, sceneId: forSceneId, chapterId: forChapterId };
      onWordCountChange(words);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        doSaveRef.current(content, words, forSceneId, forChapterId);
      }, 1500);
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[400px] font-serif text-base leading-relaxed text-foreground prose dark:prose-invert max-w-none text-justify hyphens-auto",
        "data-testid": "tiptap-editor",
      },
    },
  });

  useEffect(() => {
    if (!scene || !editor || initializedRef.current === sceneId) return;
    initializedRef.current = sceneId;
    const html = scene.content ?? "";
    editor.commands.setContent(html);
    const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;
    onWordCountChange(words);
    setSceneTitle(scene.title ?? "");
    setSceneStatus((scene.status ?? "draft") as SceneStatus);
    setPovId(scene.povCharacterId ?? null);
    setLocId(scene.locationId ?? null);
    setInternalDate(scene.timelinePosition ?? "");
    setNarrativeGoal(scene.narrativeGoal ?? "");
  }, [scene, editor, sceneId, onWordCountChange]);

  useEffect(() => {
    if (!editor || !onInsertTextReady) return;
    onInsertTextReady((text: string) => {
      editor.chain().focus().insertContent(text).run();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    if (!editor || !onReplaceSelectionReady) return;
    onReplaceSelectionReady((text: string) => {
      const range = selectionRangeRef.current;
      if (range) {
        editor.chain().focus().insertContentAt(range, text).run();
        selectionRangeRef.current = null;
      } else {
        editor.chain().focus().insertContent(text).run();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Flush: capture snapshot immediately and save (used on metadata blur / select changes)
  const flush = useCallback((overrides?: Partial<{ title: string; status: string; povCharacterId: number | null; locationId: number | null; timelinePosition: string; narrativeGoal: string }>) => {
    if (!editor) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const content = editor.getHTML();
    const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;
    const forSceneId = sceneIdRef.current;
    const forChapterId = chapterIdRef.current;
    updateSaveStatus("saving");
    updateScene.mutate(
      {
        chapterId: forChapterId,
        id: forSceneId,
        data: {
          content,
          wordCount: words,
          title: overrides?.title ?? sceneTitleRef.current,
          status: ((overrides?.status ?? sceneStatusRef.current) as SceneStatus),
          povCharacterId: overrides?.povCharacterId !== undefined ? overrides.povCharacterId : povIdRef.current,
          locationId: overrides?.locationId !== undefined ? overrides.locationId : locIdRef.current,
          timelinePosition: overrides?.timelinePosition ?? internalDateRef.current,
          narrativeGoal: overrides?.narrativeGoal ?? narrativeGoalRef.current,
        }
      },
      {
        onSuccess: () => {
          updateSaveStatus("saved");
          queryClient.invalidateQueries({ queryKey: getGetSceneQueryKey(forChapterId, forSceneId) });
          setTimeout(() => updateSaveStatus("idle"), 2000);
        },
        onError: () => updateSaveStatus("idle"),
      }
    );
  }, [editor, updateScene, queryClient, updateSaveStatus]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  const statusKeys: SceneStatus[] = ["draft", "in_review", "ready", "blocked", "needs_rewrite", "needs_continuity"];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Metadata bar */}
      <div className="px-4 py-1.5 border-b bg-muted/5 flex flex-wrap items-center gap-x-2 gap-y-1 shrink-0">
        <Input
          className="h-7 text-sm font-semibold border-0 bg-transparent p-0 focus-visible:ring-0 min-w-[120px] flex-1 max-w-[200px]"
          value={sceneTitle}
          onChange={(e) => setSceneTitle(e.target.value)}
          onBlur={() => flush()}
          placeholder={t('editor.sceneTitle')}
          data-testid="input-scene-title"
        />

        <Select value={sceneStatus} onValueChange={(v: SceneStatus) => { setSceneStatus(v); sceneStatusRef.current = v; flush({ status: v }); }}>
          <SelectTrigger className="h-6 text-xs border-0 bg-transparent p-0 w-auto focus:ring-0" data-testid="select-scene-status">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASS[sceneStatus]}`}>
              {t(`editor.${sceneStatus}` as Parameters<typeof t>[0])}
            </span>
          </SelectTrigger>
          <SelectContent>
            {statusKeys.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASS[s]}`}>{t(`editor.${s}` as Parameters<typeof t>[0])}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={povId?.toString() ?? "none"} onValueChange={(v) => { const id = v === "none" ? null : Number(v); setPovId(id); povIdRef.current = id; flush({ povCharacterId: id }); }}>
          <SelectTrigger className="h-6 text-xs w-auto min-w-[72px] max-w-[120px]" data-testid="select-scene-pov">
            <SelectValue placeholder={t('editor.noPov')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">{t('editor.noPov')}</SelectItem>
            {characters.map((c) => <SelectItem key={c.id} value={c.id.toString()} className="text-xs">{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={locId?.toString() ?? "none"} onValueChange={(v) => { const id = v === "none" ? null : Number(v); setLocId(id); locIdRef.current = id; flush({ locationId: id }); }}>
          <SelectTrigger className="h-6 text-xs w-auto min-w-[72px] max-w-[120px]" data-testid="select-scene-location">
            <SelectValue placeholder={t('editor.noLocationSelected')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">{t('editor.noLocationSelected')}</SelectItem>
            {locations.map((l) => <SelectItem key={l.id} value={l.id.toString()} className="text-xs">{l.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          className="h-6 text-xs w-[110px] px-2"
          value={internalDate}
          onChange={(e) => setInternalDate(e.target.value)}
          onBlur={() => flush()}
          placeholder={t('editor.internalDate')}
          data-testid="input-scene-date"
        />

        <Input
          className="h-6 text-xs flex-1 min-w-[100px] max-w-[200px] px-2"
          value={narrativeGoal}
          onChange={(e) => setNarrativeGoal(e.target.value)}
          onBlur={() => flush()}
          placeholder={t('editor.narrativeGoal')}
          data-testid="input-scene-goal"
        />

        <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground shrink-0" onClick={() => setShowVersions(true)} data-testid="button-view-versions">
          <History className="w-3 h-3 mr-1" />{t('editor.versions')}
        </Button>
      </div>

      <EditorToolbar editor={editor} />

      <div className="flex-1 overflow-auto relative">
        {editor && (
          <BubbleMenu
            editor={editor}
            className="flex items-center gap-0.5 bg-popover border rounded-md shadow-lg p-1"
            data-testid="bubble-menu"
          >
            <button
              className={`h-6 w-6 flex items-center justify-center rounded text-xs transition-colors ${editor.isActive("bold") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-testid="bubble-bold"
            >
              <Bold className="w-3 h-3" />
            </button>
            <button
              className={`h-6 w-6 flex items-center justify-center rounded text-xs transition-colors ${editor.isActive("italic") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              data-testid="bubble-italic"
            >
              <Italic className="w-3 h-3" />
            </button>
            <button
              className={`h-6 w-6 flex items-center justify-center rounded text-xs transition-colors ${editor.isActive("blockquote") ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              data-testid="bubble-quote"
            >
              <Quote className="w-3 h-3" />
            </button>
            <span className="w-px h-3.5 bg-border mx-0.5" />
            <button
              className="h-6 px-1.5 flex items-center justify-center rounded text-xs text-primary/80 hover:bg-primary/10 transition-colors gap-1"
              onClick={() => {
                if (!editor) return;
                const { from, to, empty } = editor.state.selection;
                const selText = empty ? "" : editor.state.doc.textBetween(from, to, " ");
                onSelectedTextChange?.(selText);
                onAiRequest?.();
              }}
              title={t('editor.aiAssist')}
              data-testid="bubble-ai"
            >
              <Wand2 className="w-3 h-3" />
              <span className="text-[10px] font-medium">IA</span>
            </button>
          </BubbleMenu>
        )}
        <div className="max-w-2xl mx-auto w-full px-8 md:px-12 lg:px-16 py-10">
          <EditorContent editor={editor} />
        </div>
      </div>

      <VersionsDialog sceneId={sceneId} chapterId={chapterId} open={showVersions} onClose={() => setShowVersions(false)} />
    </div>
  );
}
