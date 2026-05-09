import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";
import {
  Bot, CheckCircle2, XCircle, Trash2, Plus, Loader2,
  Key, Star, ExternalLink, Sparkles, ChevronRight, Zap, Globe, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AiCredential {
  id: number;
  projectId: number | null;
  provider: string;
  model: string | null;
  isDefault: boolean;
  hasSecret: boolean;
  createdAt: string;
}

interface AiSettingsSectionProps {
  projectId?: number;
}

type ProviderId = "gemini" | "openai" | "anthropic";

interface ProviderDef {
  id: ProviderId;
  name: string;
  shortName: string;
  color: string;
  keyPlaceholder: string;
  docsUrl: string;
  docsLabel: { es: string; en: string };
  models: { value: string; label: string; tier: "free" | "pro"; desc: { es: string; en: string } }[];
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    shortName: "Gemini",
    color: "text-blue-500 bg-blue-500/10",
    keyPlaceholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/apikey",
    docsLabel: { es: "Google AI Studio", en: "Google AI Studio" },
    models: [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tier: "free", desc: { es: "Rápido y eficiente — recomendado", en: "Fast and efficient — recommended" } },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tier: "pro", desc: { es: "Mayor calidad y razonamiento avanzado", en: "Higher quality and advanced reasoning" } },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", tier: "free", desc: { es: "Estable y veloz", en: "Stable and fast" } },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", tier: "free", desc: { es: "Económico para proyectos extensos", en: "Economical for large projects" } },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", tier: "pro", desc: { es: "Alta calidad con contexto muy largo", en: "High quality with very long context" } },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    color: "text-green-500 bg-green-500/10",
    keyPlaceholder: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
    docsLabel: { es: "OpenAI Platform", en: "OpenAI Platform" },
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini", tier: "free", desc: { es: "Rápido y económico — ideal para escritura continua", en: "Fast and affordable — ideal for continuous writing" } },
      { value: "gpt-4o", label: "GPT-4o", tier: "pro", desc: { es: "Modelo insignia con alta calidad creativa", en: "Flagship model with high creative quality" } },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", tier: "pro", desc: { es: "Contexto muy largo para narrativas complejas", en: "Very long context for complex narratives" } },
      { value: "o4-mini", label: "o4-mini", tier: "pro", desc: { es: "Razonamiento eficiente — coherencia narrativa superior", en: "Efficient reasoning — superior narrative coherence" } },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    shortName: "Claude",
    color: "text-orange-500 bg-orange-500/10",
    keyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
    docsLabel: { es: "Anthropic Console", en: "Anthropic Console" },
    models: [
      { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", tier: "free", desc: { es: "El más rápido de Claude — asistencia en tiempo real", en: "Fastest Claude — real-time assistance" } },
      { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", tier: "pro", desc: { es: "Equilibrio perfecto entre calidad y velocidad", en: "Perfect balance between quality and speed" } },
      { value: "claude-opus-4-5", label: "Claude Opus 4.5", tier: "pro", desc: { es: "Máxima calidad de escritura creativa", en: "Maximum creative writing quality" } },
      { value: "claude-3-opus-latest", label: "Claude 3 Opus", tier: "pro", desc: { es: "Potente para narrativas complejas y worldbuilding", en: "Powerful for complex narratives and worldbuilding" } },
    ],
  },
];

export function AiSettingsSection({ projectId }: AiSettingsSectionProps) {
  const { lang } = useI18n();
  const isEs = lang === "es";
  const { toast } = useToast();

  // Credentials: project-specific (if projectId) and global
  const [projectCreds, setProjectCreds] = useState<AiCredential[]>([]);
  const [globalCreds, setGlobalCreds] = useState<AiCredential[]>([]);
  const [loading, setLoading] = useState(false);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addScope, setAddScope] = useState<"project" | "global">("global");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("gemini");
  const [newKey, setNewKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [testingBuiltin, setTestingBuiltin] = useState(false);
  const [builtinOk, setBuiltinOk] = useState<boolean | null>(null);

  const isProjectMode = projectId !== undefined;
  const providerDef = PROVIDERS.find((p) => p.id === selectedProvider)!;
  const modelInfo = providerDef.models.find((m) => m.value === selectedModel);

  const activeProjectCred = projectCreds.find((c) => c.isDefault);
  const activeGlobalCred = globalCreds.find((c) => c.isDefault);
  const effectiveCred = activeProjectCred ?? activeGlobalCred ?? null;
  const effectiveScope = activeProjectCred ? "project" : activeGlobalCred ? "global" : "builtin";

  useEffect(() => {
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    setSelectedModel(providerDef.models[0].value);
  }, [selectedProvider, providerDef]);

  async function loadAll() {
    setLoading(true);
    try {
      const [proj, glob] = await Promise.all([
        isProjectMode
          ? customFetch<AiCredential[]>(`/api/projects/${projectId}/ai-credentials`).catch(() => [] as AiCredential[])
          : Promise.resolve([] as AiCredential[]),
        customFetch<AiCredential[]>(`/api/ai-credentials`).catch(() => [] as AiCredential[]),
      ]);
      setProjectCreds(proj);
      setGlobalCreds(glob);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    const isGlobal = addScope === "global";
    if (!newKey.trim()) return;
    if (isProjectMode && !isGlobal && !projectId) return;

    setSaving(true);
    try {
      const url = isGlobal
        ? `/api/ai-credentials`
        : `/api/projects/${projectId}/ai-credentials`;

      const cred = await customFetch<AiCredential>(url, {
        method: "POST",
        body: JSON.stringify({ provider: selectedProvider, secret: newKey.trim(), model: selectedModel, isDefault: true }),
      });

      if (isGlobal) {
        setGlobalCreds((prev) => prev.map((c) => ({ ...c, isDefault: false })).concat(cred));
      } else {
        setProjectCreds((prev) => prev.map((c) => ({ ...c, isDefault: false })).concat(cred));
      }
      setNewKey("");
      setShowAddForm(false);
      toast({ title: isEs ? "Clave guardada y activada" : "Key saved and activated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cred: AiCredential) {
    setDeletingId(cred.id);
    try {
      const url = cred.projectId
        ? `/api/projects/${cred.projectId}/ai-credentials/${cred.id}`
        : `/api/ai-credentials/${cred.id}`;
      await customFetch(url, { method: "DELETE" });
      if (cred.projectId) {
        setProjectCreds((prev) => prev.filter((c) => c.id !== cred.id));
      } else {
        setGlobalCreds((prev) => prev.filter((c) => c.id !== cred.id));
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(cred: AiCredential) {
    try {
      const url = cred.projectId
        ? `/api/projects/${cred.projectId}/ai-credentials/${cred.id}`
        : `/api/ai-credentials/${cred.id}`;
      await customFetch(url, { method: "PATCH", body: JSON.stringify({ isDefault: true }) });
      await loadAll();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    }
  }

  async function handleTest(cred: AiCredential) {
    try {
      const url = cred.projectId
        ? `/api/projects/${cred.projectId}/ai-credentials/test`
        : `/api/ai-credentials/test`;
      const resp = await customFetch<{ ok: boolean; message: string }>(url, {
        method: "POST",
        body: JSON.stringify({ provider: cred.provider, credentialId: cred.id }),
      });
      toast({ title: resp.ok ? (isEs ? "Conexión exitosa" : "Connection OK") : (isEs ? "Error de conexión" : "Connection failed"), description: resp.message, variant: resp.ok ? "default" : "destructive" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    }
  }

  async function handleTestBuiltin() {
    setTestingBuiltin(true);
    setBuiltinOk(null);
    try {
      const resp = await customFetch<{ ok: boolean; message: string }>(`/api/ai/test-builtin`, { method: "POST" });
      setBuiltinOk(resp.ok);
      toast({ title: resp.ok ? (isEs ? "Conexión exitosa" : "Connection OK") : (isEs ? "Error de conexión" : "Connection failed"), variant: resp.ok ? "default" : "destructive" });
    } catch {
      setBuiltinOk(false);
    } finally {
      setTestingBuiltin(false);
    }
  }

  function getModelLabel(cred: AiCredential) {
    const p = PROVIDERS.find((pp) => pp.id === cred.provider);
    return p?.models.find((m) => m.value === cred.model)?.label ?? cred.model ?? "—";
  }

  function getProviderDef(cred: AiCredential) {
    return PROVIDERS.find((p) => p.id === cred.provider);
  }

  // ── Effective provider card ──────────────────────────────────────────────
  function EffectiveCard() {
    if (loading) return (
      <div className="border rounded-xl p-5 flex items-center justify-center h-20">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );

    if (effectiveScope === "builtin") return (
      <div className="border rounded-xl p-4 bg-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{isEs ? "AEVIUM integrado (Gemini)" : "AEVIUM built-in (Gemini)"}</p>
            <div className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-[9px] font-medium border border-green-500/20 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" />{isEs ? "Gratis" : "Free"}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">gemini-2.5-flash · {isEs ? "Sin clave necesaria" : "No key required"}</p>
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground shrink-0" onClick={handleTestBuiltin} disabled={testingBuiltin}>
          {testingBuiltin ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> :
            builtinOk === true ? <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> :
            builtinOk === false ? <XCircle className="w-3 h-3 mr-1 text-destructive" /> :
            <CheckCircle2 className="w-3 h-3 mr-1" />}
          Test
        </Button>
      </div>
    );

    const pDef = getProviderDef(effectiveCred!);
    return (
      <div className="border border-primary/30 rounded-xl p-4 bg-primary/5 flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", pDef?.color ?? "bg-muted text-muted-foreground")}>
          <Key className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{pDef?.name ?? effectiveCred!.provider}</p>
            {effectiveScope === "global" && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 gap-0.5">
                <Globe className="w-2 h-2" />{isEs ? "Global" : "Global"}
              </Badge>
            )}
            {effectiveScope === "project" && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 gap-0.5 bg-primary/15 text-primary border-primary/20">
                <Lock className="w-2 h-2" />{isEs ? "Este proyecto" : "This project"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{getModelLabel(effectiveCred!)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleTest(effectiveCred!)}>
            <CheckCircle2 className="w-3 h-3" />Test
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
            onClick={() => handleDelete(effectiveCred!)} disabled={deletingId === effectiveCred!.id}>
            {deletingId === effectiveCred!.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    );
  }

  // ── Inactive credentials list ────────────────────────────────────────────
  const inactiveCreds = [
    ...projectCreds.filter((c) => !c.isDefault),
    ...globalCreds.filter((c) => !c.isDefault),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">{isEs ? "Inteligencia Artificial" : "Artificial Intelligence"}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isProjectMode
            ? isEs ? "Proveedor de IA para este proyecto. Sobreescribe tu clave global si configuras una aquí." : "AI provider for this project. Overrides your global key if you set one here."
            : isEs ? "Tu clave por defecto para todos los proyectos. Configúrala una sola vez." : "Your default key for all projects. Set it once, use everywhere."}
        </p>
      </div>

      {/* Trust note */}
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 border border-dashed rounded-lg px-3 py-2.5">
        <Lock className="w-3 h-3 shrink-0 mt-0.5" />
        <span>{isEs ? "Tu clave se guarda cifrada con AES-256 en nuestros servidores. Nunca la compartimos ni la usamos fuera de tus peticiones." : "Your key is stored AES-256 encrypted on our servers. We never share it or use it outside your requests."}</span>
      </div>

      {/* Active provider */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {isEs ? "Proveedor activo" : "Active provider"}
        </p>
        <EffectiveCard />
      </div>

      {/* Inactive keys */}
      {!loading && inactiveCreds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isEs ? "Otras claves guardadas" : "Other saved keys"}
          </p>
          <div className="space-y-1.5">
            {inactiveCreds.map((cred) => {
              const pDef = getProviderDef(cred);
              return (
                <div key={cred.id} className="border rounded-lg px-3 py-2.5 flex items-center gap-3 bg-card hover:bg-muted/30 transition-colors">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold", pDef?.color ?? "bg-muted text-muted-foreground")}>
                    {(pDef?.shortName ?? cred.provider)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium">{pDef?.name ?? cred.provider}</p>
                      {!cred.projectId && (
                        <span className="text-[9px] text-muted-foreground border rounded px-1">{isEs ? "global" : "global"}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{getModelLabel(cred)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => handleSetDefault(cred)}>
                      <ChevronRight className="w-3 h-3 mr-0.5" />{isEs ? "Activar" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive/50 hover:text-destructive"
                      onClick={() => handleDelete(cred)} disabled={deletingId === cred.id}>
                      {deletingId === cred.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="space-y-3">
        {!showAddForm ? (
          <Button variant="outline" className="w-full gap-2 h-9 border-dashed text-muted-foreground hover:text-foreground"
            onClick={() => { setShowAddForm(true); setAddScope(isProjectMode ? "project" : "global"); }}>
            <Plus className="w-4 h-4" />
            {isEs ? "Conectar proveedor" : "Connect provider"}
          </Button>
        ) : (
          <div className="border rounded-xl p-5 bg-card space-y-5">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary/70" />
              {isEs ? "Conectar proveedor" : "Connect provider"}
            </p>

            {/* Scope selector — only shown in project mode */}
            {isProjectMode && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {isEs ? "Guardar como" : "Save as"}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "project" as const, icon: <Lock className="w-3.5 h-3.5" />, labelEs: "Solo este proyecto", labelEn: "This project only" },
                    { value: "global" as const, icon: <Globe className="w-3.5 h-3.5" />, labelEs: "Clave global", labelEn: "Global key" },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setAddScope(opt.value)}
                      className={cn("border rounded-lg py-2 px-3 text-left transition-all flex items-center gap-2 text-xs",
                        addScope === opt.value ? "border-primary bg-primary/8 ring-1 ring-primary/30 text-primary" : "hover:bg-muted/40 text-muted-foreground")}>
                      {opt.icon}
                      {isEs ? opt.labelEs : opt.labelEn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Provider */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isEs ? "1. Proveedor" : "1. Provider"}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {PROVIDERS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setSelectedProvider(p.id)}
                    className={cn("border rounded-lg py-3 px-2 text-center transition-all",
                      selectedProvider === p.id ? "border-primary bg-primary/8 ring-1 ring-primary/30" : "hover:bg-muted/40")}>
                    <p className={cn("text-xs font-semibold leading-tight", selectedProvider === p.id ? "text-primary" : "")}>{p.shortName}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {isEs ? "2. Clave API" : "2. API Key"}
                </Label>
                <a href={providerDef.docsUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                  <ExternalLink className="w-2.5 h-2.5" />
                  {isEs ? providerDef.docsLabel.es : providerDef.docsLabel.en}
                </a>
              </div>
              <Input type="password" value={newKey} onChange={(e) => setNewKey(e.target.value)}
                placeholder={providerDef.keyPlaceholder} className="h-9 text-xs font-mono" autoComplete="off" />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isEs ? "3. Modelo" : "3. Model"}
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {providerDef.models.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span>{m.label}</span>
                        <Badge variant={m.tier === "free" ? "secondary" : "outline"}
                          className={cn("text-[9px] h-3.5 px-1", m.tier === "pro" ? "border-amber-500/50 text-amber-600 dark:text-amber-400" : "")}>
                          {m.tier === "free" ? (isEs ? "Gratis" : "Free") : "Pro"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modelInfo && <p className="text-[11px] text-muted-foreground">{isEs ? modelInfo.desc.es : modelInfo.desc.en}</p>}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 h-9" onClick={handleAdd} disabled={!newKey.trim() || saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Key className="w-3.5 h-3.5 mr-2" />}
                {saving ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Guardar y activar" : "Save & activate")}
              </Button>
              <Button variant="outline" className="h-9 px-4" onClick={() => { setShowAddForm(false); setNewKey(""); }}>
                {isEs ? "Cancelar" : "Cancel"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
