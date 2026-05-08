import { useState } from "react";
import {
  useListCharacters, getListCharactersQueryKey,
  useListLocations, getListLocationsQueryKey,
  useListWorldRules, getListWorldRulesQueryKey,
  useListMemoryItems, getListMemoryItemsQueryKey,
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Bot, Users, Map, Globe, BookMarked, AlertTriangle } from "lucide-react";

type RightTab = "ai" | "memory" | "continuity";
type MemorySubTab = "characters" | "locations" | "worldRules" | "items";

interface RightPanelProps {
  projectId: number;
}

export function RightPanel({ projectId }: RightPanelProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<RightTab>("ai");
  const [memSubTab, setMemSubTab] = useState<MemorySubTab>("characters");

  const { data: characters = [] } = useListCharacters(projectId, {
    query: { queryKey: getListCharactersQueryKey(projectId) }
  });
  const { data: locations = [] } = useListLocations(projectId, {
    query: { queryKey: getListLocationsQueryKey(projectId) }
  });
  const { data: worldRules = [] } = useListWorldRules(projectId, {
    query: { queryKey: getListWorldRulesQueryKey(projectId) }
  });
  const { data: memoryItems = [] } = useListMemoryItems(projectId, {
    query: { queryKey: getListMemoryItemsQueryKey(projectId) }
  });

  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-xs font-medium transition-colors ${
      active
        ? "text-foreground border-b-2 border-primary"
        : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
    }`;

  const subTabClass = (active: boolean) =>
    `px-2 py-1 text-xs rounded transition-colors ${
      active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b shrink-0">
        <div className="flex">
          <button
            className={tabClass(tab === "ai")}
            onClick={() => setTab("ai")}
            data-testid="tab-ai"
          >
            {t('editor.ai')}
          </button>
          <button
            className={tabClass(tab === "memory")}
            onClick={() => setTab("memory")}
            data-testid="tab-memory"
          >
            {t('editor.memory')}
          </button>
          <button
            className={tabClass(tab === "continuity")}
            onClick={() => setTab("continuity")}
            data-testid="tab-continuity"
          >
            {t('editor.continuity')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {tab === "ai" && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8" data-testid="panel-ai">
            <Bot className="w-10 h-10 text-primary/30 mb-3" />
            <p className="text-sm text-muted-foreground">{t('editor.noAi')}</p>
          </div>
        )}

        {tab === "memory" && (
          <div data-testid="panel-memory">
            <div className="flex gap-1 mb-3 flex-wrap">
              <button className={subTabClass(memSubTab === "characters")} onClick={() => setMemSubTab("characters")} data-testid="subtab-characters">
                <Users className="w-3 h-3 inline mr-1" />{t('editor.characters')}
              </button>
              <button className={subTabClass(memSubTab === "locations")} onClick={() => setMemSubTab("locations")} data-testid="subtab-locations">
                <Map className="w-3 h-3 inline mr-1" />{t('editor.locations')}
              </button>
              <button className={subTabClass(memSubTab === "worldRules")} onClick={() => setMemSubTab("worldRules")} data-testid="subtab-world-rules">
                <Globe className="w-3 h-3 inline mr-1" />{t('editor.worldRules')}
              </button>
              <button className={subTabClass(memSubTab === "items")} onClick={() => setMemSubTab("items")} data-testid="subtab-memory-items">
                <BookMarked className="w-3 h-3 inline mr-1" />Items
              </button>
            </div>

            {memSubTab === "characters" && (
              characters.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">{t('editor.noCharacters')}</p>
              ) : (
                <ul className="space-y-2">
                  {characters.map((c) => (
                    <li key={c.id} className="p-2 rounded-md bg-muted/40 text-xs" data-testid={`item-character-${c.id}`}>
                      <p className="font-medium text-foreground">{c.name}</p>
                      {c.role && <p className="text-muted-foreground capitalize">{c.role}</p>}
                    </li>
                  ))}
                </ul>
              )
            )}

            {memSubTab === "locations" && (
              locations.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">{t('editor.noLocations')}</p>
              ) : (
                <ul className="space-y-2">
                  {locations.map((l) => (
                    <li key={l.id} className="p-2 rounded-md bg-muted/40 text-xs" data-testid={`item-location-${l.id}`}>
                      <p className="font-medium text-foreground">{l.name}</p>
                      {l.description && <p className="text-muted-foreground line-clamp-2">{l.description}</p>}
                    </li>
                  ))}
                </ul>
              )
            )}

            {memSubTab === "worldRules" && (
              worldRules.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">{t('editor.noWorldRules')}</p>
              ) : (
                <ul className="space-y-2">
                  {worldRules.map((r) => (
                    <li key={r.id} className="p-2 rounded-md bg-muted/40 text-xs" data-testid={`item-world-rule-${r.id}`}>
                      <p className="font-medium text-foreground">{r.title}</p>
                      {r.content && <p className="text-muted-foreground line-clamp-2">{r.content}</p>}
                    </li>
                  ))}
                </ul>
              )
            )}

            {memSubTab === "items" && (
              memoryItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">{t('editor.noMemory')}</p>
              ) : (
                <ul className="space-y-2">
                  {memoryItems.map((m) => (
                    <li key={m.id} className="p-2 rounded-md bg-muted/40 text-xs" data-testid={`item-memory-${m.id}`}>
                      <p className="font-medium text-foreground">{m.title}</p>
                      {m.content && <p className="text-muted-foreground line-clamp-2">{m.content}</p>}
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}

        {tab === "continuity" && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8" data-testid="panel-continuity">
            <AlertTriangle className="w-10 h-10 text-secondary/40 mb-3" />
            <p className="text-sm text-muted-foreground">{t('editor.noContinuity')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
