import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useParams } from "wouter";
import { useGetProject, getGetProjectQueryKey, useListScenes, getListScenesQueryKey } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Settings, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight, ChevronRight, BookOpen, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StructureTree } from "@/components/editor/StructureTree";
import { SceneEditor } from "@/components/editor/SceneEditor";
import { ChapterView } from "@/components/editor/ChapterView";
import { ImportDialog } from "@/components/editor/ImportDialog";
import { RightPanel } from "@/components/editor/RightPanel";

export default function Editor() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { t } = useI18n();

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedBookTitle, setSelectedBookTitle] = useState<string | null>(null);
  const [selectedChapterTitle, setSelectedChapterTitle] = useState<string | null>(null);
  const [selectedSceneTitle, setSelectedSceneTitle] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [chapterView, setChapterView] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [pendingAnalyzeText, setPendingAnalyzeText] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [aiTabTrigger, setAiTabTrigger] = useState(0);
  const insertTextFnRef = useRef<((text: string) => void) | null>(null);
  const replaceTextFnRef = useRef<((text: string) => void) | null>(null);

  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(288);
  const dragRef = useRef<{ side: "left" | "right"; startX: number; startW: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      if (dragRef.current.side === "left") {
        setLeftWidth(Math.min(480, Math.max(160, dragRef.current.startW + dx)));
      } else {
        setRightWidth(Math.min(520, Math.max(200, dragRef.current.startW - dx)));
      }
    };
    const onUp = () => { dragRef.current = null; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  const startDrag = useCallback((side: "left" | "right", e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { side, startX: e.clientX, startW: side === "left" ? leftWidth : rightWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftWidth, rightWidth]);

  const { data: project, isLoading: projectLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) }
  });

  const { data: chapterScenes = [] } = useListScenes(selectedChapterId ?? 0, {
    query: { enabled: !!selectedChapterId && !chapterView, queryKey: getListScenesQueryKey(selectedChapterId ?? 0) }
  });

  const chapterWordCount = useMemo(() => {
    return chapterScenes.reduce((sum, s) => sum + (s.wordCount ?? 0), 0);
  }, [chapterScenes]);

  const handleSelectScene = useCallback((
    sceneId: number,
    chapterId: number,
    bookTitle: string,
    chapterTitle: string,
    sceneTitle: string,
    bookId: number,
  ) => {
    setSelectedSceneId(sceneId);
    setSelectedChapterId(chapterId);
    setSelectedBookTitle(bookTitle);
    setSelectedChapterTitle(chapterTitle);
    setSelectedSceneTitle(sceneTitle);
    setSelectedBookId(bookId);
    setChapterView(false);
    setSaveStatus("idle");
    setWordCount(0);
  }, []);

  const handleSelectChapter = useCallback((
    chapterId: number,
    bookTitle: string,
    chapterTitle: string,
    bookId: number,
  ) => {
    setSelectedChapterId(chapterId);
    setSelectedChapterTitle(chapterTitle);
    setSelectedBookTitle(bookTitle);
    setSelectedBookId(bookId);
    setSelectedSceneId(null);
    setSelectedSceneTitle(null);
    setChapterView(true);
    setWordCount(0);
  }, []);

  const handleWordCountChange = useCallback((count: number) => {
    setWordCount(count);
  }, []);

  const handleSaveStatusChange = useCallback((s: "idle" | "saving" | "saved") => {
    setSaveStatus(s);
  }, []);

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {t('form.saving')}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {t('notFound.message')}
      </div>
    );
  }

  const hasScene = !!(selectedSceneId && selectedChapterId);
  const hasContent = hasScene || (chapterView && !!selectedChapterId);

  return (
    <div className="flex h-full overflow-hidden bg-background" data-testid="editor-layout">

      {/* Left panel */}
      {leftOpen ? (
        <div className="shrink-0 flex flex-col bg-card/50" style={{ width: leftWidth }} data-testid="panel-structure">
          <div className="h-11 border-b flex items-center justify-between px-3 shrink-0 gap-2">
            <span
              className="font-semibold text-sm truncate text-foreground"
              title={project.name}
              data-testid="text-project-name-left"
            >
              {project.name}
            </span>
            <div className="flex items-center shrink-0 gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => setShowImport(true)}
                title={t('editor.import')}
                data-testid="button-import"
              >
                <Upload className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                asChild
                data-testid="button-project-settings"
              >
                <Link href={`/projects/${id}/settings`}>
                  <Settings className="w-3.5 h-3.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => setLeftOpen(false)}
                data-testid="button-close-left-panel"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <StructureTree
            projectId={id}
            selectedSceneId={selectedSceneId}
            onSelectScene={handleSelectScene}
            onSelectChapter={handleSelectChapter}
          />
        </div>
      ) : (
        <div className="w-10 shrink-0 border-r border-border flex flex-col items-center py-2 bg-card/50">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => setLeftOpen(true)}
            data-testid="button-open-left-panel"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Left resize handle */}
      {leftOpen && (
        <div
          className="w-px shrink-0 cursor-col-resize bg-border hover:bg-primary/60 active:bg-primary transition-colors z-10"
          onMouseDown={(e) => startDrag("left", e)}
          data-testid="resize-handle-left"
        />
      )}

      {/* Center panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative" data-testid="panel-center">
        {/* Topbar with breadcrumb */}
        <div className="h-11 border-b flex items-center justify-between px-4 shrink-0 gap-2">
          <div className="flex items-center text-xs text-muted-foreground gap-1 min-w-0 overflow-hidden flex-1">
            <span className="font-medium text-foreground shrink-0" data-testid="text-breadcrumb-project">
              {project.name}
            </span>
            {selectedBookTitle && (
              <>
                <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/50" />
                <span className="shrink-0 truncate max-w-[100px]" data-testid="text-breadcrumb-book">
                  {selectedBookTitle}
                </span>
              </>
            )}
            {selectedChapterTitle && (
              <>
                <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/50" />
                <span className="shrink-0 truncate max-w-[100px]" data-testid="text-breadcrumb-chapter">
                  {selectedChapterTitle}
                </span>
              </>
            )}
            {selectedSceneTitle && !chapterView && (
              <>
                <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/50" />
                <span className="font-medium text-foreground shrink-0 truncate max-w-[100px]" data-testid="text-breadcrumb-scene">
                  {selectedSceneTitle}
                </span>
              </>
            )}
          </div>

          {/* Chapter view toggle */}
          {hasScene && (
            <Button
              variant={chapterView ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2 shrink-0 gap-1"
              onClick={() => { setChapterView(!chapterView); setWordCount(0); }}
              data-testid="button-toggle-chapter-view"
            >
              {chapterView ? (
                <><FileText className="w-3 h-3" />{t('editor.sceneView')}</>
              ) : (
                <><BookOpen className="w-3 h-3" />{t('editor.chapterView')}</>
              )}
            </Button>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {!hasContent && (
            <div
              className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 text-center px-8"
              data-testid="status-no-scene-selected"
            >
              <p className="text-sm max-w-xs">{t('editor.selectScene')}</p>
            </div>
          )}

          {hasContent && chapterView && selectedChapterTitle && (
            <ChapterView
              chapterId={selectedChapterId!}
              chapterTitle={selectedChapterTitle}
              onWordCountChange={handleWordCountChange}
            />
          )}

          {hasContent && !chapterView && (
            <SceneEditor
              sceneId={selectedSceneId!}
              chapterId={selectedChapterId!}
              projectId={id}
              onWordCountChange={handleWordCountChange}
              onSaveStatusChange={handleSaveStatusChange}
              onSelectedTextChange={setSelectedText}
              onInsertTextReady={(fn) => { insertTextFnRef.current = fn; }}
              onReplaceSelectionReady={(fn) => { replaceTextFnRef.current = fn; }}
              onAiRequest={() => setAiTabTrigger((n) => n + 1)}
            />
          )}
        </div>

        {/* Status bar */}
        <div
          className="h-8 border-t flex items-center justify-between px-4 shrink-0 text-xs text-muted-foreground bg-muted/20"
          data-testid="status-bar"
        >
          <div className="flex items-center gap-3">
            {/* Scene word count */}
            <span data-testid="text-word-count">
              {wordCount.toLocaleString()} {t('editor.words')}
            </span>
            {/* Chapter total — shown in both scene and chapter view */}
            {hasScene && !chapterView && chapterWordCount > 0 && (
              <span className="text-muted-foreground/50" data-testid="text-chapter-word-count">
                {t('editor.chapterFullTitle')}: {chapterWordCount.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!chapterView && saveStatus !== "idle" && (
              <span
                className={`shrink-0 ${saveStatus === "saving" ? "text-muted-foreground" : "text-green-600 dark:text-green-400"}`}
                data-testid="status-save-bar"
              >
                {saveStatus === "saving" ? t('editor.saving') : t('editor.saved')}
              </span>
            )}
            {selectedSceneId && !chapterView && selectedSceneTitle && (
              <span className="text-muted-foreground/60 truncate max-w-[180px]" data-testid="text-scene-status">
                {selectedSceneTitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right resize handle */}
      {rightOpen && (
        <div
          className="w-px shrink-0 cursor-col-resize bg-border hover:bg-primary/60 active:bg-primary transition-colors z-10"
          onMouseDown={(e) => startDrag("right", e)}
          data-testid="resize-handle-right"
        />
      )}

      {/* Right panel */}
      {rightOpen ? (
        <div className="shrink-0 flex flex-col bg-card/50" style={{ width: rightWidth }} data-testid="panel-right">
          <div className="h-11 border-b flex items-center justify-end px-3 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setRightOpen(false)}
              data-testid="button-close-right-panel"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <RightPanel
              projectId={id}
              sceneId={selectedSceneId ?? undefined}
              chapterId={selectedChapterId ?? undefined}
              onInsertText={(text) => { insertTextFnRef.current?.(text); }}
              onReplaceText={(text) => { replaceTextFnRef.current?.(text); }}
              selectedText={selectedText}
              analyzeText={pendingAnalyzeText}
              onAnalyzeConsumed={() => setPendingAnalyzeText(null)}
              forceAiTab={aiTabTrigger}
            />
          </div>
        </div>
      ) : (
        <div className="w-10 shrink-0 border-l border-border flex flex-col items-center py-2 bg-card/50">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => setRightOpen(true)}
            data-testid="button-open-right-panel"
          >
            <PanelRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Import dialog — always available, book selector inside */}
      <ImportDialog
        projectId={id}
        bookId={selectedBookId}
        open={showImport}
        onClose={(rawText) => {
          setShowImport(false);
          if (rawText && rawText.length > 50) {
            setPendingAnalyzeText(rawText);
          }
        }}
      />
    </div>
  );
}
