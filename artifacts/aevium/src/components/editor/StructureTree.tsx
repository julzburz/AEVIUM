import { useState } from "react";
import {
  useListBooks, getListBooksQueryKey, useCreateBook, useDeleteBook, useUpdateBook,
  useListChapters, getListChaptersQueryKey, useCreateChapter, useDeleteChapter, useUpdateChapter,
  useListScenes, getListScenesQueryKey, useCreateScene, useDeleteScene, useUpdateScene,
  customFetch, UpdateSceneBodyStatus,
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard, HoverCardContent, HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight, ChevronDown, FileText, BookOpen,
  Plus, Pencil, Trash2, MoreHorizontal, Copy, GitMerge, GripVertical
} from "lucide-react";

const sceneStatusDot: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  in_review: "bg-yellow-400",
  ready: "bg-green-500",
  blocked: "bg-destructive",
  needs_rewrite: "bg-orange-400",
  needs_continuity: "bg-blue-400",
};

type SceneStatus = "draft" | "in_review" | "ready" | "blocked";

type RenameTarget =
  | { kind: "book";    id: number; projectId: number;  currentTitle: string }
  | { kind: "chapter"; id: number; bookId: number;     currentTitle: string }
  | { kind: "scene";   id: number; chapterId: number;  currentTitle: string };

interface StructureTreeProps {
  projectId: number;
  selectedSceneId: number | null;
  onSelectScene: (
    sceneId: number,
    chapterId: number,
    bookTitle: string,
    chapterTitle: string,
    sceneTitle: string,
    bookId: number,
  ) => void;
  onSelectChapter?: (
    chapterId: number,
    bookTitle: string,
    chapterTitle: string,
    bookId: number,
  ) => void;
}

function SortableSceneRow({
  scene,
  selectedSceneId,
  chapter,
  book,
  statusKey,
  dotClass,
  t,
  onSelectScene,
  canDown,
  idx,
  sorted,
  handleDuplicateScene,
  handleMergeWithNext,
  handleRenameScene,
  handleDeleteScene,
}: {
  scene: any;
  selectedSceneId: number | null;
  chapter: any;
  book: any;
  statusKey: any;
  dotClass: string;
  t: any;
  onSelectScene: any;
  canDown: boolean;
  idx: number;
  sorted: any[];
  handleDuplicateScene: any;
  handleMergeWithNext: any;
  handleRenameScene: any;
  handleDeleteScene: any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = selectedSceneId === scene.id;

  return (
    <div ref={setNodeRef} style={style}>
      <HoverCard openDelay={0} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div
            className={`group relative flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer select-none transition-colors ${
              isSelected ? "bg-primary/15 text-primary" : "hover:bg-secondary/15 hover:text-secondary text-muted-foreground"
            }`}
            onClick={() => onSelectScene(scene.id, chapter.id, book.title, chapter.title, scene.title, book.id)}
            data-testid={`tree-scene-${scene.id}`}
          >
            <span
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing w-3 h-3 flex items-center justify-center shrink-0 -ml-1 text-muted-foreground hover:text-foreground transition-opacity"
            >
              <GripVertical className="w-2.5 h-2.5" />
            </span>
            <span className={`w-1 h-1 rounded-full shrink-0 ${dotClass}`} title={t(`editor.${statusKey}` as Parameters<typeof t>[0])} />
            <FileText className="w-3 h-3 shrink-0" />
            <span className="flex-1 truncate text-xs">{scene.title}</span>
            {(scene.wordCount ?? 0) > 0 && (
              <span className="text-[10px] text-muted-foreground/50 shrink-0 mr-0.5">
                {(scene.wordCount ?? 0).toLocaleString()}
              </span>
            )}
          </div>
        </HoverCardTrigger>
        <HoverCardContent 
          side="right" 
          align="center" 
          sideOffset={8}
          className="flex items-center gap-0.5 p-1 w-auto bg-background/95 backdrop-blur-md shadow-lg text-secondary"
        >
          <Button variant="ghost" size="icon" className="w-6 h-6 rounded-sm text-inherit hover:text-foreground" onClick={(e) => handleDuplicateScene(scene, e)}>
            <Copy className="w-3 h-3" />
          </Button>
          {canDown && (
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 rounded-sm text-inherit hover:text-foreground"
              title={t('editor.mergeWithNext')}
              onClick={(e) => handleMergeWithNext(scene, sorted[idx + 1], e)}
            >
              <GitMerge className="w-3 h-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="w-6 h-6 rounded-sm text-inherit hover:text-foreground" onClick={(e) => handleRenameScene(scene, e)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="w-6 h-6 rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => handleDeleteScene(scene.id, e)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

function ChapterRow({
  chapter,
  bookId,
  book,
  chapterList,
  selectedSceneId,
  activeChapterId,
  onSelectScene,
  onSelectChapter,
  onRename,
  onDeleteChapter,
  onDuplicateChapter,
  t,
  toast,
  queryClient,
  dragAttributes,
  dragListeners,
}: {
  chapter: { id: number; title: string; position: number };
  chapterList: { id: number; title: string; position: number }[];
  bookId: number;
  book: { id: number; title: string };
  selectedSceneId: number | null;
  activeChapterId?: number | null;
  onSelectScene: StructureTreeProps["onSelectScene"];
  onSelectChapter?: StructureTreeProps["onSelectChapter"];
  onRename: (target: RenameTarget) => void;
  onDeleteChapter: (bookId: number, chapterId: number, e: React.MouseEvent) => void;
  onDuplicateChapter: (chap: { id: number; title: string }, e: React.MouseEvent) => void;
  t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string;
  toast: ReturnType<typeof useToast>["toast"];
  queryClient: ReturnType<typeof useQueryClient>;
  dragAttributes?: any;
  dragListeners?: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNewScene, setShowNewScene] = useState(false);
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);

  const { data: scenes = [] } = useListScenes(chapter.id, {
    query: { enabled: expanded, queryKey: getListScenesQueryKey(chapter.id) }
  });

  const createScene = useCreateScene();
  const deleteScene = useDeleteScene();
  const updateScene = useUpdateScene();

  const sorted = [...scenes].sort((a, b) => a.position - b.position);
  const chapterIdx = chapterList.findIndex(c => c.id === chapter.id);
  const canMoveUp = chapterIdx > 0;
  const canMoveDown = chapterIdx < chapterList.length - 1;

  const handleCreateScene = () => {
    if (!newSceneTitle.trim()) return;
    createScene.mutate({ chapterId: chapter.id, data: { title: newSceneTitle.trim() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(chapter.id) });
        setNewSceneTitle(""); setShowNewScene(false);
      },
      onError: () => toast({ title: t('editor.newScene'), variant: "destructive" }),
    });
  };

  const handleDeleteScene = (sceneId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteScene.mutate({ chapterId: chapter.id, id: sceneId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(chapter.id) }),
      onError: () => toast({ title: t('editor.deleteScene'), variant: "destructive" }),
    });
  };

  const handleDuplicateScene = (scene: { id: number; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    // Fetch original scene data, create copy, then patch with content+metadata
    customFetch<Record<string, unknown>>(`/api/chapters/${chapter.id}/scenes/${scene.id}`)
      .then((original) => {
        createScene.mutate(
          { chapterId: chapter.id, data: { title: `${scene.title} (${t('editor.copy')})` } },
          {
            onSuccess: (newScene) => {
              updateScene.mutate(
                {
                  chapterId: chapter.id,
                  id: (newScene as { id: number }).id,
                  data: {
                    content: (original.content as string) ?? "",
                    status: ((original.status ?? "draft") as UpdateSceneBodyStatus),
                    povCharacterId: (original.povCharacterId as number | null) ?? null,
                    locationId: (original.locationId as number | null) ?? null,
                    timelinePosition: (original.timelinePosition as string) ?? "",
                    narrativeGoal: (original.narrativeGoal as string) ?? "",
                    wordCount: (original.wordCount as number) ?? 0,
                  },
                },
                {
                  onSuccess: () => queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(chapter.id) }),
                }
              );
            },
            onError: () => toast({ title: t('editor.newScene'), variant: "destructive" }),
          }
        );
      })
      .catch(() => toast({ title: t('editor.newScene'), variant: "destructive" }));
  };

  const handleRenameScene = (scene: { id: number; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    onRename({ kind: "scene", id: scene.id, chapterId: chapter.id, currentTitle: scene.title });
  };

  const handleMoveScene = (scene: { id: number; position: number }, dir: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = sorted.findIndex(s => s.id === scene.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    const newPos = other.position;
    const otherNewPos = scene.position;
    updateScene.mutate({ chapterId: chapter.id, id: scene.id, data: { position: newPos } }, {
      onSuccess: () => {
        updateScene.mutate({ chapterId: chapter.id, id: other.id, data: { position: otherNewPos } }, {
          onSuccess: () => queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(chapter.id) }),
        });
      },
    });
  };

  const handleMergeWithNext = async (scene: { id: number; title: string }, nextScene: { id: number }, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const [sceneData, nextData] = await Promise.all([
        customFetch<Record<string, unknown>>(`/api/chapters/${chapter.id}/scenes/${scene.id}`),
        customFetch<Record<string, unknown>>(`/api/chapters/${chapter.id}/scenes/${nextScene.id}`),
      ]);
      const mergedContent = [(sceneData.content as string) ?? "", (nextData.content as string) ?? ""]
        .filter(Boolean).join("\n\n");
      const mergedWordCount = ((sceneData.wordCount as number) ?? 0) + ((nextData.wordCount as number) ?? 0);
      updateScene.mutate(
        { chapterId: chapter.id, id: scene.id, data: { content: mergedContent, wordCount: mergedWordCount } },
        {
          onSuccess: () => {
            deleteScene.mutate({ chapterId: chapter.id, id: nextScene.id }, {
              onSuccess: () => queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(chapter.id) }),
              onError: () => toast({ title: t('editor.mergeWithNext'), variant: "destructive" }),
            });
          },
          onError: () => toast({ title: t('editor.mergeWithNext'), variant: "destructive" }),
        }
      );
    } catch {
      toast({ title: t('editor.mergeWithNext'), variant: "destructive" });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sorted.findIndex((item) => item.id === active.id);
      const newIndex = sorted.findIndex((item) => item.id === over.id);

      const newArray = arrayMove(sorted, oldIndex, newIndex);

      const updates: { id: number; position: number }[] = [];
      for (let i = 0; i < newArray.length; i++) {
        if (newArray[i].id !== sorted[i].id) {
          updates.push({ id: newArray[i].id, position: sorted[i].position });
        }
      }

      Promise.all(
        updates.map((update) => 
          updateScene.mutateAsync({ chapterId: chapter.id, id: update.id, data: { position: update.position } })
        )
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(chapter.id) });
      });
    }
  };

  return (
    <div>
      <HoverCard openDelay={0} closeDelay={100} open={hoverOpen || dropdownOpen} onOpenChange={(o) => { if (!dropdownOpen) setHoverOpen(o); }}>
        <HoverCardTrigger asChild>
          <div
            className="group relative flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer select-none transition-colors hover:bg-secondary/15 hover:text-secondary text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
            data-testid={`tree-chapter-${chapter.id}`}
          >
            <span
              {...dragAttributes}
              {...dragListeners}
              className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing w-3 h-3 flex items-center justify-center shrink-0 -ml-1 text-muted-foreground hover:text-foreground transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-3 h-3" />
            </span>
            {activeChapterId === chapter.id && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-in fade-in" />
            )}
            <button className="shrink-0 text-muted-foreground group-hover:text-secondary">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            <span
              className="flex-1 truncate text-xs text-muted-foreground group-hover:text-secondary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
                onSelectChapter?.(chapter.id, book.title, chapter.title, book.id);
              }}
              title={chapter.title}
            >{chapter.title}</span>
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="center"
          sideOffset={8}
          className="flex items-center gap-0.5 p-1 w-auto bg-background/95 backdrop-blur-md shadow-lg text-muted-foreground group-hover:text-secondary"
        >
          <DropdownMenu open={dropdownOpen} onOpenChange={(o) => { setDropdownOpen(o); if (!o) setHoverOpen(false); }}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-6 h-6 rounded-sm" onClick={(e) => e.stopPropagation()} data-testid={`button-chapter-menu-${chapter.id}`}>
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename({ kind: "chapter", id: chapter.id, bookId, currentTitle: chapter.title }); }} data-testid={`button-rename-chapter-${chapter.id}`}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> {t('editor.renameChapter')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowNewScene(true); }} data-testid={`button-add-scene-${chapter.id}`}>
                <Plus className="w-3.5 h-3.5 mr-2" /> {t('editor.newScene')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => onDuplicateChapter(chapter, e)} data-testid={`button-duplicate-chapter-${chapter.id}`}>
                <Copy className="w-3.5 h-3.5 mr-2" /> {t('editor.duplicateChapter')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={(e) => onDeleteChapter(bookId, chapter.id, e)} data-testid={`button-delete-chapter-${chapter.id}`}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> {t('editor.deleteChapter')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </HoverCardContent>
      </HoverCard>

      {expanded && (
        <div className="ml-4 space-y-0.5">
          {sorted.length === 0 ? (
            <p className="px-2 py-1 text-muted-foreground text-xs">{t('editor.noScenes')}</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sorted.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {sorted.map((scene, idx) => {
                  const statusKey = (scene.status ?? "draft") as SceneStatus;
                  const dotClass = sceneStatusDot[statusKey] ?? sceneStatusDot.draft;
                  const canDown = idx < sorted.length - 1;
                  return (
                    <SortableSceneRow
                      key={scene.id}
                      scene={scene}
                      selectedSceneId={selectedSceneId}
                      chapter={chapter}
                      book={book}
                      statusKey={statusKey}
                      dotClass={dotClass}
                      t={t}
                      onSelectScene={onSelectScene}
                      canDown={canDown}
                      idx={idx}
                      sorted={sorted}
                      handleDuplicateScene={handleDuplicateScene}
                      handleMergeWithNext={handleMergeWithNext}
                      handleRenameScene={handleRenameScene}
                      handleDeleteScene={handleDeleteScene}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
          <Button variant="ghost" size="sm" className="w-full justify-start h-7 text-xs text-muted-foreground gap-1.5 px-2" onClick={() => setShowNewScene(true)} data-testid={`button-new-scene-${chapter.id}`}>
            <Plus className="w-3 h-3" /> {t('editor.newScene')}
          </Button>
        </div>
      )}

      <Dialog open={showNewScene} onOpenChange={setShowNewScene}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('editor.newScene')}</DialogTitle></DialogHeader>
          <Input autoFocus value={newSceneTitle} onChange={(e) => setNewSceneTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateScene(); }} placeholder={t('editor.sceneTitle')} data-testid="input-new-scene-title" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewScene(false)}>{t('form.cancel')}</Button>
            <Button onClick={handleCreateScene} disabled={!newSceneTitle.trim() || createScene.isPending} data-testid="button-create-scene">{t('editor.createScene')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableChapterRow({
  chapter,
  bookId,
  book,
  chapterList,
  selectedSceneId,
  activeChapterId,
  onSelectScene,
  onSelectChapter,
  onRename,
  onDeleteChapter,
  onDuplicateChapter,
  t,
  toast,
  queryClient,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ChapterRow
        chapter={chapter}
        bookId={bookId}
        book={book}
        chapterList={chapterList}
        selectedSceneId={selectedSceneId}
        activeChapterId={activeChapterId}
        onSelectScene={onSelectScene}
        onSelectChapter={onSelectChapter}
        onRename={onRename}
        onDeleteChapter={onDeleteChapter}
        onDuplicateChapter={onDuplicateChapter}
        t={t}
        toast={toast}
        queryClient={queryClient}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

function BookRow({
  book,
  projectId,
  selectedSceneId,
  activeBookId,
  activeChapterId,
  onSelectScene,
  onSelectChapter,
  onRename,
  onDeleteBook,
  t,
  toast,
  queryClient,
  dragAttributes,
  dragListeners,
}: {
  book: { id: number; title: string };
  projectId: number;
  selectedSceneId: number | null;
  activeBookId?: number | null;
  activeChapterId?: number | null;
  onSelectScene: StructureTreeProps["onSelectScene"];
  onSelectChapter?: StructureTreeProps["onSelectChapter"];
  onRename: (target: RenameTarget) => void;
  onDeleteBook: (bookId: number, e: React.MouseEvent) => void;
  t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string;
  toast: ReturnType<typeof useToast>["toast"];
  queryClient: ReturnType<typeof useQueryClient>;
  dragAttributes?: any;
  dragListeners?: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);

  const { data: chapters = [] } = useListChapters(book.id, {
    query: { enabled: expanded, queryKey: getListChaptersQueryKey(book.id) }
  });

  const createChapter = useCreateChapter();
  const deleteChapter = useDeleteChapter();
  const updateChapter = useUpdateChapter();
  const createScene = useCreateScene();
  const updateScene = useUpdateScene();

  const sorted = [...chapters].sort((a, b) => a.position - b.position);

  const handleCreateChapter = () => {
    if (!newChapterTitle.trim()) return;
    createChapter.mutate({ bookId: book.id, data: { title: newChapterTitle.trim() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(book.id) });
        setNewChapterTitle(""); setShowNewChapter(false);
      },
      onError: () => toast({ title: t('editor.newChapter'), variant: "destructive" }),
    });
  };

  const handleDeleteChapter = (bookId: number, chapterId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChapter.mutate({ bookId, id: chapterId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(bookId) }),
      onError: () => toast({ title: t('editor.deleteChapter'), variant: "destructive" }),
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sorted.findIndex((item) => item.id === active.id);
      const newIndex = sorted.findIndex((item) => item.id === over.id);

      const newArray = arrayMove(sorted, oldIndex, newIndex);

      const updates: { id: number; position: number }[] = [];
      for (let i = 0; i < newArray.length; i++) {
        if (newArray[i].id !== sorted[i].id) {
          updates.push({ id: newArray[i].id, position: sorted[i].position });
        }
      }

      Promise.all(
        updates.map((update) => 
          updateChapter.mutateAsync({ bookId: book.id, id: update.id, data: { position: update.position } })
        )
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(book.id) });
      });
    }
  };

  const handleDuplicateChapter = (chap: { id: number; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    // 1. Fetch all scenes of the original chapter
    customFetch<Array<Record<string, unknown>>>(`/api/chapters/${chap.id}/scenes`)
      .then((originalScenes) => {
        // 2. Create new chapter
        createChapter.mutate(
          { bookId: book.id, data: { title: `${chap.title} (${t('editor.copy')})` } },
          {
            onSuccess: (newChapter) => {
              const newChapterId = (newChapter as { id: number }).id;
              // 3. Re-create each scene sequentially preserving position order
              const sorted = [...originalScenes].sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0));
              const createNext = (idx: number) => {
                if (idx >= sorted.length) {
                  queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(book.id) });
                  return;
                }
                const orig = sorted[idx];
                createScene.mutate(
                  { chapterId: newChapterId, data: { title: (orig.title as string) ?? t('editor.newScene') } },
                  {
                    onSuccess: (newScene) => {
                      updateScene.mutate(
                        {
                          chapterId: newChapterId,
                          id: (newScene as { id: number }).id,
                          data: {
                            content: (orig.content as string) ?? "",
                            status: ((orig.status ?? "draft") as UpdateSceneBodyStatus),
                            povCharacterId: (orig.povCharacterId as number | null) ?? null,
                            locationId: (orig.locationId as number | null) ?? null,
                            timelinePosition: (orig.timelinePosition as string) ?? "",
                            narrativeGoal: (orig.narrativeGoal as string) ?? "",
                            wordCount: (orig.wordCount as number) ?? 0,
                          },
                        },
                        { onSuccess: () => createNext(idx + 1) }
                      );
                    },
                    onError: () => createNext(idx + 1),
                  }
                );
              };
              createNext(0);
            },
            onError: () => toast({ title: t('editor.newChapter'), variant: "destructive" }),
          }
        );
      })
      .catch(() => toast({ title: t('editor.newChapter'), variant: "destructive" }));
  };

  return (
    <div>
      <HoverCard openDelay={0} closeDelay={100} open={hoverOpen || dropdownOpen} onOpenChange={(o) => { if (!dropdownOpen) setHoverOpen(o); }}>
        <HoverCardTrigger asChild>
          <div
            className="group relative flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer select-none transition-colors hover:bg-secondary/15 hover:text-secondary"
            onClick={() => setExpanded((v) => !v)}
            data-testid={`tree-book-${book.id}`}
          >
            <span
              {...dragAttributes}
              {...dragListeners}
              className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing w-3 h-3 flex items-center justify-center shrink-0 -ml-1 text-muted-foreground hover:text-foreground transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-3 h-3" />
            </span>
            {activeBookId === book.id && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-in fade-in" />
            )}
            <button className="shrink-0 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}>
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="flex-1 truncate font-medium text-xs">{book.title}</span>
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="center"
          sideOffset={8}
          className="flex items-center p-1 w-auto bg-background/95 backdrop-blur-md shadow-lg"
        >
          <DropdownMenu open={dropdownOpen} onOpenChange={(o) => { setDropdownOpen(o); if (!o) setHoverOpen(false); }}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-6 h-6 rounded-sm" onClick={(e) => e.stopPropagation()} data-testid={`button-book-menu-${book.id}`}>
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename({ kind: "book", id: book.id, projectId, currentTitle: book.title }); }} data-testid={`button-rename-book-${book.id}`}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> {t('editor.renameBook')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowNewChapter(true); }} data-testid={`button-add-chapter-${book.id}`}>
                <Plus className="w-3.5 h-3.5 mr-2" /> {t('editor.newChapter')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={(e) => onDeleteBook(book.id, e)} data-testid={`button-delete-book-${book.id}`}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> {t('editor.deleteBook')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </HoverCardContent>
      </HoverCard>

      {expanded && (
        <div className="ml-5 space-y-0.5">
          {sorted.length === 0 ? (
            <p className="px-2 py-1 text-muted-foreground text-xs">{t('editor.noChapters')}</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sorted.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {sorted.map((chapter) => (
                  <SortableChapterRow
                    key={chapter.id}
                    chapter={chapter}
                    chapterList={sorted}
                    bookId={book.id}
                    book={book}
                    selectedSceneId={selectedSceneId}
                    activeChapterId={activeChapterId}
                    onSelectScene={onSelectScene}
                    onSelectChapter={onSelectChapter}
                    onRename={onRename}
                    onDeleteChapter={handleDeleteChapter}
                    onDuplicateChapter={handleDuplicateChapter}
                    t={t}
                    toast={toast}
                    queryClient={queryClient}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
          <Button variant="ghost" size="sm" className="w-full justify-start h-7 text-xs text-muted-foreground gap-1.5 px-2" onClick={() => setShowNewChapter(true)} data-testid={`button-new-chapter-${book.id}`}>
            <Plus className="w-3 h-3" /> {t('editor.newChapter')}
          </Button>
        </div>
      )}

      <Dialog open={showNewChapter} onOpenChange={setShowNewChapter}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('editor.newChapter')}</DialogTitle></DialogHeader>
          <Input autoFocus value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateChapter(); }} placeholder={t('editor.chapterTitle')} data-testid="input-new-chapter-title" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChapter(false)}>{t('form.cancel')}</Button>
            <Button onClick={handleCreateChapter} disabled={!newChapterTitle.trim() || createChapter.isPending} data-testid="button-create-chapter">{t('editor.createChapter')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableBookRow({
  book,
  projectId,
  selectedSceneId,
  activeBookId,
  activeChapterId,
  onSelectScene,
  onSelectChapter,
  onRename,
  onDeleteBook,
  t,
  toast,
  queryClient,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BookRow
        book={book}
        projectId={projectId}
        selectedSceneId={selectedSceneId}
        activeBookId={activeBookId}
        activeChapterId={activeChapterId}
        onSelectScene={onSelectScene}
        onSelectChapter={onSelectChapter}
        onRename={onRename}
        onDeleteBook={onDeleteBook}
        t={t}
        toast={toast}
        queryClient={queryClient}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

export function StructureTree({
  projectId,
  selectedSceneId,
  onSelectScene,
  onSelectChapter,
}: StructureTreeProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showNewBook, setShowNewBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");

  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [activeBookId, setActiveBookId] = useState<number | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

  const wrappedOnSelectScene: StructureTreeProps["onSelectScene"] = (sceneId, chapterId, bookTitle, chapterTitle, sceneTitle, bookId) => {
    setActiveBookId(bookId);
    setActiveChapterId(chapterId);
    onSelectScene(sceneId, chapterId, bookTitle, chapterTitle, sceneTitle, bookId);
  };

  const wrappedOnSelectChapter: StructureTreeProps["onSelectChapter"] = onSelectChapter
    ? (chapterId, bookTitle, chapterTitle, bookId) => {
        setActiveBookId(bookId);
        setActiveChapterId(chapterId);
        onSelectChapter(chapterId, bookTitle, chapterTitle, bookId);
      }
    : undefined;

  const { data: books = [] } = useListBooks(projectId, {
    query: { queryKey: getListBooksQueryKey(projectId) }
  });

  const createBook = useCreateBook();
  const deleteBook = useDeleteBook();
  const updateBook = useUpdateBook();
  const updateChapter = useUpdateChapter();
  const updateScene = useUpdateScene();

  const openRename = (target: RenameTarget) => {
    setRenameTarget(target);
    setRenameValue(target.currentTitle);
  };

  const handleRename = () => {
    if (!renameTarget || !renameValue.trim()) return;
    const title = renameValue.trim();

    if (renameTarget.kind === "book") {
      updateBook.mutate(
        { projectId: renameTarget.projectId, id: renameTarget.id, data: { title } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBooksQueryKey(renameTarget.projectId) });
            setRenameTarget(null);
          },
          onError: () => toast({ title: t('editor.newBook'), variant: "destructive" }),
        }
      );
    } else if (renameTarget.kind === "chapter") {
      updateChapter.mutate(
        { bookId: renameTarget.bookId, id: renameTarget.id, data: { title } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(renameTarget.bookId) });
            setRenameTarget(null);
          },
          onError: () => toast({ title: t('editor.newChapter'), variant: "destructive" }),
        }
      );
    } else {
      updateScene.mutate(
        { chapterId: renameTarget.chapterId, id: renameTarget.id, data: { title } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(renameTarget.chapterId) });
            setRenameTarget(null);
          },
          onError: () => toast({ title: t('editor.newScene'), variant: "destructive" }),
        }
      );
    }
  };

  const handleCreateBook = () => {
    if (!newBookTitle.trim()) return;
    createBook.mutate({ projectId, data: { title: newBookTitle.trim() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey(projectId) });
        setNewBookTitle(""); setShowNewBook(false);
      },
      onError: () => toast({ title: t('editor.newBook'), variant: "destructive" }),
    });
  };

  const handleDeleteBook = (bookId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBook.mutate({ projectId, id: bookId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBooksQueryKey(projectId) }),
      onError: () => toast({ title: t('editor.deleteBook'), variant: "destructive" }),
    });
  };

  const isRenaming = renameTarget !== null &&
    (updateBook.isPending || updateChapter.isPending || updateScene.isPending);

  const sortedBooks = [...books].sort((a, b) => ((a as any).position ?? 0) - ((b as any).position ?? 0));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedBooks.findIndex((item) => item.id === active.id);
      const newIndex = sortedBooks.findIndex((item) => item.id === over.id);

      const newArray = arrayMove(sortedBooks, oldIndex, newIndex);

      const updates: { id: number; position: number }[] = [];
      for (let i = 0; i < newArray.length; i++) {
        if (newArray[i].id !== sortedBooks[i].id) {
          updates.push({ id: newArray[i].id, position: (sortedBooks[i] as any).position ?? i });
        }
      }

      Promise.all(
        updates.map((update) => 
          updateBook.mutateAsync({ projectId, id: update.id, data: { position: update.position } })
        )
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey(projectId) });
      });
    }
  };

  return (
    <div className="flex-1 overflow-auto p-2 text-sm">
      <div className="text-xs font-semibold text-muted-foreground tracking-widest px-2 py-2 mb-1">
        {t('editor.manuscript')}
      </div>

      {books.length === 0 ? (
        <p className="px-2 py-3 text-muted-foreground text-xs">{t('editor.noBooks')}</p>
      ) : (
        <div className="space-y-0.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedBooks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {sortedBooks.map((book) => (
                <SortableBookRow
                  key={book.id}
                  book={book}
                  projectId={projectId}
                  selectedSceneId={selectedSceneId}
                  activeBookId={activeBookId}
                  activeChapterId={activeChapterId}
                  onSelectScene={wrappedOnSelectScene}
                  onSelectChapter={wrappedOnSelectChapter}
                  onRename={openRename}
                  onDeleteBook={handleDeleteBook}
                  t={t}
                  toast={toast}
                  queryClient={queryClient}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs text-muted-foreground gap-1.5 px-2 mt-2" onClick={() => setShowNewBook(true)} data-testid="button-new-book">
        <Plus className="w-3.5 h-3.5" /> {t('editor.newBook')}
      </Button>

      <Dialog open={showNewBook} onOpenChange={setShowNewBook}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('editor.newBook')}</DialogTitle></DialogHeader>
          <Input autoFocus value={newBookTitle} onChange={(e) => setNewBookTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBook(); }} placeholder={t('editor.bookTitle')} data-testid="input-new-book-title" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBook(false)}>{t('form.cancel')}</Button>
            <Button onClick={handleCreateBook} disabled={!newBookTitle.trim() || createBook.isPending} data-testid="button-create-book">{t('editor.createBook')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameTarget !== null} onOpenChange={(o) => { if (!o) setRenameTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {renameTarget?.kind === "book" ? t('editor.renameBook') :
               renameTarget?.kind === "chapter" ? t('editor.renameChapter') :
               t('editor.renameScene')}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            placeholder={
              renameTarget?.kind === "book" ? t('editor.bookTitle') :
              renameTarget?.kind === "chapter" ? t('editor.chapterTitle') :
              t('editor.sceneTitle')
            }
            data-testid="input-rename"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>{t('form.cancel')}</Button>
            <Button onClick={handleRename} disabled={!renameValue.trim() || isRenaming} data-testid="button-confirm-rename">
              {t('form.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
