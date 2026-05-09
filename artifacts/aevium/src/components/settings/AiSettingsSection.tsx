import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";
import {
  Bot, CheckCircle2, XCircle, Trash2, Plus, Loader2,
  Zap, Key, Star, ExternalLink, Sparkles, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface AiCredential {
  id: number;
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
  keyLabel: { es: string; en: string };
  keyPlaceholder: string;
  docsUrl: string;
  docsLabel: { es: string; en: string };
  models: { value: string; label: string; tier: "free" | "pro"; desc: { es: string; en: string } }[];
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    keyLabel: { es: "Clave API de Gemini", en: "Gemini API Key" },
    keyPlaceholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/apikey",
    docsLabel: { es: "Obtener clave en Google AI Studio", en: "Get key from Google AI Studio" },
    models: [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tier: "free", desc: { es: "Rápido y eficiente — recomendado para uso general", en: "Fast and efficient — recommended for general use" } },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tier: "pro", desc: { es: "Mayor calidad, razonamiento avanzado — requiere cuenta Pro", en: "Higher quality, advanced reasoning — requires Pro account" } },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", tier: "free", desc: { es: "Estable y veloz, gran relación calidad-precio", en: "Stable and fast, great value" } },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", tier: "free", desc: { es: "Económico, ideal para proyectos con muchos textos", en: "Economical, ideal for high-volume projects" } },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", tier: "pro", desc: { es: "Alta calidad con contexto muy largo — requiere cuenta Pro", en: "High quality with very long context — requires Pro account" } },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    keyLabel: { es: "Clave API de OpenAI", en: "OpenAI API Key" },
    keyPlaceholder: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
    docsLabel: { es: "Obtener clave en OpenAI Platform", en: "Get key from OpenAI Platform" },
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini", tier: "free", desc: { es: "Rápido y económico — perfecto para escritura continua", en: "Fast and affordable — perfect for continuous writing" } },
      { value: "gpt-4o", label: "GPT-4o", tier: "pro", desc: { es: "Modelo insignia de OpenAI — alta calidad creativa", en: "OpenAI flagship model — high creative quality" } },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", tier: "pro", desc: { es: "Contexto muy largo, excelente para narrativas complejas", en: "Very long context, great for complex narratives" } },
      { value: "o4-mini", label: "o4-mini", tier: "pro", desc: { es: "Modelo de razonamiento eficiente — coherencia narrativa superior", en: "Efficient reasoning model — superior narrative coherence" } },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    keyLabel: { es: "Clave API de Anthropic", en: "Anthropic API Key" },
    keyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
    docsLabel: { es: "Obtener clave en Anthropic Console", en: "Get key from Anthropic Console" },
    models: [
      { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", tier: "pro", desc: { es: "Equilibrio perfecto entre calidad y velocidad", en: "Perfect balance between quality and speed" } },
      { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", tier: "free", desc: { es: "El más rápido de Claude — ideal para asistencia en tiempo real", en: "Fastest Claude — ideal for real-time assistance" } },
      { value: "claude-opus-4-5", label: "Claude Opus 4.5", tier: "pro", desc: { es: "Máxima calidad de escritura creativa de Anthropic", en: "Anthropic's highest creative writing quality" } },
      { value: "claude-3-opus-latest", label: "Claude 3 Opus", tier: "pro", desc: { es: "Potente para narrativas complejas y construcción de mundos", en: "Powerful for complex narratives and worldbuilding" } },
    ],
  },
];

const PROVIDER_COLORS: Record<ProviderId, string> = {
  gemini: "text-blue-500",
  openai: "text-green-500",
  anthropic: "text-orange-500",
};

export function AiSettingsSection({ projectId }: AiSettingsSectionProps) {
  const { t, lang } = useI18n();
  const isEs = lang === "es";
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [credentials, setCredentials] = useState<AiCredential[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("gemini");
  const [newKey, setNewKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const providerDef = PROVIDERS.find((p) => p.id === selectedProvider)!;

  useEffect(() => {
    if (!projectId) return;
    loadCredentials();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Reset model when provider changes
  useEffect(() => {
    setSelectedModel(providerDef.models[0].value);
  }, [selectedProvider, providerDef]);

  async function loadCredentials() {
    if (!projectId) return;
    setLoadingCreds(true);
    try {
      const creds = await customFetch<AiCredential[]>(`/api/projects/${projectId}/ai-credentials`);
      setCredentials(creds);
    } catch {
      setCredentials([]);
    } finally {
      setLoadingCreds(false);
    }
  }

  async function handleTestBuiltin() {
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await customFetch<{ ok: boolean; message: string }>(`/api/ai/test-builtin`, { method: "POST" });
      setTestResult(resp);
      toast({ title: resp.ok ? t("settings.ai.testOk") : t("settings.ai.testFail"), variant: resp.ok ? "default" : "destructive" });
    } catch (e) {
      setTestResult({ ok: false, message: String(e) });
      toast({ variant: "destructive", title: t("settings.ai.testFail"), description: String(e) });
    } finally {
      setTesting(false);
    }
  }

  async function handleAddCredential() {
    if (!projectId || !newKey.trim()) return;
    setSaving(true);
    try {
      const cred = await customFetch<AiCredential>(`/api/projects/${projectId}/ai-credentials`, {
        method: "POST",
        body: JSON.stringify({ provider: selectedProvider, secret: newKey.trim(), model: selectedModel, isDefault: true }),
      });
      setCredentials((prev) => prev.map((c) => ({ ...c, isDefault: false })).concat(cred));
      setNewKey("");
      setShowAddForm(false);
      toast({ title: t("settings.ai.addSuccess") });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!projectId) return;
    setDeletingId(id);
    try {
      await customFetch(`/api/projects/${projectId}/ai-credentials/${id}`, { method: "DELETE" });
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(id: number) {
    if (!projectId) return;
    try {
      await customFetch(`/api/projects/${projectId}/ai-credentials/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true }),
      });
      await loadCredentials();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    }
  }

  async function handleTestCredential(id: number, provider: string) {
    if (!projectId) return;
    try {
      const resp = await customFetch<{ ok: boolean; message: string }>(
        `/api/projects/${projectId}/ai-credentials/test`,
        { method: "POST", body: JSON.stringify({ provider, credentialId: id }) }
      );
      toast({ title: resp.ok ? t("settings.ai.testOk") : t("settings.ai.testFail"), description: resp.message, variant: resp.ok ? "default" : "destructive" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    }
  }

  const activeCustomKey = credentials.find((c) => c.isDefault);
  const modelInfo = providerDef.models.find((m) => m.value === selectedModel);

  function getProviderName(providerId: string) {
    return PROVIDERS.find((p) => p.id === providerId)?.name ?? providerId;
  }

  function getModelForCred(cred: AiCredential) {
    const p = PROVIDERS.find((pp) => pp.id === cred.provider);
    return p?.models.find((m) => m.value === cred.model);
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold border-b pb-2">{t("settings.ai")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.ai.desc")}</p>
      </div>

      {/* Built-in (Replit Gemini) — always visible */}
      <div className="border rounded-lg bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{t("settings.ai.replit")}</p>
                {!activeCustomKey && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                    <Zap className="w-2.5 h-2.5 mr-0.5" />
                    {isEs ? "Activo" : "Active"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.ai.replitDesc")}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-xs h-8" onClick={handleTestBuiltin} disabled={testing}>
            {testing ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1.5" />}
            Test
          </Button>
        </div>
        {testResult && (
          <div className={`flex items-center gap-1.5 text-xs rounded p-2 ${testResult.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
            {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Custom provider section — only when inside a project */}
      {projectId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary/70" />
              <h3 className="text-sm font-medium">
                {isEs ? "Conecta tu propia IA" : "Connect your own AI"}
              </h3>
            </div>
            {!showAddForm && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddForm(true)}>
                <Plus className="w-3 h-3" />
                {isEs ? "Añadir proveedor" : "Add provider"}
              </Button>
            )}
          </div>

          {/* Explanation when empty */}
          {!showAddForm && credentials.length === 0 && (
            <div className="border border-primary/20 rounded-lg bg-primary/5 p-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-primary/70 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isEs
                    ? "Conecta tu cuenta de Gemini, OpenAI o Claude para usar tu plan personal — incluyendo los modelos Pro si los tienes. Tu clave se guarda cifrada."
                    : "Connect your Gemini, OpenAI, or Claude account to use your personal plan — including Pro models if you have them. Your key is stored encrypted."}
                </p>
              </div>
            </div>
          )}

          {/* Add form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 bg-card space-y-4">
              {/* Step 1: Choose provider */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {isEs ? "1. Proveedor de IA" : "1. AI Provider"}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id)}
                      className={`border rounded-lg p-2.5 text-left transition-all ${
                        selectedProvider === p.id
                          ? "border-primary bg-primary/8 ring-1 ring-primary/40"
                          : "hover:border-border/80 hover:bg-muted/40"
                      }`}
                    >
                      <p className={`text-xs font-semibold ${selectedProvider === p.id ? "text-primary" : ""}`}>{p.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    {isEs ? "2. Clave API" : "2. API Key"}
                  </Label>
                  <a
                    href={providerDef.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    {isEs ? providerDef.docsLabel.es : providerDef.docsLabel.en}
                  </a>
                </div>
                <Input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder={providerDef.keyPlaceholder}
                  className="h-8 text-xs font-mono"
                  autoComplete="off"
                />
              </div>

              {/* Step 3: Model */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {isEs ? "3. Modelo" : "3. Model"}
                </Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerDef.models.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span>{m.label}</span>
                          <Badge
                            variant={m.tier === "free" ? "secondary" : "outline"}
                            className={`text-[9px] h-3.5 px-1 ${m.tier === "pro" ? "border-amber-500/50 text-amber-600 dark:text-amber-400" : ""}`}
                          >
                            {m.tier === "free" ? (isEs ? "Gratis" : "Free") : "Pro"}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {modelInfo && (
                  <p className="text-[10px] text-muted-foreground">{isEs ? modelInfo.desc.es : modelInfo.desc.en}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddCredential} disabled={!newKey.trim() || saving}>
                  {saving ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Key className="w-3 h-3 mr-1.5" />}
                  {saving ? t("settings.ai.saving") : (isEs ? "Guardar y activar" : "Save & activate")}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowAddForm(false); setNewKey(""); }}>
                  {t("form.cancel")}
                </Button>
              </div>
            </div>
          )}

          {/* Credentials list */}
          {loadingCreds ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : credentials.length > 0 ? (
            <div className="space-y-2">
              {credentials.map((cred) => {
                const modelData = getModelForCred(cred);
                const pDef = PROVIDERS.find((p) => p.id === cred.provider);
                return (
                  <div
                    key={cred.id}
                    className={`border rounded-lg p-3 flex items-center justify-between gap-2 ${cred.isDefault ? "border-primary/40 bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cred.isDefault ? "bg-primary/15" : "bg-muted"}`}>
                        <Key className={`w-3.5 h-3.5 ${cred.isDefault ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium">{pDef?.name ?? cred.provider}</span>
                          {cred.isDefault && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/15 text-primary border-primary/20">
                              <Star className="w-2 h-2 mr-0.5 fill-current" />
                              {isEs ? "En uso" : "In use"}
                            </Badge>
                          )}
                          {modelData && (
                            <Badge
                              variant={modelData.tier === "free" ? "secondary" : "outline"}
                              className={`text-[9px] h-4 px-1.5 ${modelData.tier === "pro" ? "border-amber-500/50 text-amber-600 dark:text-amber-400" : ""}`}
                            >
                              {modelData.tier === "free" ? (isEs ? "Gratis" : "Free") : "Pro"}
                            </Badge>
                          )}
                        </div>
                        {cred.model && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{cred.model}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => handleTestCredential(cred.id, cred.provider)}>
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Test
                      </Button>
                      {!cred.isDefault && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" onClick={() => handleSetDefault(cred.id)}>
                          {t("settings.ai.setDefault")}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                        onClick={() => handleDelete(cred.id)} disabled={deletingId === cred.id}>
                        {deletingId === cred.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* No project context — guide */}
      {!projectId && (
        <div className="border rounded-lg bg-card/50 p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Key className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{isEs ? "Conecta tu propia IA" : "Connect your own AI"}</p>
              <p className="text-xs text-muted-foreground">
                {isEs
                  ? "Añade tu clave de Gemini, OpenAI o Claude en los ajustes de cada proyecto."
                  : "Add your Gemini, OpenAI, or Claude key in each project's settings."}
              </p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  { label: "Google AI Studio", url: "https://aistudio.google.com/apikey" },
                  { label: "OpenAI Platform", url: "https://platform.openai.com/api-keys" },
                  { label: "Anthropic Console", url: "https://console.anthropic.com/settings/keys" },
                ].map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-medium">
                    <ExternalLink className="w-2.5 h-2.5" />{link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
