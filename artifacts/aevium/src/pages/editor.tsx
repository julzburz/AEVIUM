import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useParams } from "wouter";
import { useGetProject, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Settings, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StructureTree } from "@/components/editor/StructureTree";
import { SceneEditor } from "@/components/editor/SceneEditor";
import { RightPanel } from "@/components/editor/RightPanel";

export default function Editor() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState(0);

  const { data: project, isLoading: projectLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) }
  });

  const handleSelectScene = useCallback((sceneId: number, chapterId: number) => {
    setSelectedSceneId(sceneId);
    setSelectedChapterId(chapterId);
  }, []);

  const handleWordCountChange = useCallback((count: number) => {
    setWordCount(count);
  }, []);

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {t('form.saving')}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {t('notFound.message')}
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-background" data-testid="editor-layout">

      {leftOpen ? (
        <div className="w-60 shrink-0 border-r border-border flex flex-col bg-card/50" data-testid="panel-structure">
          <div className="h-11 border-b flex items-center justify-between px-3 shrink-0 gap-2">
            <span
              className="font-semibold text-sm truncate cursor-pointer hover:underline text-foreground"
              onClick={() => setLocation(`/projects/${id}`)}
              data-testid="text-project-name"
              title={project.name}
            >
              {project.name}
            </span>
            <div className="flex items-center shrink-0">
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
            selectedChapterId={selectedChapterId}
            onSelectScene={handleSelectScene}
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

      <div className="flex-1 flex flex-col min-w-0 bg-background relative" data-testid="panel-center">
        <div className="h-11 border-b flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center text-xs text-muted-foreground gap-1.5 min-w-0">
            <span className="font-medium text-foreground truncate">
              {project.name}
            </span>
            {selectedSceneId && (
              <span className="text-muted-foreground/50">/</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono shrink-0">
            <span data-testid="text-word-count">{wordCount} {t('editor.words')}</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto relative">
          {selectedSceneId && selectedChapterId ? (
            <SceneEditor
              sceneId={selectedSceneId}
              chapterId={selectedChapterId}
              onWordCountChange={handleWordCountChange}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 text-center px-8"
              data-testid="status-no-scene-selected"
            >
              <p className="text-sm max-w-xs">{t('editor.selectScene')}</p>
            </div>
          )}
        </div>
      </div>

      {rightOpen ? (
        <div className="w-72 shrink-0 border-l border-border flex flex-col bg-card/50" data-testid="panel-right">
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
            <RightPanel projectId={id} />
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
    </div>
  );
}
