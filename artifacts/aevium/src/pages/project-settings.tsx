import { useI18n } from "@/lib/i18n";
import { useLocation, useParams } from "wouter";
import { useGetProject, getGetProjectQueryKey, useUpdateProject } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Bot, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AiSettingsSection } from "@/components/settings/AiSettingsSection";
import { cn } from "@/lib/utils";

type ProjectType = "novel" | "saga" | "articles" | "screenplay" | "other";
type ProjectLanguage = "en" | "es";
type SettingsTab = "project" | "ai";

export default function ProjectSettings() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { t, lang } = useI18n();
  const isEs = lang === "es";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>("project");

  const { data: project, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) }
  });

  const updateProject = useUpdateProject();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType>("novel");
  const [language, setLanguage] = useState<ProjectLanguage>("es");

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? "");
      setType(project.type as ProjectType);
      setLanguage((project.primaryLanguage ?? "es") as ProjectLanguage);
    }
  }, [project]);

  const handleSave = () => {
    updateProject.mutate(
      { id, data: { name, description, type, primaryLanguage: language } },
      {
        onSuccess: () => {
          toast({ title: isEs ? "Proyecto guardado" : "Project saved" });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        },
        onError: () => {
          toast({ title: t("form.save"), variant: "destructive" });
        },
      }
    );
  };

  const navItems: { id: SettingsTab; labelEs: string; labelEn: string; icon: React.ReactNode }[] = [
    { id: "project", labelEs: "Proyecto", labelEn: "Project", icon: <FileText className="w-4 h-4" /> },
    { id: "ai", labelEs: "Inteligencia Artificial", labelEn: "Artificial Intelligence", icon: <Bot className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {t("notFound.message")}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/projects/${id}`)}
          className="text-muted-foreground hover:text-foreground -ml-2 gap-1.5"
          data-testid="button-back-to-editor"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEs ? "Volver al editor" : "Back to editor"}
        </Button>
        <div className="w-px h-4 bg-border" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{isEs ? "Ajustes de proyecto" : "Project settings"}</p>
          <h1 className="text-sm font-semibold truncate" data-testid="text-project-settings-title">
            {project.name}
          </h1>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-52 shrink-0 border-r p-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors",
                activeTab === item.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/15"
              )}
            >
              {item.icon}
              {isEs ? item.labelEs : item.labelEn}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* Project tab */}
          {activeTab === "project" && (
            <div className="max-w-lg space-y-8">
              <div>
                <h2 className="text-base font-semibold">{isEs ? "Información del proyecto" : "Project information"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isEs ? "Datos generales y configuración del proyecto." : "General project data and settings."}
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="project-name" className="text-sm font-medium">{t("project.name")}</Label>
                  <Input
                    id="project-name"
                    data-testid="input-project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="project-description" className="text-sm font-medium">{t("project.description")}</Label>
                  <Textarea
                    id="project-description"
                    data-testid="input-project-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="resize-none"
                    placeholder={isEs ? "Descripción del proyecto…" : "Project description…"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="project-type" className="text-sm font-medium">{t("project.type")}</Label>
                    <Select value={type} onValueChange={(v: ProjectType) => setType(v)}>
                      <SelectTrigger id="project-type" data-testid="select-project-type" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novel">{t("dashboard.type.novel")}</SelectItem>
                        <SelectItem value="saga">{t("dashboard.type.saga")}</SelectItem>
                        <SelectItem value="screenplay">{t("dashboard.type.screenplay")}</SelectItem>
                        <SelectItem value="articles">{t("dashboard.type.articles")}</SelectItem>
                        <SelectItem value="other">{t("dashboard.type.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="project-language" className="text-sm font-medium">{t("project.language")}</Label>
                    <Select value={language} onValueChange={(v: ProjectLanguage) => setLanguage(v)}>
                      <SelectTrigger id="project-language" data-testid="select-project-language" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{t("project.language.en")}</SelectItem>
                        <SelectItem value="es">{t("project.language.es")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={updateProject.isPending || !name.trim()}
                  data-testid="button-save-settings"
                  className="min-w-24"
                >
                  {updateProject.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />{t("form.saving")}</>
                  ) : (
                    t("form.save")
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setLocation(`/projects/${id}`)}
                  data-testid="button-cancel-settings"
                  className="text-muted-foreground"
                >
                  {t("form.cancel")}
                </Button>
              </div>
            </div>
          )}

          {/* AI tab */}
          {activeTab === "ai" && (
            <div className="max-w-lg">
              <AiSettingsSection projectId={id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
