import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: { title: string; content: string } | null;
  onDownload: () => void;
}

const DocumentViewerDialog = ({
  open,
  onOpenChange,
  document,
  onDownload
}: DocumentViewerDialogProps) => {
  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">{document.title}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto mt-4 max-h-[50vh]">
          <div className="bg-white p-6 border rounded-md">
            {/* Split content by newlines and render each paragraph */}
            {document.content.split('\n').map((paragraph, idx) => (
              paragraph.trim() ? (
                <p key={idx} className="my-2">
                  {paragraph}
                </p>
              ) : (
                <div key={idx} className="h-4" /> // Empty space for blank lines
              )
            ))}
          </div>
        </div>
        
        <DialogFooter className="flex space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onDownload}>
            Download Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewerDialog; 