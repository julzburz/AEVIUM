import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBooks, getListBooksQueryKey,
  useListChapters, getListChaptersQueryKey,
  useListScenes, getListScenesQueryKey,
  useCreateBook, useDeleteBook, useUpdateBook,
  useCreateChapter, useDeleteChapter, useUpdateChapter,
  useCreateScene, useDeleteScene, useUpdateScene,
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
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
  ChevronRight, ChevronDown, BookOpen, FileText, Plus, MoreHorizontal, Trash2, Pencil,
} from "lucide-react";

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
}

type SceneStatus = "draft" | "in_review" | "ready" | "blocked";

const sceneStatusDot: Record<SceneStatus, string> = {
  draft:     "bg-muted-foreground/40",
  in_review: "bg-yellow-400",
  ready:     "bg-green-500",
  blocked:   "bg-destructive",
};

type RenameTarget =
  | { kind: "book";    id: number; projectId: number;  currentTitle: string }
  | { kind: "chapter"; id: number; bookId: number;     currentTitle: string }
  | { kind: "scene";   id: number; chapterId: number;  currentTitle: string };

function ChapterRow({
  chapter,
  bookId,
  book,
  selectedSceneId,
  onSelectScene,
  onRename,
  onDeleteChapter,
  t,
  toast,
  queryClient,
}: {
  chapter: { id: number; title: string };
  bookId: number;
  book: { id: number; title: string };
  selectedSceneId: number | null;
  onSelectScene: StructureTreeProps["onSelectScene"];
  onRename: (target: RenameTarget) => void;
  onDeleteChapter: (bookId: number, chapterId: number, e: React.MouseEvent) => void;
  t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string;
  toast: ReturnType<typeof useToast>["toast"];
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNewScene, setShowNewScene] = useState(false);
  const [newSceneTitle, setNewSceneTitle] = useState("");

  const { data: scenes = [] } = useListScenes(chapter.id, {
    query: { enabled: expanded, queryKey: getListScenesQueryKey(chapter.id) }
  });

  const createScene = useCreateScene();
  const deleteScene = useDeleteScene();
  const updateScene = useUpdateScene();

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

  const handleRenameScene = (scene: { id: number; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    onRename({ kind: "scene", id: scene.id, chapterId: chapter.id, currentTitle: scene.title });
  };

  return (
    <div>
      <div
        className="group flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
        data-testid={`tree-chapter-${chapter.id}`}
      >
        <button className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <span className="flex-1 truncate text-xs text-muted-foreground">{chapter.title}</span>
        <div className="opacity-0 group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-5 h-5" onClick={(e) => e.stopPropagation()} data-testid={`button-chapter-menu-${chapter.id}`}>
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename({ kind: "chapter", id: chapter.id, bookId, currentTitle: chapter.title }); }} data-testid={`button-rename-chapter-${chapter.id}`}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> {t('editor.renameChapter')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowNewScene(true); }} data-testid={`button-add-scene-${chapter.id}`}>
                <Plus className="w-3.5 h-3.5 mr-2" /> {t('editor.newScene')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={(e) => onDeleteChapter(bookId, chapter.id, e)} data-testid={`button-delete-chapter-${chapter.id}`}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> {t('editor.deleteChapter')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {expanded && (
        <div className="ml-4 space-y-0.5">
          {scenes.length === 0 ? (
            <p className="px-2 py-1 text-muted-foreground text-xs">{t('editor.noScenes')}</p>
          ) : scenes.map((scene) => {
            const statusKey = (scene.status ?? "draft") as SceneStatus;
            const dotClass = sceneStatusDot[statusKey] ?? sceneStatusDot.draft;
            return (
              <div
                key={scene.id}
                className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer select-none ${
                  selectedSceneId === scene.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground"
                }`}
                onClick={() => onSelectScene(scene.id, chapter.id, book.title, chapter.title, scene.title, book.id)}
                data-testid={`tree-scene-${scene.id}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} title={t(`editor.${statusKey}` as Parameters<typeof t>[0])} />
                <FileText className="w-3 h-3 shrink-0" />
                <span className="flex-1 truncate text-xs">{scene.title}</span>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="w-5 h-5" onClick={(e) => handleRenameScene(scene, e)} data-testid={`button-rename-scene-${scene.id}`}>
                    <Pencil className="w-2.5 h-2.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-5 h-5 text-destructive" onClick={(e) => handleDeleteScene(scene.id, e)} data-testid={`button-delete-scene-${scene.id}`}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                </div>
              </div>
            );
          })}
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

function BookRow({
  book,
  projectId,
  selectedSceneId,
  onSelectScene,
  onRename,
  onDeleteBook,
  t,
  toast,
  queryClient,
}: {
  book: { id: number; title: string };
  projectId: number;
  selectedSceneId: number | null;
  onSelectScene: StructureTreeProps["onSelectScene"];
  onRename: (target: RenameTarget) => void;
  onDeleteBook: (bookId: number, e: React.MouseEvent) => void;
  t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string;
  toast: ReturnType<typeof useToast>["toast"];
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");

  const { data: chapters = [] } = useListChapters(book.id, {
    query: { enabled: expanded, queryKey: getListChaptersQueryKey(book.id) }
  });

  const createChapter = useCreateChapter();
  const deleteChapter = useDeleteChapter();

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

  return (
    <div>
      <div
        className="group flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
        data-testid={`tree-book-${book.id}`}
      >
        <button className="shrink-0 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}>
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="flex-1 truncate font-medium text-xs">{book.title}</span>
        <div className="opacity-0 group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-5 h-5" onClick={(e) => e.stopPropagation()} data-testid={`button-book-menu-${book.id}`}>
                <MoreHorizontal className="w-3 h-3" />
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
        </div>
      </div>

      {expanded && (
        <div className="ml-5 space-y-0.5">
          {chapters.length === 0 ? (
            <p className="px-2 py-1 text-muted-foreground text-xs">{t('editor.noChapters')}</p>
          ) : chapters.map((chapter) => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              bookId={book.id}
              book={book}
              selectedSceneId={selectedSceneId}
              onSelectScene={onSelectScene}
              onRename={onRename}
              onDeleteChapter={handleDeleteChapter}
              t={t}
              toast={toast}
              queryClient={queryClient}
            />
          ))}
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

export function StructureTree({
  projectId,
  selectedSceneId,
  onSelectScene,
}: StructureTreeProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showNewBook, setShowNewBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");

  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState("");

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

  return (
    <div className="flex-1 overflow-auto p-2 text-sm">
      <div className="text-xs font-semibold text-muted-foreground tracking-widest px-2 py-2 mb-1">
        {t('editor.manuscript')}
      </div>

      {books.length === 0 ? (
        <p className="px-2 py-3 text-muted-foreground text-xs">{t('editor.noBooks')}</p>
      ) : (
        <div className="space-y-0.5">
          {books.map((book) => (
            <BookRow
              key={book.id}
              book={book}
              projectId={projectId}
              selectedSceneId={selectedSceneId}
              onSelectScene={onSelectScene}
              onRename={openRename}
              onDeleteBook={handleDeleteBook}
              t={t}
              toast={toast}
              queryClient={queryClient}
            />
          ))}
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
