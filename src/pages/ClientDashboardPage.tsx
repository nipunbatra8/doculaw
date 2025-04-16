
import { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Send, 
  AlertTriangle, 
  PenLine,
  ClipboardCheck,
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Mock data for client questionnaires
const questionnairesData = [
  { 
    id: "1", 
    title: "Smith v. Johnson - Interrogatories", 
    caseNumber: "CV-2023-12345", 
    status: "In Progress", 
    sentDate: "Aug 5, 2023",
    dueDate: "Aug 20, 2023",
    completedQuestions: 3,
    totalQuestions: 8
  },
  { 
    id: "2", 
    title: "Smith v. Johnson - Request for Production", 
    caseNumber: "CV-2023-12345", 
    status: "Not Started", 
    sentDate: "Aug 10, 2023",
    dueDate: "Aug 25, 2023",
    completedQuestions: 0,
    totalQuestions: 12
  },
  { 
    id: "3", 
    title: "Smith v. Acme Corp - Interrogatories", 
    caseNumber: "CV-2023-67890", 
    status: "Completed", 
    sentDate: "Jul 15, 2023",
    dueDate: "Jul 30, 2023",
    completedQuestions: 6,
    totalQuestions: 6
  },
];

// Mock data for active questionnaire
const activeQuestionnaireData = {
  id: "1",
  title: "Smith v. Johnson - Interrogatories",
  caseNumber: "CV-2023-12345",
  dueDate: "Aug 20, 2023",
  questions: [
    {
      id: "q1",
      text: "Please describe in detail the events leading up to the incident on January 15, 2023.",
      answer: "I was driving northbound on Main Street when the defendant ran a red light at the intersection of Main and Oak Streets, colliding with the passenger side of my vehicle.",
      completed: true
    },
    {
      id: "q2",
      text: "Identify all witnesses who were present at the time of the incident.",
      answer: "Sarah Williams, a pedestrian waiting to cross the street; Officer James Rodriguez who responded to the scene; and my passenger, Michael Thompson.",
      completed: true
    },
    {
      id: "q3",
      text: "Describe all injuries you claim to have sustained as a result of the incident.",
      answer: "Whiplash injuries to my neck, a sprained right wrist, bruised ribs, and persistent headaches. I've also experienced anxiety and difficulty sleeping since the accident.",
      completed: true
    },
    {
      id: "q4",
      text: "Identify all healthcare providers who have treated you for injuries allegedly sustained in the incident.",
      answer: "",
      completed: false
    },
    {
      id: "q5",
      text: "Describe all economic damages you claim to have suffered as a result of the incident.",
      answer: "",
      completed: false
    },
    {
      id: "q6",
      text: "Have you been involved in any other accidents or incidents that resulted in injury in the past 10 years? If so, please describe each incident and any injuries sustained.",
      answer: "",
      completed: false
    },
    {
      id: "q7",
      text: "Identify all medications you are currently taking or have taken for injuries allegedly sustained in the incident.",
      answer: "",
      completed: false
    },
    {
      id: "q8",
      text: "Have you missed any work as a result of the incident? If so, state the dates you missed work and calculate the amount of income lost.",
      answer: "",
      completed: false
    },
  ]
};

const ClientDashboardPage = () => {
  const [activeQuestionnaire, setActiveQuestionnaire] = useState(activeQuestionnaireData);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const currentQuestion = activeQuestionnaire.questions[currentQuestionIndex];
  const completedCount = activeQuestionnaire.questions.filter(q => q.completed).length;
  const completionPercentage = (completedCount / activeQuestionnaire.questions.length) * 100;
  
  const handleAnswerChange = (value: string) => {
    const updatedQuestions = [...activeQuestionnaire.questions];
    updatedQuestions[currentQuestionIndex] = {
      ...updatedQuestions[currentQuestionIndex],
      answer: value,
      completed: value.trim().length > 0
    };
    
    setActiveQuestionnaire({
      ...activeQuestionnaire,
      questions: updatedQuestions
    });
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < activeQuestionnaire.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const handleSubmit = () => {
    const unansweredCount = activeQuestionnaire.questions.filter(q => !q.completed).length;
    
    if (unansweredCount > 0) {
      toast({
        title: "Incomplete questionnaire",
        description: `You have ${unansweredCount} unanswered question${unansweredCount !== 1 ? 's' : ''}. Please complete all questions before submitting.`,
        variant: "destructive",
      });
      return;
    }
    
    setSignatureDialogOpen(true);
  };
  
  const handleSubmitWithSignature = () => {
    if (!signatureName.trim()) {
      toast({
        title: "Signature required",
        description: "Please provide your full name to electronically sign this questionnaire.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setSignatureDialogOpen(false);
    
    // Simulate submission
    setTimeout(() => {
      setLoading(false);
      setSuccessDialogOpen(true);
    }, 1500);
  };

  const jumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client Questionnaires</h1>
            <p className="text-gray-600 mt-1">Complete discovery questionnaires for your cases</p>
          </div>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="active" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Active
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{activeQuestionnaire.title}</CardTitle>
                        <CardDescription>
                          Case: {activeQuestionnaire.caseNumber} • Due: {activeQuestionnaire.dueDate}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        In Progress
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{completedCount} of {activeQuestionnaire.questions.length} questions completed</span>
                        <span>{Math.round(completionPercentage)}%</span>
                      </div>
                      <Progress value={completionPercentage} className="h-2" />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-0">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">
                            Question {currentQuestionIndex + 1} of {activeQuestionnaire.questions.length}
                          </h3>
                          <Badge variant={currentQuestion.completed ? "default" : "outline"}>
                            {currentQuestion.completed ? "Answered" : "Unanswered"}
                          </Badge>
                        </div>
                        <p className="text-gray-700">
                          {currentQuestion.text}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="font-medium text-sm">Your Answer:</label>
                        <Textarea 
                          value={currentQuestion.answer}
                          onChange={(e) => handleAnswerChange(e.target.value)}
                          placeholder="Enter your answer here..."
                          rows={6}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-6">
                    <div>
                      <Button
                        variant="outline"
                        onClick={handlePrevQuestion}
                        disabled={currentQuestionIndex === 0}
                      >
                        Previous
                      </Button>
                    </div>
                    <div>
                      {currentQuestionIndex < activeQuestionnaire.questions.length - 1 ? (
                        <Button 
                          onClick={handleNextQuestion}
                          className="bg-doculaw-500 hover:bg-doculaw-600"
                        >
                          Next Question
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleSubmit}
                          className="bg-doculaw-500 hover:bg-doculaw-600"
                          disabled={loading}
                        >
                          {loading ? (
                            "Submitting..."
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Submit All Answers
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ClipboardCheck className="h-5 w-5 mr-2 text-doculaw-500" />
                      Question Navigator
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                      {activeQuestionnaire.questions.map((question, index) => (
                        <Button
                          key={question.id}
                          variant={index === currentQuestionIndex ? "default" : "outline"}
                          className={`h-10 w-10 p-0 ${
                            question.completed 
                              ? "border-green-300 bg-green-50 text-green-700" 
                              : ""
                          } ${
                            index === currentQuestionIndex && question.completed
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : index === currentQuestionIndex
                              ? "bg-doculaw-500 text-white hover:bg-doculaw-600"
                              : ""
                          }`}
                          onClick={() => jumpToQuestion(index)}
                        >
                          {index + 1}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                      Important Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Answer Truthfully</p>
                      <p className="text-sm text-gray-500">
                        All answers must be truthful and accurate. False information may be subject to penalties under oath.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Be Thorough</p>
                      <p className="text-sm text-gray-500">
                        Provide complete answers to all questions. "I don't know" or "I don't recall" are acceptable if true.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Save Progress</p>
                      <p className="text-sm text-gray-500">
                        Your answers are automatically saved. You can come back and complete this questionnaire later.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-medium text-amber-800 mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Deadline Approaching
                  </h3>
                  <p className="text-sm text-amber-700">
                    Please complete this questionnaire by <span className="font-semibold">{activeQuestionnaire.dueDate}</span> to ensure your attorney has time to prepare responses.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="grid gap-6 md:grid-cols-3">
              {questionnairesData
                .filter(q => q.status === "Completed")
                .map(questionnaire => (
                  <Card key={questionnaire.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{questionnaire.title}</CardTitle>
                          <CardDescription>
                            Case: {questionnaire.caseNumber}
                          </CardDescription>
                        </div>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          Completed
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Sent:</span>
                          <span>{questionnaire.sentDate}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Completed:</span>
                          <span>{questionnaire.dueDate}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Questions:</span>
                          <span>{questionnaire.totalQuestions}</span>
                        </div>
                        <div className="pt-2">
                          <Progress value={100} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                      <Button variant="outline" className="w-full" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Answers
                      </Button>
                    </CardFooter>
                  </Card>
                ))}

              {questionnairesData.filter(q => q.status === "Completed").length === 0 && (
                <div className="col-span-3 text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No completed questionnaires</h3>
                  <p className="text-gray-500">
                    You have not completed any questionnaires yet.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <div className="grid gap-6 md:grid-cols-3">
              {questionnairesData.map(questionnaire => (
                <Card key={questionnaire.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{questionnaire.title}</CardTitle>
                        <CardDescription>
                          Case: {questionnaire.caseNumber}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={questionnaire.status === "Completed" ? "default" : "outline"}
                        className={
                          questionnaire.status === "Completed" 
                            ? "bg-green-100 text-green-700 hover:bg-green-100" 
                            : questionnaire.status === "In Progress"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : ""
                        }
                      >
                        {questionnaire.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Sent:</span>
                        <span>{questionnaire.sentDate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Due:</span>
                        <span>{questionnaire.dueDate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Progress:</span>
                        <span>{questionnaire.completedQuestions} of {questionnaire.totalQuestions}</span>
                      </div>
                      <div className="pt-2">
                        <Progress 
                          value={(questionnaire.completedQuestions / questionnaire.totalQuestions) * 100} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    {questionnaire.status === "Completed" ? (
                      <Button variant="outline" className="w-full" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Answers
                      </Button>
                    ) : (
                      <Button 
                        className="w-full bg-doculaw-500 hover:bg-doculaw-600" 
                        size="sm"
                      >
                        {questionnaire.completedQuestions > 0 ? (
                          <>
                            <PenLine className="h-4 w-4 mr-2" />
                            Continue
                          </>
                        ) : (
                          <>
                            <PenLine className="h-4 w-4 mr-2" />
                            Start
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Signature Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Electronic Signature</DialogTitle>
            <DialogDescription>
              Please provide your full legal name to electronically sign this questionnaire.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signature-name">Full Legal Name</Label>
              <Input 
                id="signature-name"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Enter your full legal name"
              />
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="text-amber-800">
                By typing your name and submitting this questionnaire, you certify that your answers are true and accurate to the best of your knowledge.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={() => setSignatureDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="sm:flex-1 bg-doculaw-500 hover:bg-doculaw-600"
              onClick={handleSubmitWithSignature}
            >
              Sign & Submit
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
              Questionnaire Submitted
            </DialogTitle>
            <DialogDescription>
              Your answers have been successfully submitted to your attorney.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-lg border p-4 bg-gray-50">
              <h4 className="font-medium mb-1">{activeQuestionnaire.title}</h4>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Case: {activeQuestionnaire.caseNumber}</p>
                <p>Submitted: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                <p>Questions Answered: {activeQuestionnaire.questions.length}</p>
              </div>
              <div className="flex items-center text-sm text-green-600 mt-3">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Electronically signed by {signatureName}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              className="w-full bg-doculaw-500 hover:bg-doculaw-600"
              onClick={() => setSuccessDialogOpen(false)}
            >
              Return to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
};

export default ClientDashboardPage;
