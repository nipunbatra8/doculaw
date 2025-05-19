import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, AlertCircle, Eye, FileCheck } from 'lucide-react';
import { fillRequestForAdmissions, downloadPdf, inspectPdfFields } from '@/integrations/pdf/client';
import { 
  ComplaintInformation 
} from '@/integrations/gemini/client';
import { useToast } from '@/hooks/use-toast';
import { useCaseDocuments } from '@/hooks/use-case-documents';
import RequestForAdmissionsPreview from './RequestForAdmissionsPreview';

interface RequestForAdmissionsPdfButtonProps {
  extractedData: ComplaintInformation | null;
  caseId: string | undefined;
  onEditExtractedData?: () => void;
}

const RequestForAdmissionsPdfButton = ({
  extractedData,
  caseId,
  onEditExtractedData
}: RequestForAdmissionsPdfButtonProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [enhancedData, setEnhancedData] = useState<ComplaintInformation | null>(null);
  const { toast } = useToast();
  const { getComplaintFileAsBase64 } = useCaseDocuments();

  // Generate request for admissions with case data
  const handleGenerateRequestForAdmissions = async () => {
    if (!extractedData && !caseId) {
      toast({
        title: 'Missing Data',
        description: 'No case information available to fill the form.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setErrorDetails(null);

    try {
      toast({
        title: 'Generating Request for Admissions',
        description: 'Processing the complaint information to create your document...',
      });

      // Use the extracted data
      const dataForForm = extractedData || null;
      
      if (!dataForForm) {
        toast({
          title: 'Missing Information',
          description: 'No information available to fill the form.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }
      
      // Generate the PDF in the background to verify it works
      // This will not download it yet, just generate it to make sure we can
      try {
        await fillRequestForAdmissions(dataForForm);
        console.log('Successfully pre-generated PDF to verify it works');
      } catch (pdfError) {
        console.error('Error pre-generating PDF:', pdfError);
        // We'll continue anyway since the actual PDF will be generated when downloading
      }
      
      toast({
        title: 'Document Generation Complete',
        description: 'Request for Admissions has been generated with your case information.',
      });
      
      // Store the data
      setEnhancedData(dataForForm);
      setIsGenerated(true);
    } catch (error) {
      console.error('Error generating form:', error);
      
      // Set error details for user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorDetails(`Error: ${errorMessage}`);
      
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate the document. You can try downloading the blank form instead.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct download of the filled PDF
  const handleDownloadPdf = async () => {
    if (!enhancedData) {
      toast({
        title: 'Missing Data',
        description: 'No data available to fill the form.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Generate the PDF with the form data
      const pdfBytes = await fillRequestForAdmissions(enhancedData);
      
      // Download the PDF
      downloadPdf(pdfBytes, 'Request_for_Admissions.pdf');
      
      toast({
        title: 'Download Started',
        description: 'Your Request for Admissions PDF is being downloaded.',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      
      toast({
        title: 'Download Failed',
        description: 'Failed to download the PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Inspect the PDF fields for debugging
  const handleInspectFields = async () => {
    try {
      setIsInspecting(true);
      
      // Get the response from the PDF client
      const fields = await inspectPdfFields();
      
      console.log('PDF fields:', fields);
      
      toast({
        title: 'PDF Inspection Complete',
        description: `Found ${fields.length} fields in the PDF. Check console for details.`,
      });
    } catch (error) {
      console.error('Error inspecting PDF:', error);
      
      toast({
        title: 'Inspection Failed',
        description: 'Failed to inspect the PDF fields. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsInspecting(false);
    }
  };

  // Download the original form from courts website
  const handleDownloadOriginalForm = async () => {
    try {
      toast({
        title: 'Downloading Blank Form',
        description: 'Downloading the blank Request for Admissions form...',
      });
      
      // Fetch the blank RFA form
      const response = await fetch('/RFA.pdf');
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
      
      const pdfBytes = await response.arrayBuffer();
      
      // Download the PDF
      downloadPdf(pdfBytes, 'Blank_Request_for_Admissions.pdf');
      
      toast({
        title: 'Download Complete',
        description: 'The blank Request for Admissions form has been downloaded.',
      });
    } catch (error) {
      console.error('Error downloading blank form:', error);
      
      toast({
        title: 'Download Failed',
        description: 'Failed to download the blank form. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Determine the button state based on current processing status
  const getButtonState = () => {
    if (isProcessing) {
      return {
        icon: <Loader2 className="h-4 w-4 mr-2 animate-spin" />,
        text: 'Generating...',
        action: () => {},
        disabled: true
      };
    }
    
    if (isGenerated) {
      return {
        icon: <Download className="h-4 w-4 mr-2" />,
        text: 'Download PDF',
        action: handleDownloadPdf,
        disabled: false
      };
    }
    
    return {
      icon: <FileText className="h-4 w-4 mr-2" />,
      text: 'Generate PDF',
      action: handleGenerateRequestForAdmissions,
      disabled: false
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="space-y-4">
      {errorDetails && (
        <div className="bg-destructive/10 rounded-md p-3 flex items-start text-sm border border-destructive">
          <AlertCircle className="h-4 w-4 mr-2 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Error Generating PDF</p>
            <p className="mt-1 text-muted-foreground">{errorDetails}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={handleDownloadOriginalForm}
            >
              <FileText className="h-3 w-3 mr-2" />
              Download Blank Form
            </Button>
          </div>
        </div>
      )}
      
      {isGenerated && enhancedData && (
        <div className="bg-card rounded-md border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/40 flex justify-between items-center">
            <div className="flex items-center">
              <FileCheck className="h-4 w-4 mr-2 text-primary" />
              <h3 className="text-sm font-medium">Request for Admissions Generated</h3>
            </div>
            
            {onEditExtractedData && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onEditExtractedData}
              >
                Edit Info
              </Button>
            )}
          </div>
          
          <RequestForAdmissionsPreview extractedData={enhancedData} />
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          size="sm"
          variant={isGenerated ? "default" : "default"}
          onClick={buttonState.action}
          disabled={buttonState.disabled}
          className="flex-1"
        >
          {buttonState.icon}
          {buttonState.text}
        </Button>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleInspectFields}
            disabled={isInspecting}
            title="Inspect PDF Fields (Developer Tool)"
          >
            {isInspecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadOriginalForm}
            title="Download Blank Form"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestForAdmissionsPdfButton; 