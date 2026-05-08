import { useI18n } from "@/lib/i18n";
import { Link, useLocation, useParams } from "wouter";
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
  const [type, setType] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setType(project.type);
      setLanguage(project.primaryLanguage || "");
    }
  }, [project]);

  const handleSave = () => {
    updateProject.mutate({
      id,
      data: {
        name,
        description,
        type: type as any,
        primaryLanguage: language
      }
    }, {
      onSuccess: () => {
        toast({ title: "Settings saved" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return <div className="container py-8">Loading...</div>;
  }

  if (!project) return <div className="container py-8">Project not found</div>;

  return (
    <div className="container max-w-2xl py-8">
      <Button variant="ghost" onClick={() => setLocation(`/projects/${id}`)} className="mb-6 -ml-4 text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Editor
      </Button>
      
      <h1 className="text-3xl font-bold mb-8">{t('project.settings')}</h1>
      
      <div className="space-y-6 bg-card p-6 rounded-xl border border-border">
        <div className="space-y-2">
          <Label>{t('project.name')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('project.description')}</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('project.type')}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="novel">Novel</SelectItem>
                <SelectItem value="saga">Saga</SelectItem>
                <SelectItem value="screenplay">Screenplay</SelectItem>
                <SelectItem value="articles">Articles</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('project.language')}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLocation(`/projects/${id}`)}>{t('form.cancel')}</Button>
          <Button onClick={handleSave} disabled={updateProject.isPending || !name.trim()}>
            {updateProject.isPending ? "Saving..." : t('form.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
