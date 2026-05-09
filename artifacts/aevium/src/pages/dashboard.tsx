import { useState, useMemo } from "react";
import { useGetDashboard, getGetDashboardQueryKey, useCreateProject } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { es, enUS, type Locale } from "date-fns/locale";
import {
  BookOpen, FileText, Plus, Layout, Search, Globe,
  ArrowRight, AlertTriangle, Zap, BarChart3, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type ProjectType = "novel" | "saga" | "articles" | "screenplay" | "other";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  completed: "secondary",
  archived: "outline",
};

const dateFnsLocale: Record<string, Locale> = { es, en: enUS };

interface LastScene {
  sceneId: number;
  sceneTitle: string;
  chapterId: number;
  updatedAt: string;
  projectId: number;
  projectName: string;
}

interface GlobalStats {
  totalWords: number;
  totalScenes: number;
  totalProjects: number;
  totalAlerts: number;
}

interface ProjectLastScene {
  id: number;
  title: string;
  chapterId: number;
  updatedAt: string;
}

interface EnrichedProject {
  id: number;
  name: string;
  type: string;
  status: string;
  primaryLanguage: string;
  updatedAt: string;
  totalBooks: number;
  totalChapters: number;
  totalScenes: number;
  totalWords: number;
  pendingAlerts: number;
  lastScene: ProjectLastScene | null;
}

export default function Dashboard() {
  const { t, lang } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const locale = dateFnsLocale[lang] ?? es;

  const { data: dashboard, isLoading } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() }
  });

  const createProject = useCreateProject();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState<ProjectType>("novel");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ProjectType | "all">("all");

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProject.mutate({
      data: {
        name: newProjectName,
        type: newProjectType,
        description: "",
        primaryLanguage: lang,
        status: "active"
      }
    }, {
      onSuccess: (project) => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setIsCreating(false);
        setNewProjectName("");
        setLocation(`/projects/${project.id}`);
      },
      onError: () => {
        toast({ title: t('dashboard.form.title'), variant: "destructive" });
      }
    });
  };

  const allProjects = (dashboard?.projects ?? []) as unknown as EnrichedProject[];
  const lastEditedScene = (dashboard as { lastEditedScene?: LastScene } | undefined)?.lastEditedScene ?? null;
  const globalStats = (dashboard as { globalStats?: GlobalStats } | undefined)?.globalStats ?? null;

  const filteredProjects = useMemo(() => {
    return allProjects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || p.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [allProjects, searchQuery, filterType]);

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
    <div className="w-full max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
          {t('dashboard.title')}
        </h1>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-project">
              <Plus className="w-4 h-4" />
              {t('dashboard.create')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('dashboard.form.title')}</DialogTitle>
              <DialogDescription>{t('dashboard.form.desc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-project-name">{t('dashboard.form.name')}</Label>
                <Input
                  id="new-project-name"
                  data-testid="input-project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject(); }}
                  placeholder={t('dashboard.form.name')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-project-type">{t('dashboard.form.type')}</Label>
                <Select
                  value={newProjectType}
                  onValueChange={(v: ProjectType) => setNewProjectType(v)}
                >
                  <SelectTrigger id="new-project-type" data-testid="select-project-type">
                    <SelectValue placeholder={t('dashboard.form.type')} />
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreating(false)} data-testid="button-cancel-project">
                {t('form.cancel')}
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || createProject.isPending}
                data-testid="button-create-project"
              >
                {createProject.isPending ? t('dashboard.form.creating') : t('dashboard.form.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* "Continue here" banner */}
      {lastEditedScene && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">{t('dashboard.continueHere')}</p>
            <p className="font-medium text-sm text-foreground truncate">
              {lastEditedScene.sceneTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {lastEditedScene.projectName} · {formatDistanceToNow(new Date(lastEditedScene.updatedAt), { addSuffix: true, locale })}
            </p>
          </div>
          <Button size="sm" asChild className="shrink-0 gap-1.5">
            <Link href={`/projects/${lastEditedScene.projectId}`}>
              {t('dashboard.continueBtn')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Global stats bar */}
      {globalStats && globalStats.totalProjects > 0 && (
        <div className="mb-8 grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card px-4 py-3 flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold leading-none">{globalStats.totalWords.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.totalWords')}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3 flex items-center gap-3">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold leading-none">{globalStats.totalScenes}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.totalScenes')}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3 flex items-center gap-3">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold leading-none">{globalStats.totalProjects}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.totalProjects')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and filter */}
      {allProjects.length > 0 && (
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t('dashboard.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-projects"
            />
          </div>
          <Select value={filterType} onValueChange={(v: ProjectType | "all") => setFilterType(v)}>
            <SelectTrigger className="w-44" data-testid="select-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.filterAll')}</SelectItem>
              <SelectItem value="novel">{t('dashboard.type.novel')}</SelectItem>
              <SelectItem value="saga">{t('dashboard.type.saga')}</SelectItem>
              <SelectItem value="screenplay">{t('dashboard.type.screenplay')}</SelectItem>
              <SelectItem value="articles">{t('dashboard.type.articles')}</SelectItem>
              <SelectItem value="other">{t('dashboard.type.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Project grid */}
      {filteredProjects.length === 0 && allProjects.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed" data-testid="status-empty-projects">
          <Layout className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">{t('dashboard.empty')}</h3>
          <Button onClick={() => setIsCreating(true)} variant="outline" className="mt-4" data-testid="button-start-writing">
            <Plus className="w-4 h-4 mr-2" /> {t('landing.cta')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="transition-colors flex flex-col hover:border-primary/50 cursor-pointer"
              data-testid={`card-project-${project.id}`}
              onClick={() => setLocation(`/projects/${project.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-1 line-clamp-1">
                      <Link href={`/projects/${project.id}`} className="hover:underline" data-testid={`link-project-${project.id}`}>
                        {project.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="capitalize">
                      {t(`dashboard.type.${project.type}` as Parameters<typeof t>[0])}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      variant={statusVariant[project.status] ?? "outline"}
                      className="text-xs capitalize"
                      data-testid={`badge-status-${project.id}`}
                    >
                      {t(`project.status.${project.status}` as Parameters<typeof t>[0])}
                    </Badge>
                    {project.pendingAlerts > 0 && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {project.pendingAlerts} {t('dashboard.alerts')}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pb-3">
                {/* Stats row */}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5" title={t('dashboard.stats.books')}>
                    <BookOpen className="w-3.5 h-3.5" /> {project.totalBooks}
                  </div>
                  <div className="flex items-center gap-1.5" title={t('dashboard.stats.chapters')}>
                    <FileText className="w-3.5 h-3.5" /> {project.totalChapters}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {project.totalWords.toLocaleString()} w
                    </span>
                  </div>
                </div>

                {/* Progress bar: scenes with content vs total */}
                {project.totalScenes > 0 && (
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('dashboard.stats.scenes')}: {project.totalScenes}</span>
                      {project.totalWords > 0 && (
                        <span>{Math.round(project.totalWords / Math.max(project.totalScenes, 1))} w/{t('dashboard.stats.perScene')}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  <span data-testid={`text-language-${project.id}`}>
                    {t(`project.language.${project.primaryLanguage}` as Parameters<typeof t>[0])}
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between border-t mt-auto pt-3 pb-3 bg-muted/10 rounded-b-xl gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-muted-foreground">
                    {t('dashboard.project.updated')} {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true, locale })}
                  </span>
                  {project.lastScene && (
                    <span className="text-xs text-primary truncate mt-0.5">
                      ↳ {project.lastScene.title}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="ghost" asChild className="h-7 text-xs shrink-0" data-testid={`button-open-project-${project.id}`}>
                  <Link href={`/projects/${project.id}`}>{t('dashboard.project.open')}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
