import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, AlertCircle, Eye, FileCheck } from 'lucide-react';
import { fillFormInterrogatories, downloadPdf, inspectPdfFields, downloadPdfFromCourts } from '@/integrations/pdf/client';
import { 
  ComplaintInformation, 
  extractComplaintInformationFromFile,
  analyzeCheckboxesForFormInterrogatories
} from '@/integrations/gemini/client';
import { useToast } from '@/hooks/use-toast';
import { useCaseDocuments } from '@/hooks/use-case-documents';
import FormInterrogatoriesPreview from './FormInterrogatoriesPreview';

interface FormInterrogatoriesPdfButtonProps {
  extractedData: ComplaintInformation | null;
  caseId: string | undefined;
  onEditExtractedData?: () => void;
}

const FormInterrogatoriesPdfButton = ({
  extractedData,
  caseId,
  onEditExtractedData
}: FormInterrogatoriesPdfButtonProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [enhancedData, setEnhancedData] = useState<ComplaintInformation | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const { getComplaintFileAsBase64 } = useCaseDocuments();

  // Generate form interrogatories with AI-enhanced data
  const handleGenerateFormInterrogatories = async () => {
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
    setAnalysisMessage(null);

    try {
      toast({
        title: 'Analyzing Complaint Document',
        description: 'Processing the complaint document to extract detailed information...',
      });

      // Start with the original extracted data
      let dataForForm = extractedData || null;
      let complaintText = '';

      // Try to get the full complaint file for direct analysis
      if (caseId) {
        try {
          // Get the complaint file as base64
          const { base64, fileType, fileName } = await getComplaintFileAsBase64(caseId);
          console.log(`Retrieved complaint file: ${fileName}, type: ${fileType}`);
          
          // Use Gemini to analyze the entire file
          const fileAnalysisData = await extractComplaintInformationFromFile(base64, fileType);
          console.log('Gemini direct file analysis results:', fileAnalysisData);
          
          // Also extract the text content for checkbox analysis
          try {
            const textResponse = await fetch(`data:${fileType};base64,${base64}`);
            const blob = await textResponse.blob();
            complaintText = await blob.text();
            console.log(`Extracted ${complaintText.length} characters of text from complaint`);
          } catch (textError) {
            console.warn('Could not extract text from document:', textError);
            // Continue with limited text
          }
          
          // Use the file analysis data as our primary source of information
          dataForForm = fileAnalysisData;
          
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
      
      if (!dataForForm) {
        toast({
          title: 'Missing Information',
          description: 'No information available to fill the form.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }
      
      // Dedicated checkbox analysis step
      try {
        if (caseId) {
          setAnalysisMessage('Analyzing case and determining relevant form sections...');
          toast({
            title: 'Analyzing Case Type',
            description: 'Determining which sections of the form interrogatories apply to this case...',
          });

          // Call Gemini to analyze the document and determine which checkboxes to check
          const enhancedDataWithCheckboxes = await analyzeCheckboxesForFormInterrogatories(
            dataForForm,
            complaintText || undefined
          );
          
          console.log('Checkbox analysis results:', enhancedDataWithCheckboxes.relevantCheckboxes);
          
          // Update dataForForm with the enhanced data including checkbox selections
          dataForForm = enhancedDataWithCheckboxes;
          
          // Create a message showing which sections were checked
          if (dataForForm.relevantCheckboxes) {
            const checkedSections = [];
            if (dataForForm.relevantCheckboxes.section301) checkedSections.push("General (301-309)");
            if (dataForForm.relevantCheckboxes.section310) checkedSections.push("Personal Injury (310-318)");
            if (dataForForm.relevantCheckboxes.section320) checkedSections.push("Motor Vehicles (320-323)");
            if (dataForForm.relevantCheckboxes.section330) checkedSections.push("Pedestrian/Bicycle (330-332)");
            if (dataForForm.relevantCheckboxes.section340) checkedSections.push("Premises Liability (340-340.7)");
            if (dataForForm.relevantCheckboxes.section350) checkedSections.push("Business/Contract (350-355)");
            if (dataForForm.relevantCheckboxes.section360) checkedSections.push("Employment - Discrimination (360-360.7)");
            if (dataForForm.relevantCheckboxes.section370) checkedSections.push("Employment - Wage/Hour (370-376)");
            
            // Also track specific individual checkboxes
            const checkedFields = [];
            if (dataForForm.relevantCheckboxes.Definitions) checkedFields.push("Incident Definition");
            if (dataForForm.relevantCheckboxes.GenBkgrd) checkedFields.push("General Background");
            if (dataForForm.relevantCheckboxes.PMEInjuries) checkedFields.push("Physical/Mental Injuries");
            if (dataForForm.relevantCheckboxes.PropDam) checkedFields.push("Property Damage");
            if (dataForForm.relevantCheckboxes.LostincomeEarn) checkedFields.push("Lost Income/Earnings");
            if (dataForForm.relevantCheckboxes.OtherDam) checkedFields.push("Other Damages");
            if (dataForForm.relevantCheckboxes.MedHist) checkedFields.push("Medical History");
            if (dataForForm.relevantCheckboxes.IncOccrdMV) checkedFields.push("Motor Vehicle Incident");
            if (dataForForm.relevantCheckboxes.Contract) checkedFields.push("Contract Dispute");
            
            let analysisText = "";
            
            if (checkedSections.length > 0) {
              analysisText += `Based on case analysis, these sections have been selected: ${checkedSections.join(", ")}`;
            }
            
            if (checkedFields.length > 0) {
              analysisText += `\n\nSpecific fields selected: ${checkedFields.join(", ")}`;
            }
            
            // Add explanation if available
            if (dataForForm && 
                'explanation' in dataForForm && 
                dataForForm.explanation) {
              analysisText += `\n\nReasoning: ${dataForForm.explanation}`;
            }
            
            setAnalysisMessage(analysisText);
            
            // Log the checkbox selection details to console
            console.log("Selected sections:", checkedSections);
            console.log("Selected specific fields:", checkedFields);
            if (dataForForm && 
                'explanation' in dataForForm && 
                dataForForm.explanation) {
              console.log("Explanation from Gemini:", dataForForm.explanation);
            }
          }
          
          // If the case type was identified, update the message
          if (dataForForm.caseType) {
            toast({
              title: 'Case Type Identified',
              description: `Identified as a ${dataForForm.caseType} case. Relevant form sections selected.`,
            });
          }
          
          // If we have an incident definition, show it in the UI
          if (dataForForm.incidentDefinition) {
            console.log('Incident definition:', dataForForm.incidentDefinition);
            
            // Add the incident definition to the analysis message
            if (dataForForm.relevantCheckboxes) {
              setAnalysisMessage(prevMessage => {
                const baseMessage = prevMessage || '';
                return `${baseMessage}${baseMessage ? '\n\n' : ''}INCIDENT defined as: "${dataForForm.incidentDefinition}"`;
              });
            }
          }
        }
      } catch (analysisError) {
        console.warn('Error analyzing form with Gemini:', analysisError);
        toast({
          title: 'Checkbox Analysis Limited',
          description: 'Could not fully analyze which checkboxes should be selected. Default sections will be used.',
          variant: 'default',
        });
        
        // Set default checkbox values
        dataForForm = {
          ...dataForForm,
          relevantCheckboxes: {
            ...(dataForForm.relevantCheckboxes || {}),
            section301: true // Always check the general section as fallback
          }
        };
      }
      
      toast({
        title: 'Form Generation Complete',
        description: 'Form Interrogatories has been generated with your case information.',
      });
      
      // Store the enhanced data
      setEnhancedData(dataForForm);
      setIsGenerated(true);
    } catch (error) {
      console.error('Error generating form:', error);
      
      // Set error details for user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorDetails(`Error: ${errorMessage}`);
      
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate the form. You can try downloading the blank form instead.',
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
        description: 'Please generate the form first.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      toast({
        title: 'Preparing PDF',
        description: 'Creating your filled PDF for download...',
      });
      
      // Generate the filled PDF with enhanced data
      const pdfBytes = await fillFormInterrogatories(enhancedData, true);
      
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
      
      // Set error details for user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorDetails(`Error: ${errorMessage}`);
      
      toast({
        title: 'Download Failed',
        description: 'Failed to download the filled PDF. You can try downloading the blank form.',
        variant: 'destructive',
      });
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
    <div className="space-y-4">
      {!isGenerated ? (
        <div>
          <Button 
            onClick={handleGenerateFormInterrogatories}
            disabled={isProcessing || isInspecting || (!extractedData && !caseId)}
            variant="default"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileCheck className="h-4 w-4" />
            )}
            Generate Form Interrogatories
          </Button>
          
          {isProcessing && (
            <div className="mt-2 text-sm text-gray-600 animate-pulse">
              {analysisMessage || 'Analyzing document and preparing form...'}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {analysisMessage && (
            <div className="text-sm bg-blue-50 text-blue-800 p-3 rounded-md border border-blue-100 whitespace-pre-line">
              {analysisMessage}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <FormInterrogatoriesPreview 
              extractedData={enhancedData}
              onEditData={onEditExtractedData || (() => {})}
              caseId={caseId}
            />
            
            <Button 
              onClick={handleDownloadPdf}
              disabled={isProcessing}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
            
            <Button
              onClick={() => {
                setIsGenerated(false);
                setEnhancedData(null);
                setAnalysisMessage(null);
              }}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              Regenerate
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2">
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