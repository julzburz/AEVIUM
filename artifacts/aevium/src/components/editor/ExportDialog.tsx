import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportDialogProps {
  projectId: number;
  projectName: string;
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ projectId, projectName, open, onClose }: ExportDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/export`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
      toast({ title: t("editor.export.success") });
    } catch {
      toast({ title: t("editor.export.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("editor.export.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">{t("editor.export.desc")}</p>
          <button
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
            onClick={handleExport}
            disabled={loading}
            data-testid="button-export-txt"
          >
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t("editor.export.txt")}</p>
              <p className="text-xs text-muted-foreground">{t("editor.export.txtDesc")}</p>
            </div>
            <Download className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("form.cancel")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
