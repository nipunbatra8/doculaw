import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import { fillFormInterrogatories, downloadPdf, inspectPdfFields, downloadPdfFromCourts } from '@/integrations/pdf/client';
import { 
  ComplaintInformation, 
  analyzeFormInterrogatories, 
  extractComplaintInformationFromFile 
} from '@/integrations/gemini/client';
import { useToast } from '@/hooks/use-toast';
import { useCaseDocuments } from '@/hooks/use-case-documents';

interface FormInterrogatoriesPdfButtonProps {
  extractedData: ComplaintInformation | null;
  caseId: string | undefined;
}

const FormInterrogatoriesPdfButton = ({
  extractedData,
  caseId
}: FormInterrogatoriesPdfButtonProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { toast } = useToast();
  const { getComplaintFileAsBase64 } = useCaseDocuments();

  const handleDownloadPdf = async () => {
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
        title: 'Analyzing Complaint Document',
        description: 'Processing the complaint document to extract detailed information...',
      });

      // Start with the original extracted data
      let enhancedData = extractedData || null;

      // Try to get the full complaint file for direct analysis
      if (caseId) {
        try {
          // Get the complaint file as base64
          const { base64, fileType, fileName } = await getComplaintFileAsBase64(caseId);
          console.log(`Retrieved complaint file: ${fileName}, type: ${fileType}`);
          
          // Use Gemini to analyze the entire file
          const fileAnalysisData = await extractComplaintInformationFromFile(base64, fileType);
          console.log('Gemini direct file analysis results:', fileAnalysisData);
          
          // Use the file analysis data as our primary source of information
          enhancedData = fileAnalysisData;
          
          toast({
            title: 'Document Analysis Complete',
            description: 'Successfully extracted information from the complaint document.',
          });
        } catch (fileAnalysisError) {
          console.error('Error analyzing complaint file:', fileAnalysisError);
          toast({
            title: 'Document Analysis Limited',
            description: 'Could not fully analyze the document. Using available information.',
            variant: 'default',
          });
          // Continue with whatever data we have
        }
      }
      
      if (!enhancedData) {
        toast({
          title: 'Missing Information',
          description: 'No information available to fill the form.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }
      
      // Checkbox analysis
      try {
        if (caseId) {
          toast({
            title: 'Analyzing Case Type',
            description: 'Determining relevant form sections for this case...',
          });
          
          // Additional analysis to determine which checkboxes should be checked
          enhancedData = await analyzeFormInterrogatories(
            JSON.stringify(enhancedData), // Send the structured data for analysis
            enhancedData
          );
          
          console.log('Enhanced form data with checkbox analysis:', enhancedData);
        }
      } catch (analysisError) {
        console.warn('Error analyzing form with Gemini:', analysisError);
        // Continue with original data if analysis fails
      }
      
      toast({
        title: 'Preparing PDF',
        description: 'Filling out the form interrogatories PDF with case information...',
      });
      
      // Generate the filled PDF with enhanced data
      const pdfBytes = await fillFormInterrogatories(enhancedData);
      
      // Create a filename based on the case
      const filename = `Form_Interrogatories_${caseId || 'case'}.pdf`;
      
      // Download the PDF
      downloadPdf(pdfBytes, filename);
      
      toast({
        title: 'PDF Downloaded',
        description: 'Form Interrogatories PDF has been downloaded with your case information.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Set error details for user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorDetails(`Error: ${errorMessage}`);
      
      toast({
        title: 'Download Failed',
        description: 'Failed to generate the filled PDF. You can try downloading the blank form.',
        variant: 'destructive',
      });
      
      // Try to download the original form
      try {
        const originalPdfBytes = await downloadPdfFromCourts();
        downloadPdf(originalPdfBytes, `Form_Interrogatories_Original.pdf`);
        
        toast({
          title: 'Original PDF Downloaded',
          description: 'Downloaded the original blank form instead.',
        });
      } catch (fallbackError) {
        console.error('Failed to download original PDF:', fallbackError);
        toast({
          title: 'Download Failed',
          description: 'Could not download even the blank form. Please try again later.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Inspect PDF fields
  const handleInspectFields = async () => {
    setIsInspecting(true);
    
    try {
      await inspectPdfFields();
      toast({
        title: 'PDF Fields Inspected',
        description: 'Check browser console for field details.',
      });
    } catch (error) {
      console.error('Error inspecting PDF fields:', error);
      toast({
        title: 'Inspection Failed',
        description: 'Failed to inspect PDF fields. See console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsInspecting(false);
    }
  };

  // Direct download of original blank form
  const handleDownloadOriginalForm = async () => {
    setIsProcessing(true);
    
    try {
      const pdfBytes = await downloadPdfFromCourts();
      downloadPdf(pdfBytes, 'Form_Interrogatories_Original.pdf');
      
      toast({
        title: 'Blank Form Downloaded',
        description: 'You can now manually fill out the form interrogatories.',
      });
    } catch (error) {
      console.error('Error downloading blank form:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download the blank form. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          onClick={handleDownloadPdf}
          disabled={isProcessing || isInspecting || (!extractedData && !caseId)}
          variant="default"
          className="flex items-center gap-2"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Download Form Interrogatories PDF
          {!isProcessing && <Download className="h-3 w-3 ml-1" />}
        </Button>
        
        <Button
          onClick={handleInspectFields}
          disabled={isProcessing || isInspecting}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isInspecting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <FileText className="h-3 w-3" />
          )}
          Inspect PDF Fields
        </Button>
      </div>
      
      {errorDetails && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 space-y-2">
          <div className="flex gap-2 items-start">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              {errorDetails}
            </div>
          </div>
          
          <div className="pt-1 border-t border-red-200">
            <p className="mb-2 font-medium">Alternative options:</p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={handleDownloadOriginalForm}
                disabled={isProcessing || isInspecting}
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )} 
                Download blank form
              </Button>
            </div>
            <span className="text-gray-500 text-xs block mt-2">You can manually fill in the information.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormInterrogatoriesPdfButton; 