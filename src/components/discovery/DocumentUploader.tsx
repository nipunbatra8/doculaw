import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import pdfToText from 'react-pdftotext';

interface DocumentUploaderProps {
  onFileUploaded: (fileUrl: string, fileText: string) => void;
}

const DocumentUploader = ({ onFileUploaded }: DocumentUploaderProps) => {
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
      
      // In a real application, you'd upload the file to Supabase storage
      const mockFileUrl = `https://storage.example.com/documents/${file.name}`;
      
      // Simulate upload completion
      clearInterval(simulateProgress);
      setUploadProgress(100);
      
      toast({
        title: "Upload successful",
        description: "Your complaint document has been uploaded and processed.",
      });
      
      setTimeout(() => {
        // Pass both the file URL and the extracted text to the parent component
        onFileUploaded(mockFileUrl, extractedText);
        setUploading(false);
        setFile(null);
        setUploadProgress(0);
        setExtractionProgress(0);
      }, 500);
      
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({
        title: "Processing failed",
        description: "There was an error extracting text from your PDF. Please try again.",
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
