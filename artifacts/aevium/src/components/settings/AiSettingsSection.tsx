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

const GEMINI_MODELS: { value: string; labelEs: string; labelEn: string; tier: "free" | "pro"; descEs: string; descEn: string }[] = [
  {
    value: "gemini-2.5-flash",
    labelEs: "Gemini 2.5 Flash",
    labelEn: "Gemini 2.5 Flash",
    tier: "free",
    descEs: "Rápido y eficiente — recomendado para uso general",
    descEn: "Fast and efficient — recommended for general use",
  },
  {
    value: "gemini-2.5-pro",
    labelEs: "Gemini 2.5 Pro",
    labelEn: "Gemini 2.5 Pro",
    tier: "pro",
    descEs: "Mayor calidad, razonamiento avanzado — requiere cuenta Pro",
    descEn: "Higher quality, advanced reasoning — requires Pro account",
  },
  {
    value: "gemini-2.0-flash",
    labelEs: "Gemini 2.0 Flash",
    labelEn: "Gemini 2.0 Flash",
    tier: "free",
    descEs: "Estable y veloz, gran relación calidad-precio",
    descEn: "Stable and fast, great value",
  },
  {
    value: "gemini-1.5-flash",
    labelEs: "Gemini 1.5 Flash",
    labelEn: "Gemini 1.5 Flash",
    tier: "free",
    descEs: "Económico, ideal para proyectos con muchos textos",
    descEn: "Economical, ideal for high-volume projects",
  },
  {
    value: "gemini-1.5-pro",
    labelEs: "Gemini 1.5 Pro",
    labelEn: "Gemini 1.5 Pro",
    tier: "pro",
    descEs: "Alta calidad con contexto muy largo — requiere cuenta Pro",
    descEn: "High quality with very long context — requires Pro account",
  },
];

export function AiSettingsSection({ projectId }: AiSettingsSectionProps) {
  const { t, lang } = useI18n();
  const isEs = lang === "es";
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [credentials, setCredentials] = useState<AiCredential[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    loadCredentials();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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
      const resp = await customFetch<{ ok: boolean; message: string }>(`/api/ai/test-builtin`, {
        method: "POST",
      });
      setTestResult(resp);
      toast({
        title: resp.ok ? t("settings.ai.testOk") : t("settings.ai.testFail"),
        variant: resp.ok ? "default" : "destructive",
      });
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
        body: JSON.stringify({
          provider: "gemini",
          secret: newKey.trim(),
          model: selectedModel,
          isDefault: true,
        }),
      });
      setCredentials((prev) => prev.map(c => ({ ...c, isDefault: false })).concat(cred));
      setNewKey("");
      setSelectedModel("gemini-2.5-flash");
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

  async function handleTestCredential(id: number) {
    if (!projectId) return;
    try {
      const resp = await customFetch<{ ok: boolean; message: string }>(
        `/api/projects/${projectId}/ai-credentials/test`,
        { method: "POST", body: JSON.stringify({ provider: "gemini", credentialId: id }) }
      );
      toast({
        title: resp.ok ? t("settings.ai.testOk") : t("settings.ai.testFail"),
        description: resp.message,
        variant: resp.ok ? "default" : "destructive",
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    }
  }

  const activeCustomKey = credentials.find((c) => c.isDefault);
  const modelInfo = GEMINI_MODELS.find((m) => m.value === selectedModel);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold border-b pb-2">{t("settings.ai")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.ai.desc")}</p>
      </div>

      {/* Built-in provider (always shown) */}
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
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-xs h-8"
            onClick={handleTestBuiltin}
            disabled={testing}
          >
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

      {/* Connect your own Gemini account */}
      {projectId && (
        <div className="space-y-3">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary/70" />
              <h3 className="text-sm font-medium">
                {isEs ? "Conecta tu cuenta de Gemini" : "Connect your Gemini account"}
              </h3>
            </div>
            {!showAddForm && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-3 h-3" />
                {t("settings.ai.addKeyFor")}
              </Button>
            )}
          </div>

          {/* Explanation banner */}
          {!showAddForm && credentials.length === 0 && (
            <div className="border border-primary/20 rounded-lg bg-primary/5 p-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-primary/70 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isEs
                    ? "Conecta tu propia clave API de Google Gemini para usar tu cuenta personal — incluyendo los beneficios de Gemini Pro si la tienes. Tu clave se guarda cifrada y solo se usa para este proyecto."
                    : "Connect your own Google Gemini API key to use your personal account — including Gemini Pro benefits if you have them. Your key is stored encrypted and only used for this project."}
                </p>
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                {isEs ? "Obtener mi clave en Google AI Studio" : "Get my key from Google AI Studio"}
              </a>
            </div>
          )}

          {/* Add form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 bg-card space-y-4">
              {/* Header with link */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-primary/70" />
                  <p className="text-xs font-semibold">
                    {isEs ? "Nueva clave de Gemini" : "New Gemini key"}
                  </p>
                </div>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  {isEs ? "Obtener clave" : "Get key"}
                </a>
              </div>

              {/* Step 1: API Key */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {isEs ? "1. Clave API" : "1. API Key"}
                </Label>
                <Input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="h-8 text-xs font-mono"
                  autoComplete="off"
                />
                <p className="text-[10px] text-muted-foreground">
                  {isEs
                    ? "La encontrarás en aistudio.google.com/apikey — gratuita con límites, o ilimitada con cuenta Pro."
                    : "Find it at aistudio.google.com/apikey — free with limits, or unlimited with a Pro account."}
                </p>
              </div>

              {/* Step 2: Model */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {isEs ? "2. Modelo" : "2. Model"}
                </Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEMINI_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span>{isEs ? m.labelEs : m.labelEn}</span>
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
                  <p className="text-[10px] text-muted-foreground">
                    {isEs ? modelInfo.descEs : modelInfo.descEn}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={handleAddCredential}
                  disabled={!newKey.trim() || saving}
                >
                  {saving
                    ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    : <Key className="w-3 h-3 mr-1.5" />}
                  {saving
                    ? t("settings.ai.saving")
                    : (isEs ? "Guardar y activar" : "Save & activate")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setShowAddForm(false); setNewKey(""); setSelectedModel("gemini-2.5-flash"); }}
                >
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
                const modelData = GEMINI_MODELS.find((m) => m.value === cred.model);
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
                          <span className="text-xs font-medium capitalize">Gemini</span>
                          {cred.isDefault && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/15 text-primary border-primary/20">
                              <Star className="w-2 h-2 mr-0.5 fill-current" />
                              {isEs ? "En uso" : "In use"}
                            </Badge>
                          )}
                          {cred.model && modelData && (
                            <Badge
                              variant={modelData.tier === "free" ? "secondary" : "outline"}
                              className={`text-[9px] h-4 px-1.5 ${modelData.tier === "pro" ? "border-amber-500/50 text-amber-600 dark:text-amber-400" : ""}`}
                            >
                              {modelData.tier === "free" ? (isEs ? "Gratis" : "Free") : "Pro"}
                            </Badge>
                          )}
                        </div>
                        {cred.model && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{cred.model}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => handleTestCredential(cred.id)}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                        Test
                      </Button>
                      {!cred.isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-1.5"
                          onClick={() => handleSetDefault(cred.id)}
                        >
                          {t("settings.ai.setDefault")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                        onClick={() => handleDelete(cred.id)}
                        disabled={deletingId === cred.id}
                      >
                        {deletingId === cred.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* When no project context — guide user to project settings */}
      {!projectId && (
        <div className="border rounded-lg bg-card/50 p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Key className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isEs ? "Conecta tu cuenta de Gemini" : "Connect your Gemini account"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEs
                  ? "Puedes añadir tu propia clave API de Gemini en los ajustes de cada proyecto para usar tu cuenta personal (incluyendo Gemini Pro)."
                  : "You can add your own Gemini API key in each project's settings to use your personal account (including Gemini Pro)."}
              </p>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                Google AI Studio
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
