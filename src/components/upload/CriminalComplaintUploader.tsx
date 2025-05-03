
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, AlertOctagon, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CriminalComplaintUploaderProps {
  caseId: string;
  onComplaintProcessed: (complaintData: any) => void;
}

const CriminalComplaintUploader = ({ caseId, onComplaintProcessed }: CriminalComplaintUploaderProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if the file is a PDF
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file.",
          variant: "destructive"
        });
        return;
      }
      
      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a PDF file to upload.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const nextProgress = prev + 10;
          if (nextProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return nextProgress;
        });
      }, 300);
      
      // In a real implementation, you would upload to storage and process the PDF
      // For now, we'll just simulate successful processing
      setTimeout(() => {
        clearInterval(progressInterval);
        setUploadProgress(100);
        setIsUploading(false);
        
        // Mock data that would come from processing the complaint
        const mockComplaintData = {
          caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
          court: "Superior Court of California",
          filingDate: new Date().toISOString(),
          parties: {
            plaintiff: "People of the State of California",
            defendant: uploadedFile.name.replace('.pdf', '')
          },
          charges: [
            { code: "PC 484", description: "Petty Theft" },
            { code: "PC 459", description: "Burglary" }
          ]
        };
        
        // Update the case with the processed data
        onComplaintProcessed(mockComplaintData);
        
        toast({
          title: "Upload Complete",
          description: "Criminal complaint has been processed successfully.",
          variant: "default"
        });
      }, 3000);
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsUploading(false);
      toast({
        title: "Upload Failed",
        description: "There was an error processing your file.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="border rounded-md p-6 bg-white">
      <div className="flex items-center mb-4">
        <FileText className="h-5 w-5 text-gray-500 mr-2" />
        <h3 className="font-medium">Upload Criminal Complaint</h3>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Upload an Indictment, Information, or Complaint to automatically extract case details.
      </p>
      
      {!uploadedFile ? (
        <div className="border-2 border-dashed border-gray-200 rounded-md p-6 text-center">
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-4">
            Drag and drop your PDF file here, or click to browse
          </p>
          <input
            type="file"
            id="complaint-upload"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('complaint-upload')?.click()}
          >
            Select File
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center p-3 bg-gray-50 rounded-md mb-4">
            <FileText className="h-5 w-5 text-blue-500 mr-3" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
              <p className="text-xs text-gray-500">
                {Math.round(uploadedFile.size / 1024)} KB
              </p>
            </div>
            {isUploading ? (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>
          
          {isUploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-blue-500 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setUploadedFile(null)}
              disabled={isUploading}
            >
              Remove
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Process Document</>
              )}
            </Button>
          </div>
        </div>
      )}
      
      <div className="mt-4 flex items-center text-sm text-amber-600">
        <AlertOctagon className="h-4 w-4 mr-1.5" />
        <span>Required before you can propound discovery requests</span>
      </div>
    </div>
  );
};

export default CriminalComplaintUploader;
