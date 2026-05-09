import { useState, useEffect, useRef, useCallback } from "react";
import {
  useGetStyleGuide, getGetStyleGuideQueryKey, useUpsertStyleGuide,
} from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import type { UpsertStyleGuideBodyNarrator, UpsertStyleGuideBodyTense, UpsertStyleGuideBodyPovType, UpsertStyleGuideBodyPacing } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Feather, Save, Send, Check, SlidersHorizontal } from "lucide-react";

interface StylePanelProps { projectId: number; analyzeText?: string | null; onAnalyzeConsumed?: () => void }

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

type ChatMessage = { role: "user" | "assistant"; content: string };

interface DetectedParams {
  narrator?: string | null;
  tense?: string | null;
  povType?: string | null;
  pacing?: string | null;
  tone?: string | null;
  sensorDetailLevel?: string | null;
  violenceLevel?: string | null;
  introspectionLevel?: string | null;
  forbiddenWords?: string | null;
  frequentWords?: string | null;
  dialogueRules?: string | null;
  povRules?: string | null;
}

function paramsToForm(p: DetectedParams): FormState {
  const validNarrator = (v: string | null | undefined): UpsertStyleGuideBodyNarrator =>
    NARRATORS.includes(v as NonNullable<UpsertStyleGuideBodyNarrator>) ? v as NonNullable<UpsertStyleGuideBodyNarrator> : null;
  const validTense = (v: string | null | undefined): UpsertStyleGuideBodyTense =>
    TENSES.includes(v as NonNullable<UpsertStyleGuideBodyTense>) ? v as NonNullable<UpsertStyleGuideBodyTense> : null;
  const validPov = (v: string | null | undefined): UpsertStyleGuideBodyPovType =>
    POV_TYPES.includes(v as NonNullable<UpsertStyleGuideBodyPovType>) ? v as NonNullable<UpsertStyleGuideBodyPovType> : null;
  const validPacing = (v: string | null | undefined): UpsertStyleGuideBodyPacing =>
    PACINGS.includes(v as NonNullable<UpsertStyleGuideBodyPacing>) ? v as NonNullable<UpsertStyleGuideBodyPacing> : null;

  return {
    narrator: validNarrator(p.narrator),
    tense: validTense(p.tense),
    povType: validPov(p.povType),
    pacing: validPacing(p.pacing),
    tone: p.tone ?? "",
    sensorDetailLevel: p.sensorDetailLevel ?? "",
    violenceLevel: p.violenceLevel ?? "",
    introspectionLevel: p.introspectionLevel ?? "",
    forbiddenWords: p.forbiddenWords ?? "",
    frequentWords: p.frequentWords ?? "",
    dialogueRules: p.dialogueRules ?? "",
    povRules: p.povRules ?? "",
  };
}

export function StylePanel({ projectId, analyzeText, onAnalyzeConsumed }: StylePanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: guide, isLoading } = useGetStyleGuide(projectId, {
    query: { queryKey: getGetStyleGuideQueryKey(projectId) }
  });
  const upsert = useUpsertStyleGuide();

  const [mode, setMode] = useState<"chat" | "advanced">("chat");
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

  const save = useCallback((overrideForm?: FormState) => {
    const data = overrideForm ?? form;
    upsert.mutate({ projectId, data }, {
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

  return (
    <div data-testid="panel-style" className="flex flex-col h-full">
      {mode === "chat" ? (
        <StyleChatView
          projectId={projectId}
          analyzeText={analyzeText}
          onAnalyzeConsumed={onAnalyzeConsumed}
          onApply={(params) => {
            const newForm = paramsToForm(params);
            setForm(newForm);
            save(newForm);
          }}
          onAdvanced={() => setMode("advanced")}
        />
      ) : (
        <StyleAdvancedView
          form={form}
          dirty={dirty}
          saving={upsert.isPending}
          onSetField={setField}
          onSave={() => save()}
          onBack={() => setMode("chat")}
          t={t}
        />
      )}
    </div>
  );
}

function StyleChatView({
  projectId,
  analyzeText,
  onAnalyzeConsumed,
  onApply,
  onAdvanced,
}: {
  projectId: number;
  analyzeText?: string | null;
  onAnalyzeConsumed?: () => void;
  onApply: (params: DetectedParams) => void;
  onAdvanced: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: t('editor.style.chat.greeting') },
    { role: "assistant", content: t('editor.style.chat.firstQuestion') },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedParams, setDetectedParams] = useState<DetectedParams | null>(null);
  const [applied, setApplied] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, detectedParams]);

  useEffect(() => {
    if (analyzeText && analyzeText.length > 50) {
      handleAnalyze(analyzeText);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzeText]);

  const handleAnalyze = async (text: string) => {
    setAnalyzing(true);
    try {
      const resp = await customFetch<{ summary: string; params: DetectedParams }>(
        `/api/projects/${projectId}/style-guide/analyze`,
        { method: "POST", body: JSON.stringify({ text }) }
      );
      setDetectedParams(resp.params);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `${t('editor.style.chat.analyzeSuccess')}: ${resp.summary}` },
      ]);
      onAnalyzeConsumed?.();
    } catch {
      toast({ title: t('editor.style.chat.analyzeError'), variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = newMessages.filter(m => m.role === "user" || (m.role === "assistant" && newMessages.indexOf(m) > 1));
      const resp = await customFetch<{ reply: string; done: boolean; params?: DetectedParams }>(
        `/api/projects/${projectId}/style-guide/chat`,
        { method: "POST", body: JSON.stringify({ messages: apiMessages }) }
      );
      setMessages(prev => [...prev, { role: "assistant", content: resp.reply }]);
      if (resp.done && resp.params) {
        setDetectedParams(resp.params);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, hubo un error. Intenta de nuevo." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleApply = () => {
    if (!detectedParams) return;
    onApply(detectedParams);
    setApplied(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0 pr-1">
        <div className="space-y-3 pb-2">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {(loading || analyzing) && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {detectedParams && !applied && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-primary">{t('editor.style.chat.detected')}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {detectedParams.narrator && <ParamBadge label={t('editor.style.narrator')} value={detectedParams.narrator} />}
                {detectedParams.tense && <ParamBadge label={t('editor.style.tense')} value={detectedParams.tense} />}
                {detectedParams.pacing && <ParamBadge label={t('editor.style.pacing')} value={detectedParams.pacing} />}
                {detectedParams.tone && <ParamBadge label={t('editor.style.tone')} value={detectedParams.tone} />}
              </div>
              <Button size="sm" className="w-full h-7 text-xs gap-1.5 mt-1" onClick={handleApply}>
                <Check className="w-3 h-3" />{t('editor.style.chat.apply')}
              </Button>
            </div>
          )}

          {applied && (
            <div className="rounded-lg bg-muted/60 p-2 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Check className="w-3 h-3 text-primary" />{t('editor.style.chat.applied')}
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {!detectedParams && (
        <div className="mt-2 flex gap-1.5 shrink-0">
          <Input
            ref={inputRef}
            className="h-7 text-xs flex-1"
            placeholder={t('editor.style.chat.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={loading}
            data-testid="input-style-chat"
          />
          <Button
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            data-testid="button-style-chat-send"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      )}

      <div className="mt-2 flex justify-between items-center shrink-0">
        <button
          className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          onClick={onAdvanced}
          data-testid="button-style-advanced"
        >
          <span className="flex items-center gap-1"><SlidersHorizontal className="w-2.5 h-2.5" />{t('editor.style.chat.advanced')}</span>
        </button>
      </div>
    </div>
  );
}

function ParamBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-[10px] font-medium text-foreground truncate">{value}</span>
    </div>
  );
}

function StyleAdvancedView({
  form,
  dirty,
  saving,
  onSetField,
  onSave,
  onBack,
  t,
}: {
  form: FormState;
  dirty: boolean;
  saving: boolean;
  onSetField: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onSave: () => void;
  onBack: () => void;
  t: (key: Parameters<ReturnType<typeof useI18n>['t']>[0]) => string;
}) {
  const SelectField = ({ label, field, options, labelPrefix }: { label: string; field: keyof FormState; options: string[]; labelPrefix: string }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select
        value={(form[field] as string | null) ?? "none"}
        onValueChange={(v) => onSetField(field, (v === "none" ? null : v) as FormState[typeof field])}
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
        <Textarea rows={2} className="text-xs resize-none" value={(form[field] as string) ?? ""} onChange={(e) => onSetField(field, e.target.value as FormState[typeof field])} />
      ) : (
        <Input className="h-7 text-xs" value={(form[field] as string) ?? ""} onChange={(e) => onSetField(field, e.target.value as FormState[typeof field])} />
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <button
        className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        onClick={onBack}
        data-testid="button-style-back-chat"
      >
        {t('editor.style.chat.backToChat')}
      </button>
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
      <Button size="sm" className="w-full gap-2" onClick={onSave} disabled={!dirty || saving} data-testid="button-save-style">
        <Save className="w-3.5 h-3.5" />{t('form.save')}
      </Button>
    </div>
  );
}
