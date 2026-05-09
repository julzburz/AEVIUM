import { useState } from "react";
import {
  useListCharacters, getListCharactersQueryKey, useCreateCharacter, useUpdateCharacter, useDeleteCharacter,
  useListLocations, getListLocationsQueryKey, useCreateLocation, useUpdateLocation, useDeleteLocation,
  useListWorldRules, getListWorldRulesQueryKey, useCreateWorldRule, useUpdateWorldRule, useDeleteWorldRule,
  useListMemoryItems, getListMemoryItemsQueryKey, useCreateMemoryItem, useUpdateMemoryItem, useDeleteMemoryItem,
} from "@workspace/api-client-react";
import type {
  Character, Location, WorldRule, MemoryItem,
  CreateCharacterBodyRole, UpdateMemoryItemBodyType, UpdateMemoryItemBodyScope,
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Map, Globe, BookMarked, Plus, Trash2 } from "lucide-react";

type MemSubTab = "characters" | "locations" | "worldRules" | "items";

const ROLES: CreateCharacterBodyRole[] = ["protagonist", "antagonist", "secondary", "minor"];
const MEM_TYPES: UpdateMemoryItemBodyType[] = ["event", "injury", "secret", "relationship", "death", "promise", "mystery", "location_change", "knowledge", "other"];
const MEM_SCOPES: UpdateMemoryItemBodyScope[] = ["global", "book", "chapter", "scene"];

function CharactersTab({ projectId }: { projectId: number }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: items = [] } = useListCharacters(projectId, { query: { queryKey: getListCharactersQueryKey(projectId) } });
  const create = useCreateCharacter();
  const update = useUpdateCharacter();
  const del = useDeleteCharacter();

  const [editing, setEditing] = useState<Character | null | "new">(null);
  const [form, setForm] = useState({ name: "", role: "secondary" as CreateCharacterBodyRole, physicalDescription: "", personality: "", motivations: "", currentState: "", injuries: "", secrets: "" });

  const openNew = () => { setForm({ name: "", role: "secondary", physicalDescription: "", personality: "", motivations: "", currentState: "", injuries: "", secrets: "" }); setEditing("new"); };
  const openEdit = (c: Character) => { setForm({ name: c.name, role: c.role as CreateCharacterBodyRole, physicalDescription: c.physicalDescription ?? "", personality: c.personality ?? "", motivations: c.motivations ?? "", currentState: c.currentState ?? "", injuries: c.injuries ?? "", secrets: c.secrets ?? "" }); setEditing(c); };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing === "new") {
      create.mutate({ projectId, data: { name: form.name, role: form.role, physicalDescription: form.physicalDescription || null, personality: form.personality || null, motivations: form.motivations || null, currentState: form.currentState || null, injuries: form.injuries || null, secrets: form.secrets || null } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListCharactersQueryKey(projectId) }); setEditing(null); },
        onError: () => toast({ title: t('editor.newCharacter'), variant: "destructive" }),
      });
    } else if (editing) {
      update.mutate({ projectId, id: (editing as Character).id, data: { name: form.name, role: form.role, physicalDescription: form.physicalDescription || null, personality: form.personality || null, motivations: form.motivations || null, currentState: form.currentState || null, injuries: form.injuries || null, secrets: form.secrets || null } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListCharactersQueryKey(projectId) }); setEditing(null); },
        onError: () => toast({ title: t('editor.editCharacter'), variant: "destructive" }),
      });
    }
  };

  const remove = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    del.mutate({ projectId, id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListCharactersQueryKey(projectId) }),
      onError: () => toast({ title: t('form.delete'), variant: "destructive" }),
    });
  };

  const Field = ({ label, field, multiline }: { label: string; field: keyof typeof form; multiline?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea rows={2} className="text-xs resize-none" value={form[field]} onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))} />
      ) : (
        <Input className="h-7 text-xs" value={form[field]} onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openNew} data-testid="button-new-character"><Plus className="w-3 h-3" />{t('editor.newCharacter')}</Button>
      </div>
      {items.length === 0 ? <p className="text-xs text-muted-foreground py-2">{t('editor.noCharacters')}</p> : (
        <div className="space-y-2">
          {items.map((c) => (
            <div
              key={c.id}
              className="p-2 rounded-md bg-muted/40 text-xs group relative cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => openEdit(c)}
              data-testid={`item-character-${c.id}`}
            >
              <div className="flex items-start justify-between gap-1">
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-muted-foreground capitalize">{t(`editor.role.${c.role}` as Parameters<typeof t>[0])}</p>
                  {c.motivations && <p className="text-muted-foreground mt-0.5 line-clamp-1">{c.motivations}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => remove(e, c.id)}
                  data-testid={`button-delete-character-${c.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing === "new" ? t('editor.newCharacter') : t('editor.editCharacter')}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 p-1">
              <div className="space-y-1"><Label className="text-xs">{t('editor.character.name')}</Label><Input className="h-7 text-xs" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-character-name" /></div>
              <div className="space-y-1">
                <Label className="text-xs">{t('editor.character.role')}</Label>
                <Select value={form.role} onValueChange={(v: CreateCharacterBodyRole) => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="h-7 text-xs" data-testid="select-character-role"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{t(`editor.role.${r}` as Parameters<typeof t>[0])}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Field label={t('editor.character.physicalDescription')} field="physicalDescription" multiline />
              <Field label={t('editor.character.personality')} field="personality" multiline />
              <Field label={t('editor.character.motivations')} field="motivations" multiline />
              <Field label={t('editor.character.currentState')} field="currentState" multiline />
              <Field label={t('editor.character.injuries')} field="injuries" multiline />
              <Field label={t('editor.character.secrets')} field="secrets" multiline />
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('form.cancel')}</Button>
            <Button onClick={save} disabled={!form.name.trim() || create.isPending || update.isPending} data-testid="button-save-character">{t('form.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationsTab({ projectId }: { projectId: number }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: items = [] } = useListLocations(projectId, { query: { queryKey: getListLocationsQueryKey(projectId) } });
  const create = useCreateLocation();
  const update = useUpdateLocation();
  const del = useDeleteLocation();

  const [editing, setEditing] = useState<Location | null | "new">(null);
  const [form, setForm] = useState({ name: "", description: "", significance: "" });

  const openNew = () => { setForm({ name: "", description: "", significance: "" }); setEditing("new"); };
  const openEdit = (l: Location) => { setForm({ name: l.name, description: l.description ?? "", significance: l.significance ?? "" }); setEditing(l); };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing === "new") {
      create.mutate({ projectId, data: { name: form.name, description: form.description || null, significance: form.significance || null } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListLocationsQueryKey(projectId) }); setEditing(null); },
        onError: () => toast({ title: t('editor.newLocation'), variant: "destructive" }),
      });
    } else if (editing) {
      update.mutate({ projectId, id: (editing as Location).id, data: { name: form.name, description: form.description || null, significance: form.significance || null } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListLocationsQueryKey(projectId) }); setEditing(null); },
        onError: () => toast({ title: t('editor.editLocation'), variant: "destructive" }),
      });
    }
  };

  const remove = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    del.mutate({ projectId, id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListLocationsQueryKey(projectId) }), onError: () => toast({ title: t('form.delete'), variant: "destructive" }) });
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openNew} data-testid="button-new-location"><Plus className="w-3 h-3" />{t('editor.newLocation')}</Button>
      </div>
      {items.length === 0 ? <p className="text-xs text-muted-foreground py-2">{t('editor.noLocations')}</p> : (
        <div className="space-y-2">
          {items.map((l) => (
            <div
              key={l.id}
              className="p-2 rounded-md bg-muted/40 text-xs group relative cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => openEdit(l)}
              data-testid={`item-location-${l.id}`}
            >
              <div className="flex items-start justify-between gap-1">
                <div><p className="font-medium text-foreground">{l.name}</p>{l.description && <p className="text-muted-foreground line-clamp-2">{l.description}</p>}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => remove(e, l.id)}
                  data-testid={`button-delete-location-${l.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing === "new" ? t('editor.newLocation') : t('editor.editLocation')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">{t('editor.location.name')}</Label><Input className="h-7 text-xs" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-location-name" /></div>
            <div className="space-y-1"><Label className="text-xs">{t('editor.location.description')}</Label><Textarea rows={3} className="text-xs resize-none" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">{t('editor.location.significance')}</Label><Textarea rows={2} className="text-xs resize-none" value={form.significance} onChange={(e) => setForm(f => ({ ...f, significance: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('form.cancel')}</Button>
            <Button onClick={save} disabled={!form.name.trim() || create.isPending || update.isPending} data-testid="button-save-location">{t('form.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorldRulesTab({ projectId }: { projectId: number }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: items = [] } = useListWorldRules(projectId, { query: { queryKey: getListWorldRulesQueryKey(projectId) } });
  const create = useCreateWorldRule();
  const update = useUpdateWorldRule();
  const del = useDeleteWorldRule();

  const [editing, setEditing] = useState<WorldRule | null | "new">(null);
  const [form, setForm] = useState({ title: "", content: "", category: "" });

  const openNew = () => { setForm({ title: "", content: "", category: "" }); setEditing("new"); };
  const openEdit = (r: WorldRule) => { setForm({ title: r.title, content: r.content, category: r.category ?? "" }); setEditing(r); };

  const save = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editing === "new") {
      create.mutate({ projectId, data: { title: form.title, content: form.content, category: form.category || null } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListWorldRulesQueryKey(projectId) }); setEditing(null); },
        onError: () => toast({ title: t('editor.newWorldRule'), variant: "destructive" }),
      });
    } else if (editing) {
      update.mutate({ projectId, id: (editing as WorldRule).id, data: { title: form.title, content: form.content, category: form.category || null } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListWorldRulesQueryKey(projectId) }); setEditing(null); },
        onError: () => toast({ title: t('editor.editWorldRule'), variant: "destructive" }),
      });
    }
  };

  const remove = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    del.mutate({ projectId, id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListWorldRulesQueryKey(projectId) }), onError: () => toast({ title: t('form.delete'), variant: "destructive" }) });
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openNew} data-testid="button-new-world-rule"><Plus className="w-3 h-3" />{t('editor.newWorldRule')}</Button>
      </div>
      {items.length === 0 ? <p className="text-xs text-muted-foreground py-2">{t('editor.noWorldRules')}</p> : (
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="p-2 rounded-md bg-muted/40 text-xs group relative cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => openEdit(r)}
              data-testid={`item-world-rule-${r.id}`}
            >
              <div className="flex items-start justify-between gap-1">
                <div><p className="font-medium text-foreground">{r.title}{r.category && <span className="ml-1 text-muted-foreground">· {r.category}</span>}</p><p className="text-muted-foreground line-clamp-2">{r.content}</p></div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => remove(e, r.id)}
                  data-testid={`button-delete-rule-${r.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing === "new" ? t('editor.newWorldRule') : t('editor.editWorldRule')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">{t('editor.worldRule.title')}</Label><Input className="h-7 text-xs" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">{t('editor.worldRule.category')}</Label><Input className="h-7 text-xs" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">{t('editor.worldRule.content')}</Label><Textarea rows={4} className="text-xs resize-none" value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('form.cancel')}</Button>
            <Button onClick={save} disabled={!form.title.trim() || !form.content.trim() || create.isPending || update.isPending} data-testid="button-save-world-rule">{t('form.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemoryItemsTab({ projectId }: { projectId: number }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: items = [] } = useListMemoryItems(projectId, { query: { queryKey: getListMemoryItemsQueryKey(projectId) } });
  const create = useCreateMemoryItem();
  const update = useUpdateMemoryItem();
  const del = useDeleteMemoryItem();

  const [editing, setEditing] = useState<MemoryItem | null | "new">(null);
  const [form, setForm] = useState({ title: "", content: "", type: "other" as UpdateMemoryItemBodyType, scope: "global" as UpdateMemoryItemBodyScope });

  const openNew = () => { setForm({ title: "", content: "", type: "other", scope: "global" }); setEditing("new"); };
  const openEdit = (m: MemoryItem) => { setForm({ title: m.title, content: m.content, type: m.type as UpdateMemoryItemBodyType, scope: m.scope as UpdateMemoryItemBodyScope }); setEditing(m); };

  const save = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editing === "new") {
      create.mutate({ projectId, data: { title: form.title, content: form.content, type: form.type, scope: form.scope } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListMemoryItemsQueryKey(projectId) }); setEditing(null); },
        onError: () => toast({ title: t('editor.newMemoryItem'), variant: "destructive" }),
      });
    } else if (editing) {
      update.mutate({ projectId, id: (editing as MemoryItem).id, data: { title: form.title, content: form.content, type: form.type, scope: form.scope } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListMemoryItemsQueryKey(projectId) }); setEditing(null); },
        onError: () => toast({ title: t('editor.editMemoryItem'), variant: "destructive" }),
      });
    }
  };

  const remove = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    del.mutate({ projectId, id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListMemoryItemsQueryKey(projectId) }), onError: () => toast({ title: t('form.delete'), variant: "destructive" }) });
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openNew} data-testid="button-new-memory-item"><Plus className="w-3 h-3" />{t('editor.newMemoryItem')}</Button>
      </div>
      {items.length === 0 ? <p className="text-xs text-muted-foreground py-2">{t('editor.noMemory')}</p> : (
        <div className="space-y-2">
          {items.map((m) => (
            <div
              key={m.id}
              className="p-2 rounded-md bg-muted/40 text-xs group relative cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => openEdit(m)}
              data-testid={`item-memory-${m.id}`}
            >
              <div className="flex items-start justify-between gap-1">
                <div>
                  <p className="font-medium text-foreground">{m.title}</p>
                  <p className="text-muted-foreground capitalize text-[10px]">{t(`editor.memoryItem.type.${m.type}` as Parameters<typeof t>[0])} · {t(`editor.memoryItem.scope.${m.scope}` as Parameters<typeof t>[0])}</p>
                  <p className="text-muted-foreground line-clamp-2">{m.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => remove(e, m.id)}
                  data-testid={`button-delete-memory-${m.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing === "new" ? t('editor.newMemoryItem') : t('editor.editMemoryItem')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">{t('editor.memoryItem.title')}</Label><Input className="h-7 text-xs" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t('editor.memoryItem.type')}</Label>
                <Select value={form.type} onValueChange={(v: UpdateMemoryItemBodyType) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{MEM_TYPES.map(ty => <SelectItem key={ty} value={ty} className="text-xs">{t(`editor.memoryItem.type.${ty}` as Parameters<typeof t>[0])}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('editor.memoryItem.scope')}</Label>
                <Select value={form.scope} onValueChange={(v: UpdateMemoryItemBodyScope) => setForm(f => ({ ...f, scope: v }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{MEM_SCOPES.map(sc => <SelectItem key={sc} value={sc} className="text-xs">{t(`editor.memoryItem.scope.${sc}` as Parameters<typeof t>[0])}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">{t('editor.memoryItem.content')}</Label><Textarea rows={4} className="text-xs resize-none" value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('form.cancel')}</Button>
            <Button onClick={save} disabled={!form.title.trim() || !form.content.trim() || create.isPending || update.isPending} data-testid="button-save-memory-item">{t('form.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MemoryPanelProps { projectId: number }

export function MemoryPanel({ projectId }: MemoryPanelProps) {
  const { t } = useI18n();
  const [sub, setSub] = useState<MemSubTab>("characters");

  const tabs: { key: MemSubTab; label: string; icon: React.ReactNode }[] = [
    { key: "characters", label: t('editor.characters'), icon: <Users className="w-3 h-3" /> },
    { key: "locations",  label: t('editor.locations'),  icon: <Map className="w-3 h-3" /> },
    { key: "worldRules", label: t('editor.worldRules'), icon: <Globe className="w-3 h-3" /> },
    { key: "items",      label: t('editor.memoryItems'), icon: <BookMarked className="w-3 h-3" /> },
  ];

  const cls = (active: boolean) => `flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div data-testid="panel-memory">
      <div className="flex flex-wrap gap-1 mb-3">
        {tabs.map(({ key, label, icon }) => (
          <button key={key} className={cls(sub === key)} onClick={() => setSub(key)} data-testid={`subtab-${key}`}>{icon}{label}</button>
        ))}
      </div>
      {sub === "characters" && <CharactersTab projectId={projectId} />}
      {sub === "locations" && <LocationsTab projectId={projectId} />}
      {sub === "worldRules" && <WorldRulesTab projectId={projectId} />}
      {sub === "items" && <MemoryItemsTab projectId={projectId} />}
    </div>
  );
}
