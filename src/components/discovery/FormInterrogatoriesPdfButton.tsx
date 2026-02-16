import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { FileText, Download, Loader2, AlertCircle, Eye, FileCheck, RefreshCcw, X, Info } from 'lucide-react';
import { fillFormInterrogatories, downloadPdf, downloadPdfFromCourts } from '@/integrations/pdf/client';
import { 
  ComplaintInformation, 
  extractComplaintInformationFromFile,
  analyzeCheckboxesForFormInterrogatories
} from '@/integrations/gemini/client';
import { useToast } from '@/hooks/use-toast';
import { useCaseDocuments } from '@/hooks/use-case-documents';
import { supabase } from '@/integrations/supabase/client';

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
  const [isProcessingPreview, setIsProcessingPreview] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [enhancedData, setEnhancedData] = useState<ComplaintInformation | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const { getComplaintFileAsBase64 } = useCaseDocuments();

  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [checkingStorage, setCheckingStorage] = useState(false);
  const [storedPdfPath, setStoredPdfPath] = useState<string | null>(null);
  const [savingToStorage, setSavingToStorage] = useState(false);
  const [storageChecked, setStorageChecked] = useState(false);

  useEffect(() => {
    const checkStored = async () => {
      if (!caseId) { setStorageChecked(true); return; }
      setCheckingStorage(true);
      try {
        const folder = `cases/${caseId}/forms`;
        const { data, error } = await supabase.storage.from('doculaw').list(folder, { search: 'Form_Interrogatories.pdf' });
        if (error) console.warn('Storage list error:', error.message);
        const file = data?.find(f => f.name === 'Form_Interrogatories.pdf');
        if (file) {
          const fullPath = `${folder}/Form_Interrogatories.pdf`;
          setStoredPdfPath(fullPath);
          setIsGenerated(true);
        }
      } catch (e) {
        console.warn('Error checking stored PDF:', e);
      } finally {
        setCheckingStorage(false);
        setStorageChecked(true);
      }
    };
    checkStored();
  }, [caseId]);

  

  const uploadPdfToStorage = async (pdfBytes: ArrayBuffer) => {
    if (!caseId) return null;
    try {
      setSavingToStorage(true);
      const folder = `cases/${caseId}/forms`;
      const path = `${folder}/Form_Interrogatories.pdf`;
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const { error: uploadError } = await supabase.storage.from('doculaw').upload(path, blob, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;
      setStoredPdfPath(path);
      toast({ title: 'Saved to Supabase', description: 'Form Interrogatories PDF has been saved to your case files.' });
      return path;
    } catch (e) {
      console.error('Failed to save PDF to storage:', e);
      toast({ title: 'Storage Save Failed', description: 'Could not save the PDF to Supabase Storage.', variant: 'destructive' });
      return null;
    } finally {
      setSavingToStorage(false);
    }
  };

  const handleGenerateFormInterrogatories = useCallback(async () => {
    if (storedPdfPath) return;
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

      let dataForForm = extractedData || null;
      let complaintText = '';

      if (caseId) {
        try {
          const { base64, fileType, fileName } = await getComplaintFileAsBase64(caseId);
          console.log(`Retrieved complaint file: ${fileName}, type: ${fileType}`);
          const fileAnalysisData = await extractComplaintInformationFromFile(base64, fileType);
          console.log('Gemini direct file analysis results:', fileAnalysisData);
          try {
            const textResponse = await fetch(`data:${fileType};base64,${base64}`);
            const blob = await textResponse.blob();
            complaintText = await blob.text();
            console.log(`Extracted ${complaintText.length} characters of text from complaint`);
          } catch (textError) {
            console.warn('Could not extract text from document:', textError);
          }
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
      
      try {
        if (caseId) {
          setAnalysisMessage('Analyzing case and determining relevant form sections...');
          toast({
            title: 'Analyzing Case Type',
            description: 'Determining which sections of the form interrogatories apply to this case...',
          });
          const enhancedDataWithCheckboxes = await analyzeCheckboxesForFormInterrogatories(
            dataForForm,
            complaintText || undefined
          );
          console.log('Checkbox analysis results:', enhancedDataWithCheckboxes.relevantCheckboxes);
          dataForForm = enhancedDataWithCheckboxes;
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
            if (dataForForm && 'explanation' in dataForForm && dataForForm.explanation) {
              analysisText += `\n\nReasoning: ${dataForForm.explanation}`;
            }
            setAnalysisMessage(analysisText);
            console.log("Selected sections:", checkedSections);
            console.log("Selected specific fields:", checkedFields);
            if (dataForForm && 'explanation' in dataForForm && dataForForm.explanation) {
              console.log("Explanation from Gemini:", dataForForm.explanation);
            }
          }
          if (dataForForm.caseType) {
            toast({
              title: 'Case Type Identified',
              description: `Identified as a ${dataForForm.caseType} case. Relevant form sections selected.`,
            });
          }
          if (dataForForm.incidentDefinition) {
            console.log('Incident definition:', dataForForm.incidentDefinition);
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
        dataForForm = {
          ...dataForForm,
          relevantCheckboxes: {
            ...(dataForForm.relevantCheckboxes || {}),
            section301: true
          }
        };
      }
      toast({
        title: 'Form Generation Complete',
        description: 'Form Interrogatories has been generated with your case information.',
      });
      setEnhancedData(dataForForm);
      setIsGenerated(true);

      // Immediately render and save the generated PDF to Supabase Storage (if caseId exists)
      if (caseId) {
        try {
          const pdfBytes = await fillFormInterrogatories(dataForForm, true);
          await uploadPdfToStorage(pdfBytes);
        } catch (saveErr) {
          console.warn('Generated PDF could not be saved to storage:', saveErr);
        }
      }
    } catch (error) {
      console.error('Error generating form:', error);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractedData, caseId, getComplaintFileAsBase64, toast, storedPdfPath]);

  useEffect(() => {
    if (!storageChecked) return;
    if (storedPdfPath) return;
    if (!caseId) return;
    if (extractedData && !isGenerated && !isProcessing && !errorDetails) {
      handleGenerateFormInterrogatories();
    }
  }, [storageChecked, storedPdfPath, caseId, extractedData, isGenerated, isProcessing, errorDetails, handleGenerateFormInterrogatories]);
  
  const handleDownloadPdf = async () => {
    if (!enhancedData && !storedPdfPath) {
      toast({ title: 'Missing Data', description: 'Please generate the form first.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    try {
      const filename = `Form_Interrogatories_${caseId || 'case'}.pdf`;
      if (enhancedData) {
        toast({ title: 'Preparing PDF', description: 'Creating your filled PDF for download...' });
        const pdfBytes = await fillFormInterrogatories(enhancedData, true);
        downloadPdf(pdfBytes, filename);
        // Save latest to storage as well (upsert)
        if (caseId) await uploadPdfToStorage(pdfBytes);
        toast({ title: 'PDF Downloaded', description: 'Form Interrogatories PDF has been downloaded.' });
      } else if (storedPdfPath) {
        // Download from storage
        const { data, error } = await supabase.storage.from('doculaw').download(storedPdfPath);
        if (error || !data) throw error || new Error('No data');
        const arrayBuffer = await data.arrayBuffer();
        downloadPdf(arrayBuffer, filename);
        toast({ title: 'PDF Downloaded', description: 'Downloaded saved Form Interrogatories PDF.' });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
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

  const handlePreviewFilledPdf = async () => {
    if (!enhancedData && !storedPdfPath) {
      toast({ title: 'No Data', description: 'Generate the document first to preview.', variant: 'destructive' });
      return;
    }
    setIsProcessingPreview(true);
    try {
      if (enhancedData) {
        const pdfArrayBuffer = await fillFormInterrogatories(enhancedData, true);
        const pdfBytes = new Uint8Array(pdfArrayBuffer);
        let binary = '';
        pdfBytes.forEach(byte => (binary += String.fromCharCode(byte)));
        const base64String = window.btoa(binary);
        setPdfPreviewUrl(`data:application/pdf;base64,${base64String}`);
      } else if (storedPdfPath) {
        const { data, error } = await supabase.storage.from('doculaw').download(storedPdfPath);
        if (error || !data) throw error || new Error('No data');
        const arrayBuffer = await data.arrayBuffer();
        const pdfBytes = new Uint8Array(arrayBuffer);
        let binary = '';
        pdfBytes.forEach(byte => (binary += String.fromCharCode(byte)));
        const base64String = window.btoa(binary);
        setPdfPreviewUrl(`data:application/pdf;base64,${base64String}`);
      }
      setShowPdfDialog(true);
    } catch (error) {
      console.error("Error generating PDF for preview:", error);
      toast({ title: 'Preview Failed', description: 'Could not generate PDF for preview.', variant: 'destructive' });
    } finally {
      setIsProcessingPreview(false);
    }
  };

  const handleRegenerate = () => {
    setIsGenerated(false);
    setEnhancedData(null);
    setAnalysisMessage(null);
    setErrorDetails(null);
    setPdfPreviewUrl(null);
  setStoredPdfPath(null);
  };

  if (isProcessing) {
    return (
      <Button disabled className="w-full">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Processing...
      </Button>
    );
  }

  if (errorDetails) {
    return (
      <div className="space-y-2 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-red-600">Generation Failed</p>
        <p className="text-xs text-gray-500">{errorDetails}</p>
        <Button onClick={handleDownloadOriginalForm} variant="outline" className="w-full mt-2">
          <Download className="mr-2 h-4 w-4" /> Download Blank Form
        </Button>
        <Button onClick={handleRegenerate} variant="secondary" className="w-full mt-2">
           <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (isGenerated && (enhancedData || storedPdfPath)) {
    return (
      <div className="space-y-2">
        {analysisMessage && enhancedData && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 whitespace-pre-wrap">
            <p className="font-medium mb-1">Analysis Complete:</p>
            {analysisMessage}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button onClick={handlePreviewFilledPdf} variant="outline" className="w-full" >
            <Eye className="mr-2 h-4 w-4" /> Preview PDF
          </Button>
          <Button onClick={handleDownloadPdf} className="w-full">
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button onClick={handleRegenerate} variant="secondary" className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
        </div>
        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600 flex items-start">
          <Info className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 mt-0.5" />
          <span>To get a non-editable version, use the 'Print' function in your PDF viewer after download, or the print icon in the preview window (usually top right).</span>
        </div>

        <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
          <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Form Interrogatories Preview</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden mt-4">
              {pdfPreviewUrl ? (
                <iframe src={pdfPreviewUrl} width="100%" height="100%" title="PDF Preview" className="border rounded" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  <p className="ml-2 text-gray-500">Loading preview...</p>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md flex items-start">
              <Info className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500 mt-0.5" />
              <span>To get a non-editable (flattened) version, use the print icon in the preview window (usually top right) or the 'Print' function in your PDF viewer after downloading.</span>
            </div>
            <div className="flex justify-end items-center mt-2 space-x-2">
              <Button onClick={handleDownloadPdf} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Editable Version
              </Button>
              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  Close
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {checkingStorage ? (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking storage...
        </Button>
      ) : (
        <Button onClick={handleGenerateFormInterrogatories} className="w-full" disabled={isProcessing || (!extractedData && !caseId)}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
          Generate Document
        </Button>
      )}
      <Button onClick={handleDownloadOriginalForm} variant="outline" size="sm" className="w-full text-xs">
        <Download className="mr-2 h-3 w-3" /> Download Blank Judicial Council Form
      </Button>
      {onEditExtractedData && (
         <Button onClick={onEditExtractedData} variant="link" size="sm" className="w-full text-xs">
            Edit Extracted Information
        </Button>
      )}
    </div>
  );
};

export default FormInterrogatoriesPdfButton; 