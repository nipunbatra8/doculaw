import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import pdfToText from 'react-pdftotext';
import { extractComplaintInformation } from "@/integrations/gemini/client";

interface DocumentUploaderProps {
  onFileUploaded: (fileUrl: string, fileText: string, fileName: string) => void;
  caseId?: string;
  documentType?: string; // Optional document type for better file naming
}

const DocumentUploader = ({ onFileUploaded, caseId, documentType }: DocumentUploaderProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractionProgress, setExtractionProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check if the file is a PDF
      if (selectedFile.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  // Helper function to determine file type for naming
  const getFileType = (fileName: string, docType?: string) => {
    if (docType) {
      return docType.toLowerCase().replace(/\s+/g, '_');
    }
    
    // Try to determine from filename
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('complaint')) {
      return 'complaint';
    } else if (lowerName.includes('interrogator')) {
      return 'interrogatories';
    } else if (lowerName.includes('admission')) {
      return 'admissions';
    } else if (lowerName.includes('production')) {
      return 'production';
    } else {
      return 'document';
    }
  };
  
  const handleUpload = async () => {
    if (!file || !user) return;
    
    setUploading(true);
    setUploadProgress(0);
    setExtractionProgress(0);
    
    try {
      // Start simulating upload progress for UI
      const simulateProgress = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(simulateProgress);
            return 95;
          }
          return prev + 5;
        });
      }, 200);
      
      // Set extraction progress to indicate it's working
      setExtractionProgress(50);
      
      // Extract text using react-pdftotext
      const extractedText = await pdfToText(file);
      
      // Extraction is complete
      setExtractionProgress(100);
      
      // Upload file to Supabase storage with improved naming
      const timestamp = new Date().getTime();
      const fileType = getFileType(file.name, documentType);
      let filePath = '';
      let displayName = file.name;
      
      if (caseId) {
        // Structure: cases/[case_id]/[file_type]_[timestamp].pdf
        const fileExtension = file.name.split('.').pop() || 'pdf';
        displayName = `${fileType}_${timestamp}.${fileExtension}`;
        filePath = `${user.id}/cases/${caseId}/${displayName}`;
      } else {
        // Fallback for documents not associated with a case yet
        filePath = `${user.id}/documents/${timestamp}_${file.name}`;
      }
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('doculaw')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        throw new Error(`Upload error: ${uploadError.message}`);
      }
      
      // Get a signed URL for the file (valid for 1 hour)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('doculaw')
        .createSignedUrl(filePath, 3600);
      
      if (signedUrlError) {
        throw new Error(`Signed URL error: ${signedUrlError.message}`);
      }
      
      // If this is a complaint document and we have a case ID, process and store the complaint data
      if (fileType === 'complaint' && caseId) {
        try {
          // Extract complaint information using the Gemini API
          const complaintInfo = await extractComplaintInformation(extractedText);
          
          // Save the complaint data directly to the case record
          await supabase
            .from('cases')
            .update({
              complaint_processed: true,
              complaint_data: complaintInfo,
              updated_at: new Date().toISOString()
            })
            .eq('id', caseId);
            
          console.log('Complaint data saved to case record:', complaintInfo);
        } catch (complaintError) {
          console.error('Error processing complaint data:', complaintError);
          // Continue with document upload even if complaint processing fails
        }
      }
      
      // Save document metadata to Supabase - don't save extracted_text anymore
      await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          case_id: caseId || null,
          name: displayName,
          path: filePath,
          url: signedUrlData.signedUrl,
          type: fileType,
          size: file.size,
          created_at: new Date().toISOString()
        });
      
      // Simulate upload completion
      clearInterval(simulateProgress);
      setUploadProgress(100);
      
      toast({
        title: "Upload successful",
        description: "Your document has been uploaded and processed.",
      });
      
      setTimeout(() => {
        // Pass both the file URL and the extracted text to the parent component
        onFileUploaded(signedUrlData.signedUrl, extractedText, displayName);
        setUploading(false);
        setFile(null);
        setUploadProgress(0);
        setExtractionProgress(0);
      }, 500);
      
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({
        title: "Processing failed",
        description: "There was an error uploading or processing your PDF. Please try again.",
        variant: "destructive",
      });
      setUploading(false);
      setExtractionProgress(0);
    }
  };
  
  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-doculaw-500 transition-colors"
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <input
          id="file-upload"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        
        <div className="bg-doculaw-100 p-3 rounded-full mb-4">
          <Upload className="h-6 w-6 text-doculaw-600" />
        </div>
        
        <p className="text-sm font-medium text-gray-700">
          {file ? file.name : "Click to upload or drag and drop"}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PDF (max 10MB)
        </p>
      </div>
      
      {file && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {file.name}
            </span>
            <span className="text-xs text-gray-500">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Uploading</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-doculaw-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              
              {extractionProgress > 0 && (
                <>
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>Extracting text</span>
                    <span>{extractionProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${extractionProgress}%` }}
                    ></div>
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setFile(null)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "Processing..." : "Upload & Process"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
