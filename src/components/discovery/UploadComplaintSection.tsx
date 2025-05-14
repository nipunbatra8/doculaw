import { Card, CardContent } from "@/components/ui/card";
import DocumentUploader from "@/components/discovery/DocumentUploader";

interface UploadComplaintSectionProps {
  onFileUploaded: (fileUrl: string, fileText: string, fileName: string) => void;
  caseId: string | undefined;
  isReplacing: boolean;
  isExtracting: boolean;
}

const UploadComplaintSection = ({ 
  onFileUploaded, 
  caseId, 
  isReplacing, 
  isExtracting 
}: UploadComplaintSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        {isReplacing ? "Replace Complaint Document" : "Step 1: Upload Criminal Complaint"}
      </h2>
      <p className="text-gray-600">
        {isReplacing 
          ? "Upload a new complaint document to replace the existing one." 
          : "Upload the criminal complaint document to generate appropriate discovery requests."}
      </p>
      
      <Card className="mt-6">
        <CardContent className="pt-6 pb-6">
          <DocumentUploader 
            onFileUploaded={onFileUploaded} 
            caseId={caseId}
            documentType="Complaint"
          />
        </CardContent>
      </Card>
      
      {isExtracting && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-700">Extracting information from document...</p>
        </div>
      )}
    </div>
  );
};

export default UploadComplaintSection; 