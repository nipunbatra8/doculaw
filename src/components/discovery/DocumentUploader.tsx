import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface DocumentUploaderProps {
  onFileUploaded: (fileUrl: string, fileText: string) => void;
}

const DocumentUploader = ({ onFileUploaded }: DocumentUploaderProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  // Function to extract text from a PDF file
  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      // In a production environment, you'd typically:
      // 1. Send the file to a server endpoint that has PDF parsing libraries
      // 2. Use libraries like pdf.js or a cloud service for text extraction
      
      // For now, we'll create a mock text based on the filename
      // This will be replaced with actual PDF text extraction in production
      
      // Simulate reading the file by getting its name and creating mock content
      const fileName = file.name;
      const caseName = fileName.replace('.pdf', '').replace(/_/g, ' ');
      
      // Mock criminal complaint text
      return `
SUPERIOR COURT OF CALIFORNIA
COUNTY OF LOS ANGELES

THE PEOPLE OF THE STATE OF CALIFORNIA,
                     Plaintiff,
v.
JOHN DOE,
                     Defendant.

CASE NO: CR-2023-12345

CRIMINAL COMPLAINT

Count 1:
On or about January 15, 2023, in the County of Los Angeles, State of California, 
the defendant JOHN DOE did willfully and unlawfully enter a commercial building 
located at 123 Main Street with the intent to commit larceny and any felony, 
in violation of Penal Code Section 459, a FELONY.

Filed this 20th day of January, 2023
District Attorney of Los Angeles County
`;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      return "Error extracting text from document.";
    }
  };
  
  const handleUpload = async () => {
    if (!file || !user) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Start simulating upload progress
      const simulateProgress = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(simulateProgress);
            return 95;
          }
          return prev + 5;
        });
      }, 200);
      
      // Extract text from the PDF
      const extractedText = await extractTextFromPdf(file);
      
      // In a real application, you'd upload the file to Supabase storage
      // For this prototype, we'll use a mock file URL
      const mockFileUrl = `https://storage.example.com/documents/${file.name}`;
      
      // Simulate completion after 3 seconds
      setTimeout(() => {
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
        }, 500);
      }, 3000);
      
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
      setUploading(false);
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
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-doculaw-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
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
              {uploading ? "Uploading..." : "Upload & Generate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
