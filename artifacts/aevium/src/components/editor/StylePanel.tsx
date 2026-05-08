import { useState, useEffect, useRef, useCallback } from "react";
import {
  useGetStyleGuide, getGetStyleGuideQueryKey, useUpsertStyleGuide,
} from "@workspace/api-client-react";
import type { UpsertStyleGuideBodyNarrator, UpsertStyleGuideBodyTense, UpsertStyleGuideBodyPovType, UpsertStyleGuideBodyPacing } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Feather, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StylePanelProps { projectId: number }

type FormState = {
  narrator: UpsertStyleGuideBodyNarrator;
  tense: UpsertStyleGuideBodyTense;
  povType: UpsertStyleGuideBodyPovType;
  pacing: UpsertStyleGuideBodyPacing;
  tone: string;
  sensorDetailLevel: string;
  violenceLevel: string;
  introspectionLevel: string;
  forbiddenWords: string;
  frequentWords: string;
  dialogueRules: string;
  povRules: string;
};

const NARRATORS: NonNullable<UpsertStyleGuideBodyNarrator>[] = ["first_person", "third_limited", "third_omniscient", "second_person"];
const TENSES: NonNullable<UpsertStyleGuideBodyTense>[] = ["past", "present"];
const POV_TYPES: NonNullable<UpsertStyleGuideBodyPovType>[] = ["single", "multiple"];
const PACINGS: NonNullable<UpsertStyleGuideBodyPacing>[] = ["slow", "medium", "fast"];

export function StylePanel({ projectId }: StylePanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: guide, isLoading } = useGetStyleGuide(projectId, {
    query: { queryKey: getGetStyleGuideQueryKey(projectId) }
  });
  const upsert = useUpsertStyleGuide();
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState<FormState>({
    narrator: null, tense: null, povType: null, pacing: null,
    tone: "", sensorDetailLevel: "", violenceLevel: "", introspectionLevel: "",
    forbiddenWords: "", frequentWords: "", dialogueRules: "", povRules: "",
  });

  useEffect(() => {
    if (!guide) return;
    setForm({
      narrator: guide.narrator ?? null,
      tense: guide.tense ?? null,
      povType: guide.povType ?? null,
      pacing: guide.pacing ?? null,
      tone: guide.tone ?? "",
      sensorDetailLevel: guide.sensorDetailLevel ?? "",
      violenceLevel: guide.violenceLevel ?? "",
      introspectionLevel: guide.introspectionLevel ?? "",
      forbiddenWords: guide.forbiddenWords ?? "",
      frequentWords: guide.frequentWords ?? "",
      dialogueRules: guide.dialogueRules ?? "",
      povRules: guide.povRules ?? "",
    });
    setDirty(false);
  }, [guide]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const save = useCallback(() => {
    upsert.mutate({ projectId, data: { ...form } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetStyleGuideQueryKey(projectId) });
        setDirty(false);
        toast({ title: t('editor.saved') });
      },
      onError: () => toast({ title: t('editor.style'), variant: "destructive" }),
    });
  }, [form, projectId, upsert, qc, t, toast]);

  const scheduleAutoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), 2000);
  }, [save]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    set(k, v);
    scheduleAutoSave();
  };

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;
  }

  const SelectField = ({ label, field, options, labelPrefix }: { label: string; field: keyof FormState; options: string[]; labelPrefix: string }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select
        value={(form[field] as string | null) ?? "none"}
        onValueChange={(v) => setField(field, (v === "none" ? null : v) as FormState[typeof field])}
      >
        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs text-muted-foreground">—</SelectItem>
          {options.map(o => <SelectItem key={o} value={o} className="text-xs">{t(`${labelPrefix}.${o}` as Parameters<typeof t>[0])}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const TextField = ({ label, field, multiline }: { label: string; field: keyof FormState; multiline?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea rows={2} className="text-xs resize-none" value={(form[field] as string) ?? ""} onChange={(e) => setField(field, e.target.value as FormState[typeof field])} />
      ) : (
        <Input className="h-7 text-xs" value={(form[field] as string) ?? ""} onChange={(e) => setField(field, e.target.value as FormState[typeof field])} />
      )}
    </div>
  );

  return (
    <div data-testid="panel-style">
      {!guide && (
        <div className="flex flex-col items-center justify-center py-4 text-center mb-3">
          <Feather className="w-6 h-6 text-muted-foreground/30 mb-1" />
          <p className="text-xs text-muted-foreground">{t('editor.noStyle')}</p>
        </div>
      )}
      <div className="space-y-3">
        <SelectField label={t('editor.style.narrator')} field="narrator" options={NARRATORS} labelPrefix="editor.style.narrator" />
        <SelectField label={t('editor.style.tense')} field="tense" options={TENSES} labelPrefix="editor.style.tense" />
        <SelectField label={t('editor.style.povType')} field="povType" options={POV_TYPES} labelPrefix="editor.style.pov" />
        <SelectField label={t('editor.style.pacing')} field="pacing" options={PACINGS} labelPrefix="editor.style.pacing" />
        <TextField label={t('editor.style.tone')} field="tone" />
        <TextField label={t('editor.style.sensorDetail')} field="sensorDetailLevel" />
        <TextField label={t('editor.style.violence')} field="violenceLevel" />
        <TextField label={t('editor.style.introspection')} field="introspectionLevel" />
        <TextField label={t('editor.style.forbiddenWords')} field="forbiddenWords" multiline />
        <TextField label={t('editor.style.frequentWords')} field="frequentWords" multiline />
        <TextField label={t('editor.style.dialogueRules')} field="dialogueRules" multiline />
        <TextField label={t('editor.style.povRules')} field="povRules" multiline />
        <Button size="sm" className="w-full gap-2" onClick={save} disabled={!dirty || upsert.isPending} data-testid="button-save-style">
          <Save className="w-3.5 h-3.5" />{t('form.save')}
        </Button>
      </div>
    </div>
  );
}
