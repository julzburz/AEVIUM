import { useState, useMemo } from "react";
import { useGetDashboard, getGetDashboardQueryKey, useCreateProject } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { es, enUS, type Locale } from "date-fns/locale";
import { BookOpen, FileText, Plus, Layout, History, Search, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

  const MOCK_PROJECTS = [
    { id: -1, name: "El último horizonte", type: "novel" as const, status: "active" as const, totalBooks: 1, totalChapters: 12, totalWords: 34820, primaryLanguage: "es", updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), isMock: true },
    { id: -2, name: "Crónicas del vacío", type: "saga" as const, status: "active" as const, totalBooks: 3, totalChapters: 41, totalWords: 127450, primaryLanguage: "es", updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), isMock: true },
    { id: -3, name: "The Lighthouse Keeper", type: "novel" as const, status: "completed" as const, totalBooks: 1, totalChapters: 22, totalWords: 78300, primaryLanguage: "en", updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), isMock: true },
    { id: -4, name: "Fragmentos de luz", type: "articles" as const, status: "active" as const, totalBooks: 1, totalChapters: 8, totalWords: 14200, primaryLanguage: "es", updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), isMock: true },
    { id: -5, name: "Nebulosa: Origen", type: "screenplay" as const, status: "archived" as const, totalBooks: 1, totalChapters: 5, totalWords: 9600, primaryLanguage: "es", updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), isMock: true },
  ];

  const MOCK_ACTIVITY = [
    { projectName: "El último horizonte", entityName: "Capítulo 12 — El regreso", updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { projectName: "Crónicas del vacío", entityName: "Libro 2 · Escena 7 — La traición", updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
    { projectName: "The Lighthouse Keeper", entityName: "Chapter 22 — End of summer", updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    { projectName: "Fragmentos de luz", entityName: "Artículo — Filosofía del tiempo libre", updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  ];

  const rawProjects = dashboard?.projects ?? [];
  const allProjects = rawProjects.length > 0 ? rawProjects : MOCK_PROJECTS;

  const filteredProjects = useMemo(() => {
    return allProjects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || p.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [allProjects, searchQuery, filterType]);

  const rawActivity = dashboard?.recentActivity ?? [];
  const recentActivity = rawActivity.length > 0 ? rawActivity : MOCK_ACTIVITY;

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 py-8 space-y-8">
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

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8">
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

      {filteredProjects.length === 0 && allProjects.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed" data-testid="status-empty-projects">
          <Layout className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">{t('dashboard.empty')}</h3>
          <Button onClick={() => setIsCreating(true)} variant="outline" className="mt-4" data-testid="button-start-writing">
            <Plus className="w-4 h-4 mr-2" /> {t('landing.cta')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredProjects.map((project) => {
            const isMock = 'isMock' in project && project.isMock;
            return (
              <Card
                key={project.id}
                className={`transition-colors flex flex-col ${isMock ? "opacity-70 border-dashed hover:border-primary/30" : "hover:border-primary/50"}`}
                data-testid={`card-project-${project.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1 line-clamp-1">
                        {isMock ? (
                          <span className="text-muted-foreground">{project.name}</span>
                        ) : (
                          <Link href={`/projects/${project.id}`} className="hover:underline" data-testid={`link-project-${project.id}`}>
                            {project.name}
                          </Link>
                        )}
                      </CardTitle>
                      <CardDescription className="capitalize flex items-center gap-2">
                        {t(`dashboard.type.${project.type}` as Parameters<typeof t>[0])}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isMock && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary/70">
                          Ejemplo
                        </Badge>
                      )}
                      <Badge
                        variant={statusVariant[project.status] ?? "outline"}
                        className="text-xs capitalize"
                        data-testid={`badge-status-${project.id}`}
                      >
                        {t(`project.status.${project.status}` as Parameters<typeof t>[0])}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-3">
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5" title={t('dashboard.stats.books')}>
                      <BookOpen className="w-3.5 h-3.5" /> {project.totalBooks}
                    </div>
                    <div className="flex items-center gap-1.5" title={t('dashboard.stats.chapters')}>
                      <FileText className="w-3.5 h-3.5" /> {project.totalChapters}
                    </div>
                    <div className="flex items-center gap-1.5" title={t('dashboard.stats.words')}>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {project.totalWords.toLocaleString()} w
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="w-3 h-3" />
                    <span data-testid={`text-language-${project.id}`}>
                      {t(`project.language.${project.primaryLanguage}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t mt-auto pt-3 pb-3 bg-muted/10 rounded-b-xl">
                  <span className="text-xs text-muted-foreground">
                    {t('dashboard.project.updated')} {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true, locale })}
                  </span>
                  {isMock ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-primary/70"
                      onClick={() => setIsCreating(true)}
                      data-testid={`button-open-project-${project.id}`}
                    >
                      <Plus className="w-3 h-3 mr-1" /> {t('dashboard.create')}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" asChild className="h-7 text-xs" data-testid={`button-open-project-${project.id}`}>
                      <Link href={`/projects/${project.id}`}>{t('dashboard.project.open')}</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
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
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card text-sm"
                data-testid={`row-activity-${i}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p>
                    <span className="font-medium text-foreground">{activity.projectName}</span>
                    <span className="text-muted-foreground mx-1">·</span>
                    {activity.entityName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.updatedAt), { addSuffix: true, locale })}
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
