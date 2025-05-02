
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, ZoomIn, ZoomOut, Save, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PdfEditorProps {
  pdfUrl: string;
  onClose?: () => void;
}

const PdfEditor = ({ pdfUrl, onClose }: PdfEditorProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [hasSaved, setHasSaved] = useState(false);
  const [annotations, setAnnotations] = useState<any[]>([]); // In a real app, store annotations
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Reset loading state when PDF URL changes
    setIsLoading(true);
  }, [pdfUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.25, 0.5));
  };

  const handleSave = () => {
    // In a real application, this would save annotations or changes to the PDF
    toast({
      title: "Form Saved",
      description: "Your changes to the form have been saved.",
    });
    setHasSaved(true);
    
    // Reset the "saved" notification after a short delay
    setTimeout(() => {
      setHasSaved(false);
    }, 3000);
  };

  const handleDownload = () => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "Form_Interrogatories.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: "Form Interrogatories PDF is downloading.",
    });
  };
  
  const handleAnnotationChange = (newAnnotation: any) => {
    // In a real app, this would handle annotation changes
    setAnnotations(prev => [...prev, newAnnotation]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between bg-gray-100 p-2 rounded-t-md">
        <div>
          <span className="font-medium">Form Interrogatories</span>
        </div>
        <div className="flex items-center gap-2">
          {hasSaved && (
            <span className="text-green-600 flex items-center text-sm">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Saved
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="mx-1 text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="relative flex-grow bg-gray-100 overflow-auto p-4">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        )}
        
        <div 
          className="mx-auto bg-white shadow-lg transform transition-transform duration-200"
          style={{ 
            transformOrigin: 'top center',
            transform: `scale(${scale})` 
          }}
        >
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=0&navpanes=0`}
            className="w-full"
            style={{ height: '70vh' }}
            onLoad={handleIframeLoad}
            title="PDF Document Viewer"
          />
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 text-sm text-gray-500 rounded-b-md">
        <p>
          Note: This is a form viewer. In a production environment, you would use a full-featured PDF editor 
          library like PDF.js with annotation capabilities.
        </p>
      </div>
    </div>
  );
};

export default PdfEditor;
