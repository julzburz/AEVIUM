import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useParams } from "wouter";
import { 
  useGetProject, getGetProjectQueryKey,
  useListBooks, getListBooksQueryKey,
  useListChapters, getListChaptersQueryKey,
  useListScenes, getListScenesQueryKey
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Settings, ChevronRight, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Editor() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { t } = useI18n();

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [activeSceneId, setActiveSceneId] = useState<number | null>(null);

  const { data: project, isLoading: projectLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) }
  });

  if (projectLoading) {
    return <div className="flex items-center justify-center h-full">Loading project...</div>;
  }

  if (!project) {
    return <div className="flex items-center justify-center h-full">Project not found</div>;
  }

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* LEFT PANEL */}
      {leftOpen ? (
        <div className="w-64 shrink-0 border-r border-border flex flex-col bg-card/50">
          <div className="h-12 border-b flex items-center justify-between px-3 shrink-0">
            <span className="font-semibold text-sm truncate">{project.name}</span>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="w-7 h-7" asChild>
                <Link href={`/projects/${id}/settings`}>
                  <Settings className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setLeftOpen(false)}>
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-1">MANUSCRIPT</div>
            {/* Tree goes here */}
            <div className="text-sm px-2 text-muted-foreground">Tree coming soon...</div>
          </div>
        </div>
      ) : (
        <div className="w-12 shrink-0 border-r border-border flex flex-col items-center py-2 bg-card/50">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setLeftOpen(true)}>
            <PanelLeft className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        <div className="h-12 border-b flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center text-sm text-muted-foreground gap-2">
            <span className="hover:text-foreground cursor-pointer">Book 1</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-foreground cursor-pointer">Chapter 1</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">Scene 1</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <span>0 {t('editor.words')}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8 md:p-12 lg:p-16 relative">
          <div className="max-w-2xl mx-auto">
            {activeSceneId ? (
              <div className="text-lg">Editor coming soon...</div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                Select a scene from the left panel to start writing.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      {rightOpen ? (
        <div className="w-80 shrink-0 border-l border-border flex flex-col bg-card/50">
          <div className="h-12 border-b flex items-center justify-between px-3 shrink-0">
            <div className="flex gap-2">
              <span className="text-sm font-medium px-2 py-1 bg-muted rounded">AI</span>
              <span className="text-sm font-medium px-2 py-1 text-muted-foreground hover:text-foreground cursor-pointer">Memory</span>
            </div>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setRightOpen(false)}>
              <PanelRightClose className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="text-sm text-muted-foreground">Assistant coming soon...</div>
          </div>
        </div>
      ) : (
        <div className="w-12 shrink-0 border-l border-border flex flex-col items-center py-2 bg-card/50">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setRightOpen(true)}>
            <PanelRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
