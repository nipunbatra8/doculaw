
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  FileText, 
  UploadCloud, 
  Info, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DiscoveryRequestPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [requestType, setRequestType] = useState("interrogatories");
  const [requestName, setRequestName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  // Mock case data
  const caseData = {
    id: caseId,
    name: "Smith v. Johnson",
    caseNumber: "CV-2023-12345",
    client: "John Smith",
    court: "County Court",
    type: "Personal Injury"
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadedFile) {
      toast({
        title: "Missing document",
        description: "Please upload a complaint document to continue",
        variant: "destructive",
      });
      return;
    }
    
    if (!requestName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a name for this discovery request",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    // Simulate processing
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setSuccessDialogOpen(true);
    }, 2000);
  };

  const handleSuccessContinue = () => {
    setSuccessDialogOpen(false);
    navigate("/cases");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="mr-2"
              onClick={() => navigate("/cases")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Propound Discovery Request</h1>
              <p className="text-gray-600 mt-1">Create and send a new discovery request</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-doculaw-500" />
                  Discovery Request Details
                </CardTitle>
                <CardDescription>
                  Upload the complaint and provide details about the discovery request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form id="discovery-request-form" onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    {/* Step 1: Upload Complaint */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-doculaw-100 text-doculaw-700 font-medium mr-2">
                          01
                        </div>
                        <Label className="text-lg font-medium">Upload Complaint</Label>
                      </div>
                      <p className="text-sm text-gray-500 ml-10">
                        Upload the complaint document to use as a reference for the discovery request
                      </p>
                      
                      <div 
                        className={`ml-10 mt-4 border-2 border-dashed rounded-lg p-6 ${
                          uploadedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-doculaw-300'
                        } transition-colors duration-200 text-center`}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        {uploadedFile ? (
                          <div className="flex flex-col items-center">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <p className="font-medium">{uploadedFile.name}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm"
                              className="mt-3"
                              onClick={() => setUploadedFile(null)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remove File
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                            <p className="font-medium text-gray-700">
                              Drag and drop your file here or
                            </p>
                            <div className="mt-3">
                              <Button 
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('file-upload')?.click()}
                              >
                                Browse Files
                              </Button>
                              <input 
                                id="file-upload" 
                                type="file" 
                                accept=".pdf,.doc,.docx" 
                                className="hidden"
                                onChange={handleFileChange}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Supports PDF, Word documents up to 10MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Step 2: Request Type and Name */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-doculaw-100 text-doculaw-700 font-medium mr-2">
                          02
                        </div>
                        <Label className="text-lg font-medium">Request Details</Label>
                      </div>
                      <p className="text-sm text-gray-500 ml-10">
                        Specify the type of discovery request and provide a name
                      </p>
                      
                      <div className="ml-10 mt-4 grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="request-type">Request Type</Label>
                          <Select value={requestType} onValueChange={setRequestType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select request type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="interrogatories">Interrogatories</SelectItem>
                                <SelectItem value="document-request">Request for Production of Documents</SelectItem>
                                <SelectItem value="admissions">Request for Admissions</SelectItem>
                                <SelectItem value="deposition">Deposition Notice</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="request-name">Request Name</Label>
                          <Input 
                            id="request-name" 
                            placeholder="e.g., First Set of Interrogatories to Defendant"
                            value={requestName}
                            onChange={(e) => setRequestName(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="special-instructions">Special Instructions (Optional)</Label>
                          <Textarea 
                            id="special-instructions" 
                            placeholder="Any special instructions or notes for this discovery request"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => navigate("/cases")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  form="discovery-request-form"
                  className="bg-doculaw-500 hover:bg-doculaw-600"
                  disabled={loading || success}
                >
                  {loading ? (
                    <>Processing...</>
                  ) : success ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    <>Generate Discovery Request</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-5 w-5 mr-2 text-doculaw-500" />
                  Case Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Case Name</p>
                  <p className="font-medium">{caseData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Case Number</p>
                  <p className="font-medium">{caseData.caseNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium">{caseData.client}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Court</p>
                  <p className="font-medium">{caseData.court}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Case Type</p>
                  <p className="font-medium">{caseData.type}</p>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                    Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Complete Information</p>
                    <p className="text-sm text-gray-500">
                      Ensure your complaint document is complete and contains all relevant information.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Review Generated Requests</p>
                    <p className="text-sm text-gray-500">
                      Always review the AI-generated discovery requests for accuracy and relevance.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Add Custom Instructions</p>
                    <p className="text-sm text-gray-500">
                      Use the special instructions field to provide specific guidance for the AI.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle2 className="h-6 w-6 mr-2" />
              Discovery Request Generated
            </DialogTitle>
            <DialogDescription>
              Your discovery request has been successfully generated and is ready to review.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-lg border p-4 bg-gray-50">
              <h4 className="font-medium mb-2">{requestName}</h4>
              <p className="text-sm text-gray-500 mb-2">
                Generated on {new Date().toLocaleDateString()}
              </p>
              <div className="flex items-center text-sm text-green-600">
                <Check className="h-4 w-4 mr-1" />
                Ready to review and send
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              className="sm:flex-1"
              onClick={() => setSuccessDialogOpen(false)}
            >
              Edit Request
            </Button>
            <Button 
              className="sm:flex-1 bg-doculaw-500 hover:bg-doculaw-600"
              onClick={handleSuccessContinue}
            >
              View in Cases
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DiscoveryRequestPage;
