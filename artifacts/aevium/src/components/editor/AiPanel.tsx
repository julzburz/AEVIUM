import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";
import { Bot, Send, RotateCcw, RefreshCw, Zap, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2, Wand2, MessageCircle, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQueryClient } from "@tanstack/react-query";

interface AiPanelProps {
  projectId: number;
  sceneId?: number;
  chapterId?: number;
  onInsertText?: (text: string) => void;
  selectedText?: string;
}

interface MemorySuggestion {
  type: string;
  title: string;
  content: string;
  confidence: number;
}

interface GenerationResult {
  text: string;
  contextSummary?: string;
}

interface CoherenceIssue {
  type: string;
  description: string;
  suggestion?: string;
}

type AiMode = "actions" | "chat";

export function AiPanel({ projectId, sceneId, chapterId, onInsertText, selectedText }: AiPanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<AiMode>("actions");
  const [loading, setLoading] = useState<string | null>(null);

  const [generation, setGeneration] = useState<GenerationResult | null>(null);
  const [coherenceResult, setCoherenceResult] = useState<{ issues: CoherenceIssue[]; summary: string } | null>(null);
  const [memorySuggestions, setMemorySuggestions] = useState<MemorySuggestion[]>([]);
  const [instruction, setInstruction] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [showMemSuggestions, setShowMemSuggestions] = useState(false);

  const hasScene = !!sceneId && !!chapterId;

  async function handleContinueScene() {
    if (!hasScene) return;
    setLoading("continue");
    setGeneration(null);
    setMemorySuggestions([]);
    try {
      const resp = await customFetch<GenerationResult>(`/api/ai/continue-scene`, {
        method: "POST",
        body: JSON.stringify({ sceneId, chapterId, projectId, instruction: instruction || null }),
      });
      setGeneration(resp);
      setInstruction("");
      if (resp.text) extractMemorySuggestions(resp.text);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    } finally {
      setLoading(null);
    }
  }

  async function handleRewriteSelection() {
    if (!hasScene || !selectedText || !instruction) return;
    setLoading("rewrite");
    setGeneration(null);
    try {
      const resp = await customFetch<GenerationResult>(`/api/ai/rewrite-selection`, {
        method: "POST",
        body: JSON.stringify({ sceneId, chapterId, projectId, selectedText, instruction }),
      });
      setGeneration(resp);
      setInstruction("");
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    } finally {
      setLoading(null);
    }
  }

  async function handleReviewCoherence() {
    if (!hasScene) return;
    setLoading("coherence");
    setCoherenceResult(null);
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

  async function handleAcceptMemory(suggestion: MemorySuggestion) {
    try {
      await customFetch(`/api/projects/${projectId}/memory`, {
        method: "POST",
        body: JSON.stringify({
          type: suggestion.type,
          title: suggestion.title,
          content: suggestion.content,
          status: "suggested",
          confidence: suggestion.confidence,
          sourceSceneId: sceneId ?? null,
        }),
      });
      setMemorySuggestions((prev) => prev.filter((s) => s !== suggestion));
      toast({ title: t("ai.memorySaved") });
      qc.invalidateQueries({ queryKey: ["listMemoryItems"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: String(e) });
    }
  }

  async function handleChat() {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage.trim();
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
        }),
      });
      setChatHistory((h) => [...h, { role: "ai", text: resp.text }]);
    } catch (e) {
      setChatHistory((h) => [...h, { role: "ai", text: "Error: " + String(e) }]);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col h-full gap-2">
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
              onClick={handleContinueScene}
              disabled={!!loading}
            >
              {loading === "continue" ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Zap className="w-3 h-3 mr-1.5" />}
              {t("ai.continueScene")}
            </Button>
            {selectedText && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs h-8"
                onClick={handleRewriteSelection}
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
          </div>

          {/* Results area */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col gap-3">
              {/* Generation result */}
              {generation && (
                <div className="border rounded-md p-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">{t("ai.generatedText")}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs px-2"
                      onClick={() => {
                        onInsertText?.(generation.text);
                        setGeneration(null);
                      }}
                    >
                      {t("ai.accept")}
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">{generation.text}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs self-end text-muted-foreground"
                    onClick={() => setGeneration(null)}
                  >
                    <XCircle className="w-3 h-3 mr-1" />{t("ai.discard")}
                  </Button>
                </div>
              )}

              {/* Memory suggestions */}
              {memorySuggestions.length > 0 && (
                <Collapsible open={showMemSuggestions} onOpenChange={setShowMemSuggestions}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs text-primary font-medium w-full">
                      <BookMarked className="w-3 h-3" />
                      {t("ai.memorySuggestions")} ({memorySuggestions.length})
                      {showMemSuggestions ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex flex-col gap-2 mt-2">
                      {memorySuggestions.map((s, i) => (
                        <div key={i} className="border rounded-md p-2 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[9px] h-4">{s.type}</Badge>
                            <span className="text-[9px] text-muted-foreground">{s.confidence}%</span>
                          </div>
                          <p className="text-[11px] font-medium">{s.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{s.content}</p>
                          <div className="flex gap-1 mt-1">
                            <Button size="sm" className="h-5 text-[9px] px-1.5" onClick={() => handleAcceptMemory(s)}>
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />{t("ai.save")}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1.5" onClick={() => setMemorySuggestions((p) => p.filter((_, j) => j !== i))}>
                              <XCircle className="w-2.5 h-2.5 mr-0.5" />{t("ai.ignore")}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
                  {coherenceResult.issues.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {coherenceResult.issues.map((issue, i) => (
                        <div key={i} className="bg-destructive/10 rounded p-1.5">
                          <p className="text-[10px] font-medium text-destructive">{issue.type}</p>
                          <p className="text-[10px] text-foreground/70">{issue.description}</p>
                          {issue.suggestion && <p className="text-[10px] text-primary mt-0.5">💡 {issue.suggestion}</p>}
                        </div>
                      ))}
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
              className="text-xs resize-none min-h-[36px] max-h-[80px]"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
            />
            <Button size="sm" className="shrink-0 h-auto" onClick={handleChat} disabled={!!loading || !chatMessage.trim()}>
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
