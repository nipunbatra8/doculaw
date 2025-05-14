
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  FileText, 
  UploadCloud, 
  Info, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2,
  AlertTriangle,
  Users,
  SendIcon,
  Edit,
  Eye,
  Download
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Mock objections data
const suggestedObjections = [
  { id: "obj1", text: "Objection to the extent that the request is overly broad and unduly burdensome.", selected: true },
  { id: "obj2", text: "Objection to the extent that the request seeks information protected by attorney-client privilege.", selected: true },
  { id: "obj3", text: "Objection to the extent that the request seeks information protected by the work product doctrine.", selected: true },
  { id: "obj4", text: "Objection to the extent that the request is vague and ambiguous.", selected: false },
  { id: "obj5", text: "Objection to the extent that the request seeks information not relevant to the claims or defenses in this action.", selected: false },
  { id: "obj6", text: "Objection to the extent that the request seeks information not proportional to the needs of the case.", selected: false },
];

// Mock client questions
const clientQuestions = [
  { 
    id: "q1", 
    question: "Please describe in detail the events leading up to the incident on January 15, 2023.", 
    edited: false,
    original: "Please describe in detail the events leading up to the incident on January 15, 2023."
  },
  { 
    id: "q2", 
    question: "Identify all witnesses who were present at the time of the incident.", 
    edited: false,
    original: "Identify all witnesses who were present at the time of the incident."
  },
  { 
    id: "q3", 
    question: "Describe all injuries you claim to have sustained as a result of the incident.", 
    edited: false,
    original: "Describe all injuries you claim to have sustained as a result of the incident."
  },
  { 
    id: "q4", 
    question: "Identify all healthcare providers who have treated you for injuries allegedly sustained in the incident.", 
    edited: false,
    original: "Identify all healthcare providers who have treated you for injuries allegedly sustained in the incident."
  },
  { 
    id: "q5", 
    question: "Describe all economic damages you claim to have suffered as a result of the incident.", 
    edited: false,
    original: "Describe all economic damages you claim to have suffered as a result of the incident."
  },
];

// Mock clients data
const clientsData = [
  { id: "client1", name: "John Smith", email: "john.smith@example.com" },
  { id: "client2", name: "Sarah Johnson", email: "sarah.johnson@example.com" },
  { id: "client3", name: "Michael Williams", email: "m.williams@example.com" },
];

const DiscoveryResponsePage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeStep, setActiveStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [caseType, setCaseType] = useState("");
  const [selectedObjections, setSelectedObjections] = useState<string[]>(
    suggestedObjections.filter(obj => obj.selected).map(obj => obj.id)
  );
  const [selectedClient, setSelectedClient] = useState("");
  const [editedQuestions, setEditedQuestions] = useState(clientQuestions);
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleObjectionToggle = (objectionId: string) => {
    setSelectedObjections(prevSelected => {
      if (prevSelected.includes(objectionId)) {
        return prevSelected.filter(id => id !== objectionId);
      } else {
        return [...prevSelected, objectionId];
      }
    });
  };

  const handleEditQuestion = (questionId: string) => {
    const question = editedQuestions.find(q => q.id === questionId);
    if (question) {
      setEditQuestionId(questionId);
      setEditQuestionText(question.question);
    }
  };

  const handleSaveQuestion = () => {
    if (editQuestionId) {
      setEditedQuestions(prevQuestions => 
        prevQuestions.map(q => 
          q.id === editQuestionId 
            ? { ...q, question: editQuestionText, edited: true } 
            : q
        )
      );
      setEditQuestionId(null);
      setEditQuestionText("");
    }
  };

  const handleCancelEdit = () => {
    setEditQuestionId(null);
    setEditQuestionText("");
  };

  const handleResetQuestion = (questionId: string) => {
    setEditedQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === questionId 
          ? { ...q, question: q.original, edited: false } 
          : q
      )
    );
  };

  const handleNextStep = () => {
    // Validate current step
    if (activeStep === 1 && !uploadedFile) {
      toast({
        title: "Missing document",
        description: "Please upload a discovery document to continue",
        variant: "destructive",
      });
      return;
    }
    
    if (activeStep === 2 && !caseType) {
      toast({
        title: "Missing information",
        description: "Please select a case type to continue",
        variant: "destructive",
      });
      return;
    }
    
    if (activeStep === 4 && !selectedClient) {
      toast({
        title: "Missing selection",
        description: "Please select a client to continue",
        variant: "destructive",
      });
      return;
    }
    
    setActiveStep(prev => Math.min(prev + 1, 6));
  };

  const handlePrevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
  };

  const handleSendToClient = () => {
    setLoading(true);
    
    // Simulate sending to client
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Questionnaire Sent",
        description: "The questionnaire has been sent to the client successfully.",
        variant: "default",
      });
      setActiveStep(6);
    }, 1500);
  };

  const handleGenerateDocument = () => {
    setLoading(true);
    
    // Simulate document generation
    setTimeout(() => {
      setLoading(false);
      setSuccessDialogOpen(true);
    }, 2000);
  };

  const handleSuccessContinue = () => {
    setSuccessDialogOpen(false);
    navigate("/dashboard");
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
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Draft Discovery Response</h1>
              <p className="text-gray-600 mt-1">Create a comprehensive response to discovery requests</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Progress bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex justify-between mb-2 text-sm">
                <span>Upload</span>
                <span>Review</span>
                <span>Generate</span>
              </div>
              <Progress value={(activeStep / 6) * 100} className="h-2" />
            </div>

            {/* Main content card */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-doculaw-100 text-doculaw-700 font-medium mr-3">
                    {activeStep < 7 ? `0${activeStep}` : <Check className="h-5 w-5" />}
                  </div>
                  <CardTitle>
                    {activeStep === 1 && "Upload Discovery Document"}
                    {activeStep === 2 && "Check Case Information"}
                    {activeStep === 3 && "Review Objections"}
                    {activeStep === 4 && "Identify the Client"}
                    {activeStep === 5 && "Edit Client Questions"}
                    {activeStep === 6 && "Generate Discovery Response"}
                  </CardTitle>
                </div>
                <CardDescription className="ml-11">
                  {activeStep === 1 && "Upload the discovery request document you received"}
                  {activeStep === 2 && "Confirm the type of case this discovery relates to"}
                  {activeStep === 3 && "Review and customize standard objections"}
                  {activeStep === 4 && "Select the client who will answer these questions"}
                  {activeStep === 5 && "Review and edit questions before sending to client"}
                  {activeStep === 6 && "Generate the final discovery response document"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Step 1: Upload Document */}
                {activeStep === 1 && (
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 ${
                      uploadedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-doculaw-300'
                    } transition-colors duration-200`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {uploadedFile ? (
                      <div className="flex flex-col items-center">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-1">Document Uploaded</h3>
                        <p className="font-medium text-gray-700 mb-2">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-500 mb-4">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Uploaded {new Date().toLocaleTimeString()}
                        </p>
                        <Button 
                          type="button"
                          variant="outline" 
                          className="mt-2"
                          onClick={() => setUploadedFile(null)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove File
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <UploadCloud className="h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Upload Discovery Document</h3>
                        <p className="text-gray-500 mb-6 max-w-md">
                          Drag and drop the discovery request document here, or click the button below to browse your files
                        </p>
                        <Button 
                          type="button"
                          onClick={() => document.getElementById('discovery-file-upload')?.click()}
                        >
                          Browse Files
                        </Button>
                        <input 
                          id="discovery-file-upload" 
                          type="file" 
                          accept=".pdf,.doc,.docx" 
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <p className="text-xs text-gray-500 mt-4">
                          Supports PDF, Word documents up to 25MB
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Case Information */}
                {activeStep === 2 && (
                  <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-amber-800">
                          Our system has detected this is a <span className="font-semibold">personal injury</span> case. 
                          Please confirm or select the correct case type to ensure appropriate objections and responses.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="case-type">Case Type</Label>
                      <Select value={caseType} onValueChange={setCaseType}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select case type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Common Case Types</SelectLabel>
                            <SelectItem value="personal-injury">Personal Injury</SelectItem>
                            <SelectItem value="medical-malpractice">Medical Malpractice</SelectItem>
                            <SelectItem value="employment">Employment Dispute</SelectItem>
                            <SelectItem value="contract">Contract Dispute</SelectItem>
                            <SelectItem value="family-law">Family Law</SelectItem>
                            <SelectItem value="real-estate">Real Estate</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="discovery-type">Discovery Type</Label>
                      <Select defaultValue="interrogatories">
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interrogatories">Interrogatories</SelectItem>
                          <SelectItem value="document-request">Request for Production</SelectItem>
                          <SelectItem value="admissions">Request for Admissions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="special-instructions">Special Instructions (Optional)</Label>
                      <Textarea 
                        id="special-instructions" 
                        placeholder="Any special considerations or notes for this response"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Objections */}
                {activeStep === 3 && (
                  <div className="space-y-6">
                    <div className="bg-doculaw-50 border border-doculaw-200 rounded-lg p-4">
                      <h3 className="font-medium text-doculaw-800 mb-2">About Standard Objections</h3>
                      <p className="text-sm text-gray-700">
                        Standard objections help preserve your client's rights. We've automatically selected recommended objections based on the case type. You can add or remove objections as needed.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {suggestedObjections.map((objection) => (
                        <div key={objection.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                          <Checkbox 
                            id={objection.id}
                            checked={selectedObjections.includes(objection.id)}
                            onCheckedChange={() => handleObjectionToggle(objection.id)}
                            className="mt-1"
                          />
                          <div className="space-y-1">
                            <Label 
                              htmlFor={objection.id}
                              className="font-medium cursor-pointer"
                            >
                              {objection.text}
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="custom-objection">Custom Objection (Optional)</Label>
                      <Textarea 
                        id="custom-objection" 
                        placeholder="Type any additional custom objections here"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Identify Client */}
                {activeStep === 4 && (
                  <div className="space-y-6">
                    <div className="bg-doculaw-50 border border-doculaw-200 rounded-lg p-4">
                      <h3 className="font-medium text-doculaw-800 mb-2">Select Client for Questionnaire</h3>
                      <p className="text-sm text-gray-700">
                        Select the client who needs to answer these discovery questions. We'll prepare a questionnaire for them to complete.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {clientsData.map((client) => (
                        <div 
                          key={client.id} 
                          className={`flex items-center space-x-4 p-4 rounded-lg border ${
                            selectedClient === client.id 
                              ? 'border-doculaw-500 bg-doculaw-50' 
                              : 'border-gray-200 hover:border-doculaw-200'
                          } cursor-pointer transition-colors`}
                          onClick={() => setSelectedClient(client.id)}
                        >
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            selectedClient === client.id 
                              ? 'bg-doculaw-100 text-doculaw-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {client.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-gray-500">{client.email}</p>
                          </div>
                          <div>
                            {selectedClient === client.id && (
                              <CheckCircle2 className="h-5 w-5 text-doculaw-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t">
                      <Button variant="outline" className="w-full">
                        <Users className="h-4 w-4 mr-2" />
                        Add New Client
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 5: Edit Client Questions */}
                {activeStep === 5 && (
                  <div className="space-y-6">
                    <div className="bg-doculaw-50 border border-doculaw-200 rounded-lg p-4">
                      <h3 className="font-medium text-doculaw-800 mb-2">Review Client Questions</h3>
                      <p className="text-sm text-gray-700">
                        We've extracted and formatted questions from the discovery document. Review and edit these questions before sending them to your client.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {editedQuestions.map((q) => (
                        <div key={q.id} className="rounded-lg border overflow-hidden">
                          {editQuestionId === q.id ? (
                            <div className="p-4">
                              <Label htmlFor={`edit-${q.id}`} className="font-medium mb-2 block">
                                Edit Question
                              </Label>
                              <Textarea 
                                id={`edit-${q.id}`}
                                value={editQuestionText}
                                onChange={(e) => setEditQuestionText(e.target.value)}
                                rows={3}
                                className="mb-3"
                              />
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={handleSaveQuestion}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <label className="font-medium text-sm text-gray-500">
                                    Question {parseInt(q.id.replace('q', ''))}
                                  </label>
                                  {q.edited && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      Edited
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-800">{q.question}</p>
                              </div>
                              <div className="bg-gray-50 px-4 py-2 border-t flex justify-end space-x-2">
                                {q.edited && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleResetQuestion(q.id)}
                                  >
                                    Reset
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditQuestion(q.id)}
                                >
                                  <Edit className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t flex justify-between">
                      <Button variant="outline" onClick={() => setPreviewDialogOpen(true)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Questionnaire
                      </Button>
                      <Button 
                        className="bg-doculaw-500 hover:bg-doculaw-600"
                        onClick={handleSendToClient}
                        disabled={loading}
                      >
                        {loading ? (
                          "Sending..."
                        ) : (
                          <>
                            <SendIcon className="h-4 w-4 mr-2" />
                            Send to Client
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 6: Generate Document */}
                {activeStep === 6 && (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">Questionnaire Sent Successfully</p>
                        <p className="text-sm text-green-700 mt-1">
                          The questionnaire has been sent to {clientsData.find(c => c.id === selectedClient)?.name || "the client"}. You'll be notified when they complete it.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-medium">Discovery Response Status</h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center mr-3">
                                <Check className="h-4 w-4" />
                              </div>
                              <span>Document analyzed</span>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Complete
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center mr-3">
                                <Check className="h-4 w-4" />
                              </div>
                              <span>Objections prepared</span>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Complete
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center mr-3">
                                <Check className="h-4 w-4" />
                              </div>
                              <span>Questionnaire sent</span>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Complete
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mr-3">
                                <AlertCircle className="h-4 w-4" />
                              </div>
                              <span>Client responses</span>
                            </div>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Pending
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mr-3">
                                <FileText className="h-4 w-4" />
                              </div>
                              <span className="text-gray-500">Final document</span>
                            </div>
                            <Badge variant="outline" className="bg-gray-100 text-gray-500">
                              Not Started
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium mb-3">Options</h3>
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <Checkbox id="include-signatures" defaultChecked />
                          <div className="ml-3">
                            <Label htmlFor="include-signatures" className="font-medium">Include Electronic Signatures</Label>
                            <p className="text-sm text-gray-500">
                              Automatically add electronic signatures to the final document
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <Checkbox id="include-certificate" defaultChecked />
                          <div className="ml-3">
                            <Label htmlFor="include-certificate" className="font-medium">Include Certificate of Service</Label>
                            <p className="text-sm text-gray-500">
                              Automatically generate and attach a certificate of service
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                      <Button
                        variant="outline"
                        className="mr-3"
                      >
                        Save Draft
                      </Button>
                      <Button 
                        className="bg-doculaw-500 hover:bg-doculaw-600"
                        onClick={handleGenerateDocument}
                        disabled={loading}
                      >
                        {loading ? (
                          "Processing..."
                        ) : (
                          <>
                            Generate Preliminary Document
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                {activeStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                  >
                    Previous Step
                  </Button>
                )}
                {activeStep === 1 && (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                  >
                    Cancel
                  </Button>
                )}
                <div className="flex-1"></div>
                {activeStep < 5 && (
                  <Button 
                    className="bg-doculaw-500 hover:bg-doculaw-600"
                    onClick={handleNextStep}
                  >
                    Next Step
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-6">
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                  Discovery Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Review Each Question</p>
                  <p className="text-sm text-gray-500">
                    Always review and edit AI-generated questions for clarity and relevance before sending to clients.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Protect Privileged Information</p>
                  <p className="text-sm text-gray-500">
                    Make sure to carefully review objections to protect attorney-client privilege and work product.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Timeline Management</p>
                  <p className="text-sm text-gray-500">
                    Send client questionnaires well before response deadlines to allow time for follow-up.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-medium text-amber-800 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Response Deadline
              </h3>
              <p className="text-sm text-amber-700">
                Based on the uploaded document, the response deadline is <span className="font-semibold">September 15, 2023</span> (30 days from service date).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Questionnaire Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Client Questionnaire Preview</DialogTitle>
            <DialogDescription>
              This is how the questionnaire will appear to your client
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto p-4 border rounded-lg space-y-6">
            <div className="text-center py-4 border-b">
              <img src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png" alt="DocuLaw Logo" className="h-10 w-auto mx-auto mb-2" />
              <h2 className="text-xl font-bold">Discovery Questionnaire</h2>
              <p className="text-gray-500">Smith v. Johnson • Case #CV-2023-12345</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Client Information</h3>
              <p className="text-gray-700">
                {clientsData.find(c => c.id === selectedClient)?.name || "Client Name"}
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium">Instructions</h3>
              <p className="text-gray-700">
                Please answer the following questions truthfully and completely. Your answers will be used to prepare responses to discovery requests in your case. If you're unsure about any question, please indicate that in your response.
              </p>
            </div>
            
            <div className="space-y-6">
              <h3 className="font-medium">Questions</h3>
              {editedQuestions.map((q, index) => (
                <div key={q.id} className="space-y-2 border-b pb-4 last:border-0">
                  <p className="font-medium">Question {index + 1}</p>
                  <p className="text-gray-700">{q.question}</p>
                  <div className="bg-gray-50 border rounded-md p-3 min-h-24 flex items-center justify-center text-gray-400 italic">
                    [Client's answer will appear here]
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close Preview
            </Button>
            <Button className="bg-doculaw-500 hover:bg-doculaw-600" onClick={() => {
              setPreviewDialogOpen(false);
              handleSendToClient();
            }}>
              <SendIcon className="h-4 w-4 mr-2" />
              Send to Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle2 className="h-6 w-6 mr-2" />
              Document Generated
            </DialogTitle>
            <DialogDescription>
              Your preliminary discovery response has been generated successfully.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-lg border p-4 bg-gray-50">
              <h4 className="font-medium mb-1">Smith v. Johnson - Responses to First Set of Interrogatories</h4>
              <p className="text-sm text-gray-500 mb-3">
                Generated on {new Date().toLocaleDateString()}
              </p>
              <div className="flex items-center text-sm text-amber-600 mb-2">
                <AlertCircle className="h-4 w-4 mr-1" />
                Awaiting client responses
              </div>
              <Button size="sm" variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Draft
              </Button>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              className="sm:flex-1"
              onClick={() => setSuccessDialogOpen(false)}
            >
              Continue Editing
            </Button>
            <Button 
              className="sm:flex-1 bg-doculaw-500 hover:bg-doculaw-600"
              onClick={handleSuccessContinue}
            >
              Return to Cases
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DiscoveryResponsePage;
