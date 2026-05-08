import { useState } from "react";
import { useGetDashboard, getGetDashboardQueryKey, useCreateProject } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, FileText, Plus, MoreVertical, Layout, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: dashboard, isLoading } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() }
  });

  const createProject = useCreateProject();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState<"novel" | "saga" | "screenplay" | "articles" | "other">("novel");

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    
    createProject.mutate({
      data: {
        name: newProjectName,
        type: newProjectType,
        description: "",
        primaryLanguage: "en",
        status: "active"
      }
    }, {
      onSuccess: (project) => {
        toast({ title: "Project created", description: "Taking you to the editor..." });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setIsCreating(false);
        setNewProjectName("");
        setLocation(`/projects/${project.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create project", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const projects = dashboard?.projects || [];
  const recentActivity = dashboard?.recentActivity || [];

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t('dashboard.create')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Give your new story a name to get started.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={newProjectName} 
                  onChange={(e) => setNewProjectName(e.target.value)} 
                  placeholder="e.g. The Winds of Winter" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={newProjectType} onValueChange={(v: any) => setNewProjectType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novel">Novel</SelectItem>
                    <SelectItem value="saga">Saga / Series</SelectItem>
                    <SelectItem value="screenplay">Screenplay</SelectItem>
                    <SelectItem value="articles">Articles</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
          <Layout className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">{t('dashboard.empty')}</h3>
          <Button onClick={() => setIsCreating(true)} variant="outline" className="mt-4">
            <Plus className="w-4 h-4 mr-2" /> Start Writing
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {projects.map((project) => (
            <Card key={project.id} className="hover:border-primary/50 transition-colors flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-1 line-clamp-1">
                      <Link href={`/projects/${project.id}`} className="hover:underline">
                        {project.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="capitalize flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-secondary inline-block"></span>
                      {project.type}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5" title={t('dashboard.stats.books')}>
                    <BookOpen className="w-4 h-4" /> {project.totalBooks}
                  </div>
                  <div className="flex items-center gap-1.5" title={t('dashboard.stats.chapters')}>
                    <FileText className="w-4 h-4" /> {project.totalChapters}
                  </div>
                  <div className="flex items-center gap-1.5" title={t('dashboard.stats.words')}>
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {project.totalWords.toLocaleString()} w
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between border-t mt-auto pt-4 bg-muted/10 rounded-b-xl">
                <span className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                </span>
                <Button size="sm" variant="ghost" asChild className="h-8">
                  <Link href={`/projects/${project.id}`}>Open</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            {t('dashboard.recent')}
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg border bg-card text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p>
                    <span className="font-medium text-foreground">{activity.projectName}</span>
                    <span className="text-muted-foreground mx-1">•</span>
                    Updated {activity.entityName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
