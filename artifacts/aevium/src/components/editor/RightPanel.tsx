import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Bot, Users, AlertTriangle, Clock, Feather, StickyNote } from "lucide-react";
import { MemoryPanel } from "./MemoryPanel";
import { TimelinePanel } from "./TimelinePanel";
import { StylePanel } from "./StylePanel";
import { NotesPanel } from "./NotesPanel";

type RightTab = "ai" | "memory" | "continuity" | "timeline" | "style" | "notes";

interface RightPanelProps {
  projectId: number;
}

export function RightPanel({ projectId }: RightPanelProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<RightTab>("memory");

  const topTabs: { key: RightTab; label: string; icon: React.ReactNode }[] = [
    { key: "ai",         label: t('editor.ai'),         icon: <Bot className="w-3 h-3" /> },
    { key: "memory",     label: t('editor.memory'),     icon: <Users className="w-3 h-3" /> },
    { key: "continuity", label: t('editor.continuity'), icon: <AlertTriangle className="w-3 h-3" /> },
    { key: "timeline",   label: t('editor.timeline'),   icon: <Clock className="w-3 h-3" /> },
    { key: "style",      label: t('editor.style'),      icon: <Feather className="w-3 h-3" /> },
    { key: "notes",      label: t('editor.notes'),      icon: <StickyNote className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b shrink-0">
        <div className="grid grid-cols-3">
          {topTabs.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors border-b-2 ${
                tab === key
                  ? "text-foreground border-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
              onClick={() => setTab(key)}
              data-testid={`tab-${key}`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {tab === "ai" && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8" data-testid="panel-ai">
            <Bot className="w-10 h-10 text-primary/30 mb-3" />
            <p className="text-sm text-muted-foreground">{t('editor.noAi')}</p>
          </div>
        )}

        {tab === "memory" && <MemoryPanel projectId={projectId} />}

        {tab === "continuity" && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8" data-testid="panel-continuity">
            <AlertTriangle className="w-10 h-10 text-secondary/40 mb-3" />
            <p className="text-sm text-muted-foreground">{t('editor.noContinuity')}</p>
          </div>
        )}

        {tab === "timeline" && <TimelinePanel projectId={projectId} />}

        {tab === "style" && <StylePanel projectId={projectId} />}

        {tab === "notes" && <NotesPanel projectId={projectId} />}
      </div>
    </div>
  );
}
