import { useState } from "react";
import {
  useListTimelineEvents, getListTimelineEventsQueryKey,
  useCreateTimelineEvent, useUpdateTimelineEvent, useDeleteTimelineEvent,
  useListCharacters, getListCharactersQueryKey,
} from "@workspace/api-client-react";
import type { TimelineEvent, CreateTimelineEventBodyEventType } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Calendar } from "lucide-react";

const EVENT_TYPES: CreateTimelineEventBodyEventType[] = ["death", "injury", "travel", "revelation", "conflict", "romance", "political", "worldbuilding", "other"];

const EVENT_TYPE_DOT: Record<string, string> = {
  death: "bg-red-500",
  injury: "bg-orange-400",
  travel: "bg-blue-400",
  revelation: "bg-purple-500",
  conflict: "bg-red-400",
  romance: "bg-pink-400",
  political: "bg-yellow-500",
  worldbuilding: "bg-green-500",
  other: "bg-muted-foreground",
};

interface TimelinePanelProps { projectId: number }

interface EventForm {
  description: string;
  dateLabel: string;
  eventType: CreateTimelineEventBodyEventType;
  orderIndex: number;
  characterId: number | null;
}

export function TimelinePanel({ projectId }: TimelinePanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: events = [] } = useListTimelineEvents(projectId, { query: { queryKey: getListTimelineEventsQueryKey(projectId) } });
  const { data: characters = [] } = useListCharacters(projectId, { query: { queryKey: getListCharactersQueryKey(projectId) } });
  const create = useCreateTimelineEvent();
  const update = useUpdateTimelineEvent();
  const del = useDeleteTimelineEvent();

  const [editing, setEditing] = useState<TimelineEvent | null | "new">(null);
  const [form, setForm] = useState<EventForm>({ description: "", dateLabel: "", eventType: "other", orderIndex: 0, characterId: null });

  const openNew = () => {
    setForm({ description: "", dateLabel: "", eventType: "other", orderIndex: events.length, characterId: null });
    setEditing("new");
  };
  const openEdit = (ev: TimelineEvent) => {
    setForm({
      description: ev.description,
      dateLabel: ev.dateLabel ?? "",
      eventType: ev.eventType as CreateTimelineEventBodyEventType,
      orderIndex: ev.orderIndex,
      characterId: ev.characterId ?? null,
    });
    setEditing(ev);
  };

  const save = () => {
    if (!form.description.trim()) return;
    const payload = {
      description: form.description,
      dateLabel: form.dateLabel || null,
      eventType: form.eventType,
      orderIndex: form.orderIndex,
      characterId: form.characterId,
    };
    if (editing === "new") {
      create.mutate({ projectId, data: payload }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListTimelineEventsQueryKey(projectId) }); setEditing(null); },
        onError: () => toast({ title: t('editor.newEvent'), variant: "destructive" }),
      });
    } else if (editing) {
      update.mutate({ projectId, id: (editing as TimelineEvent).id, data: payload }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListTimelineEventsQueryKey(projectId) }); setEditing(null); },
        onError: () => toast({ title: t('editor.editEvent'), variant: "destructive" }),
      });
    }
  };

  const remove = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    del.mutate({ projectId, id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListTimelineEventsQueryKey(projectId) }),
      onError: () => toast({ title: t('form.delete'), variant: "destructive" }),
    });
  };

  const sorted = [...events].sort((a, b) => a.orderIndex - b.orderIndex);
  const charMap = Object.fromEntries(characters.map(c => [c.id, c.name]));

  return (
    <div data-testid="panel-timeline">
      <div className="flex justify-end mb-3">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openNew} data-testid="button-new-event">
          <Plus className="w-3 h-3" />{t('editor.newEvent')}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">{t('editor.timeline.noEvents')}</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-3 pl-5">
            {sorted.map((ev) => (
              <div key={ev.id} className="relative group" data-testid={`item-event-${ev.id}`}>
                <div className={`absolute -left-[17px] top-2 w-2.5 h-2.5 rounded-full border-2 border-background ${EVENT_TYPE_DOT[ev.eventType] ?? "bg-muted-foreground"}`} />
                <div
                  className="p-2 rounded-md bg-muted/40 text-xs cursor-pointer hover:bg-secondary/15 transition-colors"
                  onClick={() => openEdit(ev)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      {ev.dateLabel && (
                        <p className="text-[10px] text-primary/70 font-mono mb-0.5">{ev.dateLabel}</p>
                      )}
                      <p className="text-foreground">{ev.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-muted-foreground text-[10px] capitalize">
                          {t(`editor.eventType.${ev.eventType}` as Parameters<typeof t>[0])}
                        </p>
                        {ev.characterId && charMap[ev.characterId] && (
                          <p className="text-muted-foreground text-[10px]">· {charMap[ev.characterId]}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => remove(e, ev.id)}
                      data-testid={`button-delete-event-${ev.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing === "new" ? t('editor.newEvent') : t('editor.editEvent')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('editor.timeline.eventType')}</Label>
              <Select value={form.eventType} onValueChange={(v: CreateTimelineEventBodyEventType) => setForm(f => ({ ...f, eventType: v }))}>
                <SelectTrigger className="h-7 text-xs" data-testid="select-event-type"><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(ty => <SelectItem key={ty} value={ty} className="text-xs">{t(`editor.eventType.${ty}` as Parameters<typeof t>[0])}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('editor.timeline.dateLabel')}</Label>
              <Input className="h-7 text-xs" value={form.dateLabel} onChange={(e) => setForm(f => ({ ...f, dateLabel: e.target.value }))} placeholder="e.g. Año 34, Mes 3" data-testid="input-event-date" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('editor.timeline.description')}</Label>
              <Textarea rows={3} className="text-xs resize-none" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-event-description" />
            </div>
            {characters.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">{t('editor.timeline.involvedCharacter')}</Label>
                <Select value={form.characterId?.toString() ?? "none"} onValueChange={(v) => setForm(f => ({ ...f, characterId: v === "none" ? null : Number(v) }))}>
                  <SelectTrigger className="h-7 text-xs" data-testid="select-event-character"><SelectValue placeholder={t('editor.timeline.noCharacter')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">{t('editor.timeline.noCharacter')}</SelectItem>
                    {characters.map(c => <SelectItem key={c.id} value={c.id.toString()} className="text-xs">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">{t('editor.timeline.order')}</Label>
              <Input className="h-7 text-xs" type="number" value={form.orderIndex} onChange={(e) => setForm(f => ({ ...f, orderIndex: Number(e.target.value) }))} data-testid="input-event-order" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('form.cancel')}</Button>
            <Button onClick={save} disabled={!form.description.trim() || create.isPending || update.isPending} data-testid="button-save-event">{t('form.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
