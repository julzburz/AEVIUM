import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";
import {
  Bot, Send, RotateCcw, RefreshCw, Zap, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, Wand2, MessageCircle, BookMarked, AlertTriangle, Edit2, Check, Eye, EyeOff,
  Clock, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

interface AiPanelProps {
  projectId: number;
  sceneId?: number;
  chapterId?: number;
  onInsertText?: (text: string) => void;
  onReplaceText?: (text: string) => void;
  selectedText?: string;
}

interface MemorySuggestion {
  type: string;
  title: string;
  content: string;
  confidence: number;
}

interface EditingMemory {
  index: number;
  title: string;
  content: string;
}

interface GenerationResult {
  text: string;
  contextSummary?: string;
  sceneVersionId?: number | null;
  originalText?: string;
  isRewrite?: boolean;
}

interface ContradictionItem {
  description: string;
  conflictingMemory: string;
  options: string[];
}

interface ContradictionResult {
  hasContradiction: boolean;
  contradictions: ContradictionItem[];
}

interface CoherenceIssue {
  type: string;
  description: string;
  suggestion?: string;
}

interface ContextSummary {
  characterCount: number;
  memoryCount: number;
  hasPreviousScene: boolean;
  hasStyleGuide: boolean;
  projectName?: string;
  chapterTitle?: string;
  sceneTitle?: string;
}

type AiMode = "actions" | "chat";

export function AiPanel({ projectId, sceneId, chapterId, onInsertText, onReplaceText, selectedText }: AiPanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<AiMode>("actions");
  const [loading, setLoading] = useState<string | null>(null);

  const [generation, setGeneration] = useState<GenerationResult | null>(null);
  const [editedProposal, setEditedProposal] = useState<string | null>(null);
  const [editingProposal, setEditingProposal] = useState(false);
  const [coherenceResult, setCoherenceResult] = useState<{ issues: CoherenceIssue[]; summary: string } | null>(null);
  const [dismissedIssues, setDismissedIssues] = useState<Set<number>>(new Set());
  const [memorySuggestions, setMemorySuggestions] = useState<MemorySuggestion[]>([]);
  const [editingMemory, setEditingMemory] = useState<EditingMemory | null>(null);
  const [instruction, setInstruction] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [showMemSuggestions, setShowMemSuggestions] = useState(false);
  const [showFactsDialog, setShowFactsDialog] = useState(false);
  const [contradictionAlert, setContradictionAlert] = useState<ContradictionResult | null>(null);
  const [pendingAction, setPendingAction] = useState<"continue" | "rewrite" | null>(null);
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null);
  const [showContext, setShowContext] = useState(false);

  const hasScene = !!sceneId && !!chapterId;

  useEffect(() => {
    if (!hasScene) return;
    loadContextSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, chapterId, projectId]);

  async function loadContextSummary() {
    try {
      const summary = await customFetch<ContextSummary>(`/api/ai/context-summary`, {
        method: "POST",
        body: JSON.stringify({ projectId, sceneId, chapterId }),
      });
      setContextSummary(summary);
    } catch {
      // non-critical
    }
  }

  async function checkContradiction(): Promise<ContradictionResult | null> {
    if (!instruction.trim()) return null;
    try {
      const result = await customFetch<ContradictionResult>(`/api/ai/check-contradiction`, {
        method: "POST",
        body: JSON.stringify({ projectId, instruction }),
      });
      return result;
    } catch {
      return null;
    }
  }

  async function handleContinueScene(skipContradictionCheck = false) {
    if (!hasScene) return;

    if (!skipContradictionCheck && instruction.trim()) {
      setLoading("checking");
      const result = await checkContradiction();
      setLoading(null);
      if (result?.hasContradiction) {
        setContradictionAlert(result);
        setPendingAction("continue");
        return;
      }
    }

    setLoading("continue");
    setGeneration(null);
    setEditedProposal(null);
    setEditingProposal(false);
    setMemorySuggestions([]);
    try {
      const resp = await customFetch<GenerationResult>(`/api/ai/continue-scene`, {
        method: "POST",
        body: JSON.stringify({ sceneId, chapterId, projectId, instruction: instruction || null }),
      });
      setGeneration({ ...resp, isRewrite: false });
      setInstruction("");
      if (resp.text) extractMemorySuggestions(resp.text);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    } finally {
      setLoading(null);
    }
  }

  async function handleRewriteSelection(skipContradictionCheck = false) {
    if (!hasScene || !selectedText || !instruction) return;

    if (!skipContradictionCheck && instruction.trim()) {
      setLoading("checking");
      const result = await checkContradiction();
      setLoading(null);
      if (result?.hasContradiction) {
        setContradictionAlert(result);
        setPendingAction("rewrite");
        return;
      }
    }

    setLoading("rewrite");
    setGeneration(null);
    setEditedProposal(null);
    setEditingProposal(false);
    try {
      const resp = await customFetch<GenerationResult>(`/api/ai/rewrite-selection`, {
        method: "POST",
        body: JSON.stringify({ sceneId, chapterId, projectId, selectedText, instruction }),
      });
      setGeneration({ ...resp, originalText: selectedText, isRewrite: true });
      setInstruction("");
      if (resp.text) extractMemorySuggestions(resp.text);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    } finally {
      setLoading(null);
    }
  }

  function handleContradictionProceed() {
    setContradictionAlert(null);
    if (pendingAction === "continue") handleContinueScene(true);
    else if (pendingAction === "rewrite") handleRewriteSelection(true);
    setPendingAction(null);
  }

  async function handleAcceptGeneration() {
    if (!generation) return;
    const finalText = editedProposal ?? generation.text;
    if (generation.sceneVersionId && chapterId && sceneId) {
      try {
        await customFetch(`/api/chapters/${chapterId}/scenes/${sceneId}/versions/${generation.sceneVersionId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "accepted" }),
        });
      } catch { /* non-critical */ }
    }
    if (generation.isRewrite && onReplaceText) {
      onReplaceText(finalText);
    } else {
      onInsertText?.(finalText);
    }
    setGeneration(null);
    setEditedProposal(null);
    setEditingProposal(false);
  }

  async function handleRejectGeneration() {
    if (!generation) return;
    if (generation.sceneVersionId && chapterId && sceneId) {
      try {
        await customFetch(`/api/chapters/${chapterId}/scenes/${sceneId}/versions/${generation.sceneVersionId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "rejected" }),
        });
      } catch { /* non-critical */ }
    }
    setGeneration(null);
    setEditedProposal(null);
    setEditingProposal(false);
  }

  async function handleReviewCoherence() {
    if (!hasScene) return;
    setLoading("coherence");
    setCoherenceResult(null);
    setDismissedIssues(new Set());
    try {
      const resp = await customFetch<{ issues: CoherenceIssue[]; summary: string }>(`/api/ai/review-coherence`, {
        method: "POST",
        body: JSON.stringify({ sceneId, chapterId, projectId }),
      });
      setCoherenceResult(resp);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    } finally {
      setLoading(null);
    }
  }

  async function extractMemorySuggestions(text: string) {
    try {
      const resp = await customFetch<{ suggestions: MemorySuggestion[] }>(`/api/ai/extract-memory`, {
        method: "POST",
        body: JSON.stringify({ projectId, text, sceneId: sceneId ?? null }),
      });
      if (resp.suggestions?.length > 0) {
        setMemorySuggestions(resp.suggestions);
        setShowMemSuggestions(true);
      }
    } catch {
      // silent - memory extraction is optional
    }
  }

  async function handleExtractFacts() {
    if (!hasScene) return;
    setLoading("extractFacts");
    setMemorySuggestions([]);
    setShowMemSuggestions(false);
    try {
      const resp = await customFetch<{ suggestions: MemorySuggestion[] }>(`/api/ai/extract-memory`, {
        method: "POST",
        body: JSON.stringify({ projectId, sceneId }),
      });
      if (resp.suggestions?.length > 0) {
        setMemorySuggestions(resp.suggestions);
        setShowMemSuggestions(true);
        setShowFactsDialog(true);
      } else {
        toast({ title: t("ai.noFactsFound") });
      }
    } catch (e) {
      const msg = String(e);
      if (msg.includes("No text to analyze") || msg.includes("422")) {
        toast({ variant: "destructive", title: t("ai.sceneHasNoContent") });
      } else {
        toast({ variant: "destructive", title: "Error", description: msg });
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleSaveAllFacts() {
    const toSave = [...memorySuggestions];
    let saved = 0;
    for (let i = 0; i < toSave.length; i++) {
      const s = toSave[i];
      try {
        await customFetch(`/api/projects/${projectId}/memory`, {
          method: "POST",
          body: JSON.stringify({
            type: s.type,
            title: s.title,
            content: s.content,
            scope: "global",
            status: "canonical",
            confidence: s.confidence,
            sourceSceneId: sceneId ?? null,
          }),
        });
        saved++;
      } catch { /* skip failed ones */ }
    }
    setMemorySuggestions([]);
    setShowMemSuggestions(false);
    setShowFactsDialog(false);
    qc.invalidateQueries({ queryKey: ["listMemoryItems"] });
    toast({ title: `${saved} ${t("ai.allFactsSaved")}` });
  }

  async function handleSaveMemory(index: number, title: string, content: string) {
    const suggestion = memorySuggestions[index];
    if (!suggestion) return;
    try {
      await customFetch(`/api/projects/${projectId}/memory`, {
        method: "POST",
        body: JSON.stringify({
          type: suggestion.type,
          title,
          content,
          scope: "global",
          status: "canonical",
          confidence: suggestion.confidence,
          sourceSceneId: sceneId ?? null,
        }),
      });
      setMemorySuggestions((prev) => prev.filter((_, i) => i !== index));
      setEditingMemory(null);
      toast({ title: t("ai.memorySaved") });
      qc.invalidateQueries({ queryKey: ["listMemoryItems"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    }
  }

  async function handleChat() {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage.trim();
    const currentHistory = chatHistory;
    setChatHistory((h) => [...h, { role: "user", text: userMsg }]);
    setChatMessage("");
    setLoading("chat");
    try {
      const resp = await customFetch<GenerationResult>(`/api/ai/free-chat`, {
        method: "POST",
        body: JSON.stringify({
          projectId,
          sceneId: sceneId ?? null,
          chapterId: chapterId ?? null,
          message: userMsg,
          history: currentHistory.map((h) => ({
            role: h.role === "user" ? "user" : "assistant",
            text: h.text,
          })),
        }),
      });
      setChatHistory((h) => [...h, { role: "ai", text: resp.text }]);
    } catch (e) {
      setChatHistory((h) => [...h, { role: "ai", text: "Error: " + String(e) }]);
    } finally {
      setLoading(null);
    }
  }

  const activeIssues = coherenceResult?.issues.filter((_, i) => !dismissedIssues.has(i)) ?? [];

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Contradiction warning dialog */}
      <Dialog open={!!contradictionAlert} onOpenChange={(o) => { if (!o) { setContradictionAlert(null); setPendingAction(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              {t("ai.contradictionTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{t("ai.contradictionDesc")}</p>
            {contradictionAlert?.contradictions.map((c, i) => (
              <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded p-2 text-xs space-y-2">
                <p className="font-medium text-foreground">{c.description}</p>
                <p className="text-muted-foreground">{t("ai.conflictsWith")}: {c.conflictingMemory}</p>
                {c.options && c.options.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-foreground/60 uppercase tracking-wide">{t("ai.suggestedOptions")}</p>
                    {c.options.map((opt, j) => (
                      <button
                        key={j}
                        className="w-full text-left text-[11px] rounded border border-primary/30 bg-primary/5 hover:bg-primary/10 px-2 py-1.5 transition-colors text-foreground leading-snug"
                        onClick={() => {
                          setInstruction(opt);
                          setContradictionAlert(null);
                          setPendingAction(null);
                        }}
                      >
                        → {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setContradictionAlert(null); setPendingAction(null); }}>
              {t("form.cancel")}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleContradictionProceed}>
              {t("ai.proceedAnyway")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mode selector */}
      <div className="flex rounded-md border overflow-hidden text-xs shrink-0">
        <button
          className={`flex-1 py-1.5 flex items-center justify-center gap-1 transition-colors ${mode === "actions" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setMode("actions")}
        >
          <Wand2 className="w-3 h-3" /> {t("ai.actions")}
        </button>
        <button
          className={`flex-1 py-1.5 flex items-center justify-center gap-1 transition-colors ${mode === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setMode("chat")}
        >
          <MessageCircle className="w-3 h-3" /> {t("ai.chat")}
        </button>
      </div>

      {!hasScene && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          <Bot className="w-6 h-6 mx-auto mb-1 text-primary/30" />
          {t("ai.selectScene")}
        </div>
      )}

      {hasScene && mode === "actions" && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Context preview (collapsible) */}
          {contextSummary && (
            <Collapsible open={showContext} onOpenChange={setShowContext}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  {showContext ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span className="flex-1 text-left">
                    {t("ai.context")}: {contextSummary.characterCount} {t("ai.characters").toLowerCase()}, {contextSummary.memoryCount} {t("ai.memoryItems")}
                  </span>
                  {showContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 rounded border bg-muted/30 p-2 text-[10px] space-y-1">
                  {contextSummary.sceneTitle && <p><span className="text-muted-foreground">{t("editor.scenes")}:</span> {contextSummary.sceneTitle}</p>}
                  {contextSummary.chapterTitle && <p><span className="text-muted-foreground">{t("editor.chapters")}:</span> {contextSummary.chapterTitle}</p>}
                  <p><span className="text-muted-foreground">{t("ai.characters")}:</span> {contextSummary.characterCount}</p>
                  <p><span className="text-muted-foreground">{t("ai.memoryItems")}:</span> {contextSummary.memoryCount}</p>
                  {contextSummary.hasPreviousScene && <p className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {t("ai.hasPreviousScene")}</p>}
                  {contextSummary.hasStyleGuide && <p className="flex items-center gap-1"><Layers className="w-2.5 h-2.5" /> {t("ai.hasStyleGuide")}</p>}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Instruction box */}
          <div className="shrink-0">
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={t("ai.instructionPlaceholder")}
              className="text-xs resize-none min-h-[60px]"
              rows={3}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              size="sm"
              className="w-full text-xs h-8"
              onClick={() => handleContinueScene()}
              disabled={!!loading}
            >
              {loading === "continue" || loading === "checking" ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Zap className="w-3 h-3 mr-1.5" />}
              {t("ai.continueScene")}
            </Button>
            {selectedText && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs h-8"
                onClick={() => handleRewriteSelection()}
                disabled={!!loading || !instruction}
              >
                {loading === "rewrite" ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1.5" />}
                {t("ai.rewriteSelection")}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-8"
              onClick={handleReviewCoherence}
              disabled={!!loading}
            >
              {loading === "coherence" ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1.5" />}
              {t("ai.reviewCoherence")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-8 border-secondary/50 text-secondary hover:bg-secondary/15 hover:text-secondary"
              onClick={handleExtractFacts}
              disabled={!!loading}
            >
              {loading === "extractFacts" ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <BookMarked className="w-3 h-3 mr-1.5" />}
              {t("ai.extractFacts")}
            </Button>
          </div>

          {/* Results area */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col gap-3">
              {/* Generation result */}
              {generation && (
                <div className="border rounded-md p-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">{t("ai.generatedText")}</span>
                    {!editingProposal && (
                      <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1.5" onClick={() => { setEditingProposal(true); setEditedProposal(generation.text); }}>
                        <Edit2 className="w-2.5 h-2.5 mr-0.5" />{t("ai.edit")}
                      </Button>
                    )}
                  </div>

                  {/* Side-by-side for rewrites */}
                  {generation.isRewrite && generation.originalText && (
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="space-y-1">
                        <p className="text-muted-foreground font-medium">{t("ai.original")}</p>
                        <p className="leading-relaxed text-foreground/50 line-clamp-6 whitespace-pre-wrap">{generation.originalText}</p>
                      </div>
                      <div className="space-y-1 border-l pl-2">
                        <p className="text-primary font-medium">{t("ai.proposed")}</p>
                        {editingProposal ? (
                          <Textarea
                            value={editedProposal ?? generation.text}
                            onChange={(e) => setEditedProposal(e.target.value)}
                            className="text-[10px] min-h-[80px] resize-none"
                          />
                        ) : (
                          <p className="leading-relaxed text-foreground/90 whitespace-pre-wrap">{generation.text}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Continue-scene: single view */}
                  {!generation.isRewrite && (
                    editingProposal ? (
                      <Textarea
                        value={editedProposal ?? generation.text}
                        onChange={(e) => setEditedProposal(e.target.value)}
                        className="text-xs min-h-[80px] resize-none"
                      />
                    ) : (
                      <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">{generation.text}</p>
                    )
                  )}

                  {editingProposal && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] self-end px-2" onClick={() => setEditingProposal(false)}>
                      {t("ai.previewEdit")}
                    </Button>
                  )}

                  <div className="flex gap-1 mt-1">
                    <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAcceptGeneration}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />{t("ai.accept")}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-muted-foreground" onClick={handleRejectGeneration}>
                      <XCircle className="w-3 h-3 mr-1" />{t("ai.discard")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Memory suggestions — inline pill to reopen dialog */}
              {memorySuggestions.length > 0 && !showFactsDialog && (
                <button
                  className="flex items-center gap-1.5 w-full rounded-md border border-secondary/40 bg-secondary/10 px-2.5 py-1.5 text-xs text-secondary hover:bg-secondary/20 transition-colors"
                  onClick={() => setShowFactsDialog(true)}
                >
                  <BookMarked className="w-3 h-3 shrink-0" />
                  <span className="flex-1 text-left">{memorySuggestions.length} {t("ai.memorySuggestions")}</span>
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </button>
              )}

              {/* Coherence result */}
              {coherenceResult && (
                <div className="border rounded-md p-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">{t("ai.coherenceResult")}</span>
                    <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1.5" onClick={() => setCoherenceResult(null)}>
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-foreground/80">{coherenceResult.summary}</p>
                  {activeIssues.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {coherenceResult.issues.map((issue, i) => {
                        if (dismissedIssues.has(i)) return null;
                        return (
                          <div key={i} className="bg-destructive/10 rounded p-1.5">
                            <p className="text-[10px] font-medium text-destructive">{issue.type}</p>
                            <p className="text-[10px] text-foreground/70">{issue.description}</p>
                            {issue.suggestion && <p className="text-[10px] text-primary mt-0.5">→ {issue.suggestion}</p>}
                            <div className="flex gap-1 mt-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 text-[9px] px-1.5 text-muted-foreground"
                                onClick={() => setDismissedIssues((s) => new Set([...s, i]))}
                              >
                                <XCircle className="w-2.5 h-2.5 mr-0.5" />{t("ai.ignore")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 text-[9px] px-1.5 text-amber-600 dark:text-amber-400"
                                onClick={() => setDismissedIssues((s) => new Set([...s, i]))}
                                title={t("ai.postpone")}
                              >
                                <Clock className="w-2.5 h-2.5 mr-0.5" />{t("ai.postpone")}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-3 h-3" />{t("ai.noIssues")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Chat mode */}
      {mode === "chat" && (
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col gap-2">
              {chatHistory.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  <Bot className="w-8 h-8 mx-auto mb-1.5 text-primary/30" />
                  {t("ai.chatPlaceholder")}
                </div>
              )}
              {chatHistory.length > 0 && (
                <div className="flex justify-end">
                  <button
                    className="text-[9px] text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => setChatHistory([])}
                  >
                    {t("ai.clearChat")}
                  </button>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`rounded-lg px-2.5 py-1.5 text-xs max-w-[85%] leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading === "chat" && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-2.5 py-1.5 bg-muted">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-1.5 shrink-0">
            <Textarea
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder={t("ai.chatInput")}
              className="text-xs resize-none min-h-[52px]"
              rows={2}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
            />
            <Button size="sm" className="shrink-0 h-auto px-2" onClick={handleChat} disabled={!!loading || !chatMessage.trim()}>
              {loading === "chat" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      )}
      {/* Facts extraction dialog */}
      <Dialog open={showFactsDialog} onOpenChange={(o) => { setShowFactsDialog(o); if (!o) setEditingMemory(null); }}>
        <DialogContent className="max-w-xl w-full" style={{ maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 0, gap: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-secondary" />
                <span className="font-semibold text-sm">{t("ai.memorySuggestions")}</span>
                <Badge variant="secondary" className="text-xs">{memorySuggestions.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t("ai.factsDialogHint")}</p>
            </div>
          </div>

          {/* Scrollable list */}
          <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px" }}>
            <div className="flex flex-col gap-3">
              {memorySuggestions.map((s, i) => (
                <div key={i} className="rounded-lg border bg-card p-4">
                  {editingMemory?.index === i ? (
                    <div className="flex flex-col gap-2">
                      <Input
                        value={editingMemory.title}
                        onChange={(e) => setEditingMemory({ ...editingMemory, title: e.target.value })}
                        className="h-8 text-sm"
                        placeholder={t("ai.memoryTitle")}
                      />
                      <Textarea
                        value={editingMemory.content}
                        onChange={(e) => setEditingMemory({ ...editingMemory, content: e.target.value })}
                        className="text-sm min-h-[80px] resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveMemory(i, editingMemory.title, editingMemory.content)}>
                          <Check className="w-3 h-3 mr-1" />{t("ai.save")}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingMemory(null)}>
                          {t("form.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{s.type.replace(/_/g, " ")}</Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{s.confidence}%</span>
                      </div>
                      <p className="text-sm font-semibold leading-snug">{s.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.content}</p>
                      <div className="flex items-center gap-2 pt-2 border-t mt-1">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveMemory(i, s.title, s.content)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />{t("ai.save")}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingMemory({ index: i, title: s.title, content: s.content })}>
                          <Edit2 className="w-3 h-3 mr-1" />{t("ai.edit")}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto text-muted-foreground hover:text-destructive" onClick={() => setMemorySuggestions((p) => p.filter((_, j) => j !== i))}>
                          <XCircle className="w-3 h-3 mr-1" />{t("ai.ignore")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t shrink-0">
            <Button variant="ghost" className="text-xs h-8" onClick={() => setShowFactsDialog(false)}>
              {t("form.cancel")}
            </Button>
            <Button
              className="h-8 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={handleSaveAllFacts}
              disabled={memorySuggestions.length === 0}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {t("ai.saveAll")} ({memorySuggestions.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
