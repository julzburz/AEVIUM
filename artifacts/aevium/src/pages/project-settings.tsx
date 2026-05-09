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
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type ProjectType = "novel" | "saga" | "articles" | "screenplay" | "other";
type ProjectLanguage = "en" | "es";

export default function ProjectSettings() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    updateProject.mutate({
      id,
      data: { name, description, type, primaryLanguage: language }
    }, {
      onSuccess: () => {
        toast({ title: t('form.save') });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      },
      onError: () => {
        toast({ title: t('form.save'), variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return <div className="w-full max-w-2xl mx-auto px-6 py-8">{t('form.saving')}</div>;
  }

  if (!project) {
    return <div className="w-full max-w-2xl mx-auto px-6 py-8">{t('notFound.message')}</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8">
      <Button
        variant="ghost"
        onClick={() => setLocation(`/projects/${id}`)}
        className="mb-6 -ml-4 text-muted-foreground"
        data-testid="button-back-to-editor"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> {t('project.backToEditor')}
      </Button>

      <h1 className="text-3xl font-bold mb-8" data-testid="text-project-settings-title">{t('project.settings')}</h1>

      <div className="space-y-6 bg-card p-6 rounded-xl border border-border">
        <div className="space-y-2">
          <Label htmlFor="project-name">{t('project.name')}</Label>
          <Input
            id="project-name"
            data-testid="input-project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-description">{t('project.description')}</Label>
          <Textarea
            id="project-description"
            data-testid="input-project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="project-type">{t('project.type')}</Label>
            <Select value={type} onValueChange={(v: ProjectType) => setType(v)}>
              <SelectTrigger id="project-type" data-testid="select-project-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novel">{t('dashboard.type.novel')}</SelectItem>
                <SelectItem value="saga">{t('dashboard.type.saga')}</SelectItem>
                <SelectItem value="screenplay">{t('dashboard.type.screenplay')}</SelectItem>
                <SelectItem value="articles">{t('dashboard.type.articles')}</SelectItem>
                <SelectItem value="other">{t('dashboard.type.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-language">{t('project.language')}</Label>
            <Select value={language} onValueChange={(v: ProjectLanguage) => setLanguage(v)}>
              <SelectTrigger id="project-language" data-testid="select-project-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('project.language.en')}</SelectItem>
                <SelectItem value="es">{t('project.language.es')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation(`/projects/${id}`)}
            data-testid="button-cancel-settings"
          >
            {t('form.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateProject.isPending || !name.trim()}
            data-testid="button-save-settings"
          >
            {updateProject.isPending ? t('form.saving') : t('form.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
