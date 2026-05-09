import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";
import { Bot, CheckCircle2, XCircle, Trash2, Plus, Loader2, Zap, Key, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function AiSettingsSection({ projectId }: AiSettingsSectionProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [credentials, setCredentials] = useState<AiCredential[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newModel, setNewModel] = useState("");
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
          model: newModel.trim() || null,
          isDefault: credentials.length === 0,
        }),
      });
      setCredentials((prev) => [...prev, cred]);
      setNewKey("");
      setNewModel("");
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
      const resp = await customFetch<{ ok: boolean; message: string }>(`/api/projects/${projectId}/ai-credentials/test`, {
        method: "POST",
        body: JSON.stringify({ provider: "gemini", credentialId: id }),
      });
      toast({
        title: resp.ok ? t("settings.ai.testOk") : t("settings.ai.testFail"),
        description: resp.message,
        variant: resp.ok ? "default" : "destructive",
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold border-b pb-2">{t("settings.ai")}</h2>
      <p className="text-sm text-muted-foreground">{t("settings.ai.desc")}</p>

      {/* Built-in Gemini */}
      <div className="border rounded-lg bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{t("settings.ai.replit")}</p>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  <Zap className="w-2.5 h-2.5 mr-0.5" />
                  Default
                </Badge>
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
            {testing ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3 mr-1.5" />
            )}
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

      {/* Per-project custom keys — only shown when a project is in context */}
      {projectId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t("settings.ai.credentials")}</h3>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="w-3 h-3" />
              {t("settings.ai.addKeyFor")}
            </Button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="border rounded-lg p-3 bg-card space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Key className="w-3.5 h-3.5 text-primary/70" />
                <p className="text-xs font-medium">{t("settings.ai.geminiKey")}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("settings.ai.geminiKey")}</Label>
                <Input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder={t("settings.ai.keyPlaceholder")}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo (opcional)</Label>
                <Input
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder={t("settings.ai.modelPlaceholder")}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={handleAddCredential}
                  disabled={!newKey.trim() || saving}
                >
                  {saving ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Plus className="w-3 h-3 mr-1.5" />}
                  {saving ? t("settings.ai.saving") : t("form.add")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setShowAddForm(false); setNewKey(""); setNewModel(""); }}
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
          ) : credentials.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t("settings.ai.noCredentialsProject")}</p>
          ) : (
            <div className="space-y-2">
              {credentials.map((cred) => (
                <div key={cred.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium capitalize">{cred.provider}</span>
                        {cred.isDefault && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                            <Star className="w-2 h-2 mr-0.5 fill-current" />
                            {t("settings.ai.isDefault")}
                          </Badge>
                        )}
                      </div>
                      {cred.model && <p className="text-[10px] text-muted-foreground truncate">{cred.model}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-1.5 text-muted-foreground"
                      onClick={() => handleTestCredential(cred.id)}
                      title="Test connection"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Test
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
                      className="h-6 w-6 p-0 text-destructive/70 hover:text-destructive"
                      onClick={() => handleDelete(cred.id)}
                      disabled={deletingId === cred.id}
                    >
                      {deletingId === cred.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info about per-project credentials (when no project context) */}
      {!projectId && (
        <div className="border rounded-lg bg-card/50 p-4">
          <div className="flex items-start gap-2">
            <Plus className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t("settings.ai.addKey")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.ai.noCredentials")}
              </p>
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                {t("settings.ai.addKeyFor")} en los ajustes del proyecto.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
