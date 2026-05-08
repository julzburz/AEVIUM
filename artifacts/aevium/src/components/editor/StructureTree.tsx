import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBooks, getListBooksQueryKey,
  useListChapters, getListChaptersQueryKey,
  useListScenes, getListScenesQueryKey,
  useCreateBook, useDeleteBook,
  useCreateChapter, useDeleteChapter,
  useCreateScene, useDeleteScene,
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
  ChevronRight, ChevronDown, BookOpen, FileText, Plus, MoreHorizontal, Trash2,
} from "lucide-react";

interface StructureTreeProps {
  projectId: number;
  selectedSceneId: number | null;
  onSelectScene: (
    sceneId: number,
    chapterId: number,
    bookTitle: string,
    chapterTitle: string,
    sceneTitle: string
  ) => void;
}

export function StructureTree({
  projectId,
  selectedSceneId,
  onSelectScene,
}: StructureTreeProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [activeBookId, setActiveBookId] = useState<number | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

  const [newBookTitle, setNewBookTitle] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newSceneTitle, setNewSceneTitle] = useState("");

  const [showNewBook, setShowNewBook] = useState(false);
  const [showNewChapterForBook, setShowNewChapterForBook] = useState<number | null>(null);
  const [showNewSceneForChapter, setShowNewSceneForChapter] = useState<number | null>(null);

  const { data: books = [] } = useListBooks(projectId, {
    query: { queryKey: getListBooksQueryKey(projectId) }
  });

  const { data: chapters = [] } = useListChapters(activeBookId!, {
    query: {
      enabled: !!activeBookId,
      queryKey: getListChaptersQueryKey(activeBookId!)
    }
  });

  const { data: scenes = [] } = useListScenes(activeChapterId!, {
    query: {
      enabled: !!activeChapterId,
      queryKey: getListScenesQueryKey(activeChapterId!)
    }
  });

  const createBook = useCreateBook();
  const deleteBook = useDeleteBook();
  const createChapter = useCreateChapter();
  const deleteChapter = useDeleteChapter();
  const createScene = useCreateScene();
  const deleteScene = useDeleteScene();

  const toggleBook = (bookId: number) => {
    const next = new Set(expandedBooks);
    if (next.has(bookId)) {
      next.delete(bookId);
      if (activeBookId === bookId) {
        setActiveBookId(null);
        setActiveChapterId(null);
        setExpandedChapters(new Set());
      }
    } else {
      next.add(bookId);
      setActiveBookId(bookId);
    }
    setExpandedBooks(next);
  };

  const toggleChapter = (chapterId: number) => {
    const next = new Set(expandedChapters);
    if (next.has(chapterId)) {
      next.delete(chapterId);
      if (activeChapterId === chapterId) setActiveChapterId(null);
    } else {
      next.add(chapterId);
      setActiveChapterId(chapterId);
    }
    setExpandedChapters(next);
  };

  const handleCreateBook = () => {
    if (!newBookTitle.trim()) return;
    createBook.mutate(
      { projectId, data: { title: newBookTitle.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBooksQueryKey(projectId) });
          setNewBookTitle("");
          setShowNewBook(false);
        },
        onError: () => toast({ title: t('editor.newBook'), variant: "destructive" }),
      }
    );
  };

  const handleDeleteBook = (bookId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBook.mutate(
      { projectId, id: bookId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBooksQueryKey(projectId) });
          if (activeBookId === bookId) setActiveBookId(null);
        },
        onError: () => toast({ title: t('editor.deleteBook'), variant: "destructive" }),
      }
    );
  };

  const handleCreateChapter = (bookId: number) => {
    if (!newChapterTitle.trim()) return;
    createChapter.mutate(
      { bookId, data: { title: newChapterTitle.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(bookId) });
          setNewChapterTitle("");
          setShowNewChapterForBook(null);
        },
        onError: () => toast({ title: t('editor.newChapter'), variant: "destructive" }),
      }
    );
  };

  const handleDeleteChapter = (bookId: number, chapterId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChapter.mutate(
      { bookId, id: chapterId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(bookId) });
          if (activeChapterId === chapterId) setActiveChapterId(null);
        },
        onError: () => toast({ title: t('editor.deleteChapter'), variant: "destructive" }),
      }
    );
  };

  const handleCreateScene = (chapterId: number) => {
    if (!newSceneTitle.trim()) return;
    createScene.mutate(
      { chapterId, data: { title: newSceneTitle.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(chapterId) });
          setNewSceneTitle("");
          setShowNewSceneForChapter(null);
        },
        onError: () => toast({ title: t('editor.newScene'), variant: "destructive" }),
      }
    );
  };

  const handleDeleteScene = (chapterId: number, sceneId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteScene.mutate(
      { chapterId, id: sceneId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(chapterId) });
        },
        onError: () => toast({ title: t('editor.deleteScene'), variant: "destructive" }),
      }
    );
  };

  const chaptersForBook = (bookId: number) => activeBookId === bookId ? chapters : [];
  const scenesForChapter = (chapterId: number) => activeChapterId === chapterId ? scenes : [];

  return (
    <div className="flex-1 overflow-auto p-2 text-sm">
      <div className="text-xs font-semibold text-muted-foreground tracking-widest px-2 py-2 mb-1">
        {t('editor.manuscript')}
      </div>

      {books.length === 0 ? (
        <p className="px-2 py-3 text-muted-foreground text-xs">{t('editor.noBooks')}</p>
      ) : (
        <div className="space-y-0.5">
          {books.map((book) => {
            const isBookExpanded = expandedBooks.has(book.id);
            const bookChapters = chaptersForBook(book.id);

            return (
              <div key={book.id}>
                <div
                  className="group flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer select-none"
                  onClick={() => toggleBook(book.id)}
                  data-testid={`tree-book-${book.id}`}
                >
                  <button
                    className="shrink-0 text-muted-foreground"
                    onClick={(e) => { e.stopPropagation(); toggleBook(book.id); }}
                  >
                    {isBookExpanded
                      ? <ChevronDown className="w-3.5 h-3.5" />
                      : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="flex-1 truncate font-medium text-xs">{book.title}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-5 h-5"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-book-menu-${book.id}`}
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setShowNewChapterForBook(book.id); }}
                          data-testid={`button-add-chapter-${book.id}`}
                        >
                          <Plus className="w-3.5 h-3.5 mr-2" /> {t('editor.newChapter')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => handleDeleteBook(book.id, e)}
                          data-testid={`button-delete-book-${book.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> {t('editor.deleteBook')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {isBookExpanded && (
                  <div className="ml-5 space-y-0.5">
                    {bookChapters.length === 0 ? (
                      <p className="px-2 py-1 text-muted-foreground text-xs">{t('editor.noChapters')}</p>
                    ) : (
                      bookChapters.map((chapter) => {
                        const isChapterExpanded = expandedChapters.has(chapter.id);
                        const chapterScenes = scenesForChapter(chapter.id);

                        return (
                          <div key={chapter.id}>
                            <div
                              className="group flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer select-none"
                              onClick={() => toggleChapter(chapter.id)}
                              data-testid={`tree-chapter-${chapter.id}`}
                            >
                              <button className="shrink-0 text-muted-foreground">
                                {isChapterExpanded
                                  ? <ChevronDown className="w-3 h-3" />
                                  : <ChevronRight className="w-3 h-3" />}
                              </button>
                              <span className="flex-1 truncate text-xs text-muted-foreground">{chapter.title}</span>
                              <div className="opacity-0 group-hover:opacity-100 flex items-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-5 h-5"
                                      onClick={(e) => e.stopPropagation()}
                                      data-testid={`button-chapter-menu-${chapter.id}`}
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem
                                      onClick={(e) => { e.stopPropagation(); setShowNewSceneForChapter(chapter.id); }}
                                      data-testid={`button-add-scene-${chapter.id}`}
                                    >
                                      <Plus className="w-3.5 h-3.5 mr-2" /> {t('editor.newScene')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={(e) => handleDeleteChapter(book.id, chapter.id, e)}
                                      data-testid={`button-delete-chapter-${chapter.id}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-2" /> {t('editor.deleteChapter')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {isChapterExpanded && (
                              <div className="ml-4 space-y-0.5">
                                {chapterScenes.length === 0 ? (
                                  <p className="px-2 py-1 text-muted-foreground text-xs">{t('editor.noScenes')}</p>
                                ) : (
                                  chapterScenes.map((scene) => (
                                    <div
                                      key={scene.id}
                                      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer select-none ${
                                        selectedSceneId === scene.id
                                          ? "bg-primary/10 text-primary"
                                          : "hover:bg-muted/50 text-muted-foreground"
                                      }`}
                                      onClick={() =>
                                        onSelectScene(scene.id, chapter.id, book.title, chapter.title, scene.title)
                                      }
                                      data-testid={`tree-scene-${scene.id}`}
                                    >
                                      <FileText className="w-3 h-3 shrink-0" />
                                      <span className="flex-1 truncate text-xs">{scene.title}</span>
                                      <div className="opacity-0 group-hover:opacity-100">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="w-5 h-5 text-destructive"
                                          onClick={(e) => handleDeleteScene(chapter.id, scene.id, e)}
                                          data-testid={`button-delete-scene-${scene.id}`}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start h-7 text-xs text-muted-foreground gap-1.5 px-2"
                                  onClick={() => setShowNewSceneForChapter(chapter.id)}
                                  data-testid={`button-new-scene-${chapter.id}`}
                                >
                                  <Plus className="w-3 h-3" /> {t('editor.newScene')}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-7 text-xs text-muted-foreground gap-1.5 px-2"
                      onClick={() => setShowNewChapterForBook(book.id)}
                      data-testid={`button-new-chapter-${book.id}`}
                    >
                      <Plus className="w-3 h-3" /> {t('editor.newChapter')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start h-8 text-xs text-muted-foreground gap-1.5 px-2 mt-2"
        onClick={() => setShowNewBook(true)}
        data-testid="button-new-book"
      >
        <Plus className="w-3.5 h-3.5" /> {t('editor.newBook')}
      </Button>

      <Dialog open={showNewBook} onOpenChange={setShowNewBook}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('editor.newBook')}</DialogTitle></DialogHeader>
          <Input
            autoFocus
            value={newBookTitle}
            onChange={(e) => setNewBookTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBook(); }}
            placeholder={t('editor.bookTitle')}
            data-testid="input-new-book-title"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBook(false)}>{t('form.cancel')}</Button>
            <Button
              onClick={handleCreateBook}
              disabled={!newBookTitle.trim() || createBook.isPending}
              data-testid="button-create-book"
            >
              {t('editor.createBook')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showNewChapterForBook !== null}
        onOpenChange={(o) => { if (!o) setShowNewChapterForBook(null); }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>{t('editor.newChapter')}</DialogTitle></DialogHeader>
          <Input
            autoFocus
            value={newChapterTitle}
            onChange={(e) => setNewChapterTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && showNewChapterForBook) handleCreateChapter(showNewChapterForBook);
            }}
            placeholder={t('editor.chapterTitle')}
            data-testid="input-new-chapter-title"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChapterForBook(null)}>{t('form.cancel')}</Button>
            <Button
              onClick={() => showNewChapterForBook && handleCreateChapter(showNewChapterForBook)}
              disabled={!newChapterTitle.trim() || createChapter.isPending}
              data-testid="button-create-chapter"
            >
              {t('editor.createChapter')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showNewSceneForChapter !== null}
        onOpenChange={(o) => { if (!o) setShowNewSceneForChapter(null); }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>{t('editor.newScene')}</DialogTitle></DialogHeader>
          <Input
            autoFocus
            value={newSceneTitle}
            onChange={(e) => setNewSceneTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && showNewSceneForChapter) handleCreateScene(showNewSceneForChapter);
            }}
            placeholder={t('editor.sceneTitle')}
            data-testid="input-new-scene-title"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSceneForChapter(null)}>{t('form.cancel')}</Button>
            <Button
              onClick={() => showNewSceneForChapter && handleCreateScene(showNewSceneForChapter)}
              disabled={!newSceneTitle.trim() || createScene.isPending}
              data-testid="button-create-scene"
            >
              {t('editor.createScene')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
