import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Eye, Download, Edit, Loader2 } from 'lucide-react';
import { ComplaintInformation } from '@/integrations/gemini/client';
import { fillFormInterrogatories, downloadPdf } from '@/integrations/pdf/client';
import { useToast } from '@/hooks/use-toast';

interface FormInterrogatoriesPreviewProps {
  extractedData: ComplaintInformation | null;
  onEditData: () => void;
  caseId?: string;
}

const FormInterrogatoriesPreview = ({
  extractedData,
  onEditData,
  caseId
}: FormInterrogatoriesPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Clean up the object URL when the component unmounts or dialog closes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Reset the PDF URL when the dialog closes
  useEffect(() => {
    if (!isOpen && pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [isOpen, pdfUrl]);

  const handleOpenPreview = async () => {
    if (!extractedData) {
      toast({
        title: 'Missing Data',
        description: 'No case information available to preview the form.',
        variant: 'destructive',
      });
      return;
    }

    setIsOpen(true);
    setIsLoading(true);
    
    try {
      // Generate the filled PDF with preview mode enabled
      const pdfBytes = await fillFormInterrogatories(extractedData, true);
      
      // Create a blob URL for the PDF
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Set the URL for the iframe
      setPdfUrl(url);
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      toast({
        title: 'Preview Failed',
        description: 'Failed to generate the PDF preview. Please try again.',
        variant: 'destructive',
      });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!extractedData) return;
    
    setIsDownloading(true);
    
    try {
      // Generate the filled PDF with preview mode enabled
      const pdfBytes = await fillFormInterrogatories(extractedData, true);
      
      // Create a filename based on the case
      const filename = `Form_Interrogatories_${caseId || 'case'}.pdf`;
      
      // Download the PDF
      downloadPdf(pdfBytes, filename);
      
      toast({
        title: 'PDF Downloaded',
        description: 'Form Interrogatories PDF has been downloaded with your case information.',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download the PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenPreview}
        disabled={!extractedData}
        variant="default"
        className="flex items-center gap-2"
      >
        <Eye className="h-4 w-4" />
        Preview Form
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6">
            <DialogTitle>Form Interrogatories Preview</DialogTitle>
            <DialogDescription>
              Preview your form before downloading. This form includes all sections relevant to your case.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden bg-gray-100">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-none"
                title="Form Interrogatories Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No preview available</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 border-t">
            <div className="flex gap-2 w-full justify-between">
              <Button
                variant="outline"
                onClick={onEditData}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Information
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={isLoading || !pdfUrl || isDownloading}
                  className="flex items-center gap-2"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FormInterrogatoriesPreview; 