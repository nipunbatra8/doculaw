import { useState, useEffect } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
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
  PenLine,
  Eye,
  Loader2,
  FileQuestion,
  Mic,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendSms } from "@/integrations/sms/client";

// Interface for questionnaire from database
interface Questionnaire {
  id: string;
  title: string;
  case_name: string;
  case_number: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  sent_at: string;
  response_deadline: string | null;
  completed_questions: number;
  total_questions: number;
  discovery_type: string | null;
  lawyer_id: string | null;
  case_id: string | null;
  completed_at: string | null;
  questions: Array<{
    id: string;
    question: string;
    original: string;
    edited: boolean;
  }>;
}

interface QuestionResponse {
  id: string;
  question_id: string;
  question_text: string;
  response_text: string | null;
}

// Add type definitions for Speech Recognition API
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Add SpeechRecognition class definition
declare class SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start(): void;
  stop(): void;
  abort(): void;
}

// SpeechGrammarList interface definition
interface SpeechGrammarList {
  length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
}

// SpeechGrammar interface
interface SpeechGrammar {
  src: string;
  weight: number;
}

// Add window interface extensions
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
    __elevenlabsWidgetLoaded?: boolean;
  }
  interface ElevenLabsConvaiProps extends React.HTMLAttributes<HTMLElement> {
    'agent-id'?: string;
    'voice-id'?: string;
  }
  // Allow the custom element in JSX without using a namespace declaration
  interface HTMLElementTagNameMap {
    'elevenlabs-convai': HTMLElement;
  }
}

// Extend JSX IntrinsicElements via declaration merging
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': ElevenLabsConvaiProps;
    }
  }
}

const ClientDashboardPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const completionNotifiedRef = useRef<Record<string, boolean>>({});

  // Get client record for current user
  const { data: clientRecord } = useQuery({
    queryKey: ['clientRecord', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error("Error fetching client record:", error);
        return null;
      }

      return data;
    },
    enabled: !!user,
  });

  // Fetch all questionnaires for this client
  const { data: questionnaires, isLoading: isLoadingQuestionnaires, refetch: refetchQuestionnaires } = useQuery<Questionnaire[]>({
    queryKey: ['clientQuestionnaires', clientRecord?.id],
    queryFn: async () => {
      if (!user || !clientRecord) return [];

      const { data, error } = await supabase
        .from('client_questionnaires')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error("Error fetching questionnaires:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user && !!clientRecord,
  });

  // Fetch responses for the selected questionnaire
  const { data: questionnaireResponses, isLoading: isLoadingResponses, refetch: refetchResponses } = useQuery<QuestionResponse[]>({
    queryKey: ['questionnaireResponses', selectedQuestionnaireId],
    queryFn: async () => {
      if (!selectedQuestionnaireId) return [];

      const { data, error } = await supabase
        .from('client_responses')
        .select('*')
        .eq('questionnaire_id', selectedQuestionnaireId)
        .order('question_id');

      if (error) {
        console.error("Error fetching responses:", error);
        return [];
      }

      // Responses fetched
      return data || [];
    },
    enabled: !!selectedQuestionnaireId,
    refetchInterval: 5000, // Refetch every 5 seconds to keep responses fresh
  });

  // Get active questionnaire
  const activeQuestionnaire = questionnaires?.find(q => q.id === selectedQuestionnaireId);
  const currentQuestion = activeQuestionnaire?.questions?.[currentQuestionIndex];
  const currentResponse = questionnaireResponses?.find(r => r.question_id === currentQuestion?.id);

  // Update currentAnswer when question changes
  useEffect(() => {
    if (currentResponse) {
      setCurrentAnswer(currentResponse.response_text || '');
    }
  }, [currentResponse]);

  // Debug logging
  useEffect(() => {
    if (isModalOpen && activeQuestionnaire) {
      // Debug logging removed for production
    }
  }, [isModalOpen, activeQuestionnaire, currentQuestionIndex, currentQuestion, currentResponse]);

  // Comment out ElevenLabs for now
  /*
  // Load ElevenLabs Convai widget script once
  useEffect(() => {
    if (window.__elevenlabsWidgetLoaded) return;
    const scriptId = 'elevenlabs-convai-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.id = scriptId;
    script.onload = () => { window.__elevenlabsWidgetLoaded = true; };
    document.body.appendChild(script);
  }, []);
  */

  const saveAnswer = async () => {
    if (!currentQuestion || !selectedQuestionnaireId || !currentResponse) return;

    setIsSaving(true);

    try {
      // Save to database
      const { error } = await supabase
        .from('client_responses')
        .update({
          response_text: currentAnswer,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentResponse.id);

      if (error) throw error;

      // Refetch to update progress
      await refetchResponses();
      await refetchQuestionnaires();
    } catch (error) {
      console.error("Error saving response:", error);
      toast({
        title: "Save Failed",
        description: "Could not save your response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMicrophoneClick = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech recognition not supported",
        description: "Your browser doesn't support speech recognition. Try using Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecording(true);

      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = currentAnswer;

      recognition.onresult = (event: any) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Update the answer with current transcription
        setCurrentAnswer(finalTranscript + interimTranscript);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);

        toast({
          title: "Speech recognition error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive",
        });
      };

      recognition.start();

      // Add event to stop recording
      const stopRecording = () => {
        recognition.stop();
        document.removeEventListener('click', stopRecording);
      };

      // Stop recording when clicking elsewhere
      setTimeout(() => {
        document.addEventListener('click', stopRecording, { once: true });
      }, 100);

    } catch (error) {
      console.error('Speech recognition error:', error);
      setIsRecording(false);

      toast({
        title: "Speech recognition failed",
        description: "There was an error initializing speech recognition.",
        variant: "destructive",
      });
    }
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Pending
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

          <TabsContent value="pending" className="mt-6">
            {isLoadingQuestionnaires ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading questionnaires...</span>
              </div>
            ) : questionnaires && questionnaires.filter(q => q.status !== 'completed').length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {questionnaires
                  .filter(q => q.status !== 'completed')
                  .map(questionnaire => (
                    <Card key={questionnaire.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{questionnaire.title}</CardTitle>
                            <CardDescription>
                              Case: {questionnaire.case_number || 'N/A'}
                            </CardDescription>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              questionnaire.status === "in_progress"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : ""
                            }
                          >
                            {questionnaire.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Sent:</span>
                            <span>{new Date(questionnaire.sent_at).toLocaleDateString()}</span>
                          </div>
                          {questionnaire.response_deadline && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Due:</span>
                              <span className={
                                new Date(questionnaire.response_deadline) < new Date()
                                  ? 'text-red-600 font-medium'
                                  : ''
                              }>
                                {new Date(questionnaire.response_deadline).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Progress:</span>
                            <span>{questionnaire.completed_questions} of {questionnaire.total_questions}</span>
                          </div>
                          <div className="pt-2">
                            <Progress
                              value={(questionnaire.completed_questions / questionnaire.total_questions) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t pt-4">
                        <Button
                          className="w-full bg-doculaw-500 hover:bg-doculaw-600"
                          size="sm"
                          onClick={() => {
                            setSelectedQuestionnaireId(questionnaire.id);
                            setCurrentQuestionIndex(0);
                            setIsModalOpen(true);
                          }}
                        >
                          {questionnaire.completed_questions > 0 ? (
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
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileQuestion className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Questionnaires</h3>
                <p className="text-gray-500">You don't have any pending questionnaires at the moment.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {isLoadingQuestionnaires ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading questionnaires...</span>
              </div>
            ) : questionnaires && questionnaires.filter(q => q.status === 'completed').length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {questionnaires
                  .filter(q => q.status === 'completed')
                  .map(questionnaire => (
                    <Card key={questionnaire.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{questionnaire.title}</CardTitle>
                            <CardDescription>
                              Case: {questionnaire.case_number || 'N/A'}
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
                            <span>{new Date(questionnaire.sent_at).toLocaleDateString()}</span>
                          </div>
                          {questionnaire.completed_at && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Completed:</span>
                              <span>{new Date(questionnaire.completed_at).toLocaleDateString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Questions:</span>
                            <span>{questionnaire.total_questions}</span>
                          </div>
                          <div className="pt-2">
                            <Progress value={100} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t pt-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={() => {
                            setSelectedQuestionnaireId(questionnaire.id);
                            setIsModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Answers
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Questionnaires</h3>
                <p className="text-gray-500">Completed questionnaires will appear here.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            {isLoadingQuestionnaires ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading questionnaires...</span>
              </div>
            ) : questionnaires && questionnaires.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {questionnaires.map(questionnaire => (
                  <Card key={questionnaire.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{questionnaire.title}</CardTitle>
                          <CardDescription>
                            Case: {questionnaire.case_number || 'N/A'}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={questionnaire.status === "completed" ? "default" : "outline"}
                          className={
                            questionnaire.status === "completed"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : questionnaire.status === "in_progress"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : ""
                          }
                        >
                          {questionnaire.status === 'completed' ? 'Completed' : questionnaire.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Sent:</span>
                          <span>{new Date(questionnaire.sent_at).toLocaleDateString()}</span>
                        </div>
                        {questionnaire.response_deadline && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Due:</span>
                            <span className={
                              new Date(questionnaire.response_deadline) < new Date()
                                ? 'text-red-600 font-medium'
                                : ''
                            }>
                              {new Date(questionnaire.response_deadline).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Progress:</span>
                          <span>{questionnaire.completed_questions} of {questionnaire.total_questions}</span>
                        </div>
                        <div className="pt-2">
                          <Progress
                            value={(questionnaire.completed_questions / questionnaire.total_questions) * 100}
                            className="h-2"
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                      {questionnaire.status === "completed" ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={() => {
                            setSelectedQuestionnaireId(questionnaire.id);
                            setIsModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Answers
                        </Button>
                      ) : (
                        <Button
                          className="w-full bg-doculaw-500 hover:bg-doculaw-600"
                          size="sm"
                          onClick={() => {
                            setSelectedQuestionnaireId(questionnaire.id);
                            setCurrentQuestionIndex(0);
                            setIsModalOpen(true);
                          }}
                        >
                          {questionnaire.completed_questions > 0 ? (
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
            ) : (
              <div className="text-center py-12">
                <FileQuestion className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Questionnaires Yet</h3>
                <p className="text-gray-500">You haven't received any questionnaires from your attorney.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Questionnaire Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {!activeQuestionnaire ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading questionnaire...</span>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{activeQuestionnaire.title}</DialogTitle>
                <DialogDescription>
                  Case: {activeQuestionnaire.case_number}
                  {activeQuestionnaire.response_deadline && (
                    <> • Due: {new Date(activeQuestionnaire.response_deadline).toLocaleDateString()}</>
                  )}
                </DialogDescription>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{activeQuestionnaire.completed_questions} of {activeQuestionnaire.total_questions} questions answered</span>
                    <span>{Math.round((activeQuestionnaire.completed_questions / activeQuestionnaire.total_questions) * 100)}%</span>
                  </div>
                  <Progress value={(activeQuestionnaire.completed_questions / activeQuestionnaire.total_questions) * 100} className="h-2" />
                </div>
              </DialogHeader>

              {!activeQuestionnaire.questions || activeQuestionnaire.questions.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <p>No questions found in this questionnaire.</p>
                </div>
              ) : !currentQuestion ? (
                <div className="py-12 text-center text-gray-500">
                  <p>Question not found.</p>
                  <p className="text-sm mt-2">Question index: {currentQuestionIndex} of {activeQuestionnaire.questions.length}</p>
                </div>
              ) : !currentResponse ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Loading response...</span>
                </div>
              ) : (
                <div className="space-y-6 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">
                        Question {currentQuestionIndex + 1} of {activeQuestionnaire.total_questions}
                      </h3>
                      <Badge variant={currentResponse.response_text ? "default" : "outline"}>
                        {currentResponse.response_text ? "Answered" : "Unanswered"}
                      </Badge>
                    </div>
                    <p className="text-gray-700">
                      {currentQuestion.question}
                    </p>
                    {currentQuestion.original && currentQuestion.original !== currentQuestion.question && (
                      <details className="mt-3">
                        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 flex items-center">
                          <Info className="h-4 w-4 mr-1" />
                          Show original legal question
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
                          {currentQuestion.original}
                        </div>
                      </details>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-medium text-sm">Your Answer:</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleMicrophoneClick}
                        disabled={isRecording || activeQuestionnaire.status === 'completed'}
                        className={isRecording ? 'bg-red-100 text-red-600 border-red-300' : ''}
                      >
                        {isRecording ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Recording...
                          </>
                        ) : (
                          <>
                            <Mic className="h-4 w-4 mr-2" />
                            Voice Input
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Enter your answer here or use voice input..."
                      rows={8}
                      className="resize-none"
                      disabled={activeQuestionnaire.status === 'completed'}
                    />
                    {isRecording && (
                      <p className="text-sm text-center text-red-600 animate-pulse">
                        Listening... Click anywhere to stop recording.
                      </p>
                    )}
                    {isSaving && (
                      <p className="text-sm text-gray-500">Saving...</p>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (currentQuestionIndex > 0) {
                      await saveAnswer();
                      setCurrentQuestionIndex(currentQuestionIndex - 1);
                    }
                  }}
                  disabled={currentQuestionIndex === 0 || activeQuestionnaire.status === 'completed' || isSaving}
                >
                  Previous
                </Button>
                <Button
                  onClick={async () => {
                    await saveAnswer();

                    if (currentQuestionIndex < (activeQuestionnaire.total_questions - 1)) {
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                    } else if (activeQuestionnaire.status !== 'completed') {
                      // All questions answered - mark questionnaire as completed
                      try {
                        await supabase
                          .from('client_questionnaires')
                          .update({
                            status: 'completed',
                            completed_questions: activeQuestionnaire.total_questions,
                            completed_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                          })
                          .eq('id', activeQuestionnaire.id);

                        // Notify the lawyer via SMS
                        if (activeQuestionnaire.lawyer_id && !completionNotifiedRef.current[activeQuestionnaire.id]) {
                          completionNotifiedRef.current[activeQuestionnaire.id] = true;
                          const { data: lawyerProfile } = await supabase
                            .from('profiles')
                            .select('phone, name')
                            .eq('id', activeQuestionnaire.lawyer_id)
                            .single();

                          if (lawyerProfile?.phone) {
                            const clientName = user?.user_metadata?.full_name || 'Your client';
                            sendSms({
                              to_phone: lawyerProfile.phone,
                              message_type: 'completion',
                              client_id: user?.user_metadata?.client_id,
                              lawyer_id: activeQuestionnaire.lawyer_id,
                              case_id: activeQuestionnaire.case_id,
                              questionnaire_id: activeQuestionnaire.id,
                              client_name: clientName,
                              case_name: activeQuestionnaire.case_name,
                              question_count: activeQuestionnaire.total_questions,
                            }).catch(err => {
                              console.warn('Completion SMS error:', err);
                              completionNotifiedRef.current[activeQuestionnaire.id] = false; // Reset on failure
                            });
                          }
                        }
                      } catch (err) {
                        console.error('Error marking questionnaire complete:', err);
                      }

                      await refetchQuestionnaires();
                      toast({
                        title: "Questionnaire Complete",
                        description: "All responses have been saved. Your attorney has been notified.",
                      });
                      setIsModalOpen(false);
                    } else {
                      setIsModalOpen(false);
                    }
                  }}
                  className="bg-doculaw-500 hover:bg-doculaw-600"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    currentQuestionIndex < (activeQuestionnaire.total_questions - 1) ? 'Save & Continue' : 'Save & Close'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ElevenLabs Conversational AI Widget - Commented out for now
      <elevenlabs-convai
        agent-id="agent_5601k5tm15hvfxsbdj84tjwe07xz"
        className="fixed bottom-4 right-4 z-50"
      ></elevenlabs-convai>
      */}
    </ClientLayout>
  );
};

export default ClientDashboardPage;
