import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  Download,
  Loader2,
  Sparkles,
  Save,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Imports for fetching case data
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { sendSms, getClientDetails } from "@/integrations/sms/client";

// Import Gemini functions
import {
  extractDiscoveryDocument,
  generateObjectionsAndNarratives,
  generateClientQuestions,
  DiscoveryDocumentData,
  ObjectionData,
  ComplaintInformation,
  genAI,
  geminiModel,
  safetySettings,
} from "@/integrations/gemini/client";
import { AIEditModal } from "@/components/discovery/AIEditModal";

// Narrative interface
interface CaseNarrative {
  id: string;
  title: string;
  description: string;
  strength: 'strong' | 'moderate' | 'weak';
  keyPoints: string[];
  recommendedObjections: string[];
}

// Response suggestion interface
interface ResponseSuggestion {
  questionId: string;
  suggestion: string;
  reasoning: string;
}

// Client response interface
interface ClientResponse {
  questionId: string;
  question: string;
  response: string;
  submittedAt?: string;
}

// Client interface (matching CasePage)
interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  case_type: string | null;
  created_at: string;
  user_id: string | null;
  lawyer_id: string;
  // For display purposes
  fullName?: string;
}

// Define CaseData type (similar to DiscoveryRequestPage)
interface CaseData {
  id: string;
  name: string;
  case_number: string;
  client_name: string; // Assuming a field like this exists or needs to be created
  court: string;
  case_type: string; // Assuming a field like this exists
  user_id: string;
  created_at: string;
  clients?: string[]; // Array of client IDs
  // Add other relevant fields from your 'cases' table
  complaint_document_url?: string;
  complaint_processed?: boolean;
  complaint_data?: Record<string, unknown>; // Using a more specific type than any
}

const DiscoveryResponsePage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  const [activeStep, setActiveStep] = useState(1);
  
  // Multiple discovery document categories
  const [uploadedFiles, setUploadedFiles] = useState<{
    formInterrogatories: File | null;
    requestsForAdmissions: File | null;
    requestsForProduction: File | null;
    specialInterrogatories: File | null;
  }>({
    formInterrogatories: null,
    requestsForAdmissions: null,
    requestsForProduction: null,
    specialInterrogatories: null,
  });
  
  // Extracted data from documents
  const [extractedDiscoveryData, setExtractedDiscoveryData] = useState<{
    formInterrogatories: DiscoveryDocumentData | null;
    requestsForAdmissions: DiscoveryDocumentData | null;
    requestsForProduction: DiscoveryDocumentData | null;
    specialInterrogatories: DiscoveryDocumentData | null;
  }>({
    formInterrogatories: null,
    requestsForAdmissions: null,
    requestsForProduction: null,
    specialInterrogatories: null,
  });
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [caseType, setCaseType] = useState("");
  const [detectedCaseType, setDetectedCaseType] = useState("");
  
  // Client responses and AI-generated content (moved to after client responds)
  const [clientResponses, setClientResponses] = useState<ClientResponse[]>([]);
  const [hasClientResponded, setHasClientResponded] = useState(false);
  const [suggestedObjections, setSuggestedObjections] = useState<ObjectionData[]>([]);
  const [selectedObjections, setSelectedObjections] = useState<string[]>([]);
  const [editingObjectionId, setEditingObjectionId] = useState<string | null>(null);
  const [aiEditingObjectionId, setAiEditingObjectionId] = useState<string | null>(null);
  const [objectionAiModalOpen, setObjectionAiModalOpen] = useState(false);
  
  // New: Store multiple objections per request and selected response type
  const [requestObjections, setRequestObjections] = useState<Record<string, {
    objections: string[];
    selectedObjectionIndex: number | null;
    useDirectAnswer: boolean;
    directAnswer: string;
  }>>({});
  
  const [caseNarratives, setCaseNarratives] = useState<CaseNarrative[]>([]);
  const [selectedNarrative, setSelectedNarrative] = useState<string>("");
  const [responseSuggestions, setResponseSuggestions] = useState<ResponseSuggestion[]>([]);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState("");
  const [editedQuestions, setEditedQuestions] = useState<Array<{
    id: string;
    question: string;
    original: string;
    edited: boolean;
  }>>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [aiEditModalOpen, setAiEditModalOpen] = useState(false);
  const [aiEditingQuestionId, setAiEditingQuestionId] = useState<string | null>(null);
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [bulkAiEditModalOpen, setBulkAiEditModalOpen] = useState(false);
  
  // State for editing individual objection options
  const [editingObjection, setEditingObjection] = useState<{
    requestIndex: number;
    optionIndex: number;
    text: string;
  } | null>(null);
  const [aiEditingObjectionOption, setAiEditingObjectionOption] = useState<{
    requestIndex: number;
    optionIndex: number;
  } | null>(null);
  
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSavedData, setLoadingSavedData] = useState(false);
  const [caseClientDetails, setCaseClientDetails] = useState<Client[]>([]);
  const [isLoadingCaseClients, setIsLoadingCaseClients] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const completionNotifiedRef = useRef(false);

  // Load saved discovery documents and data
  const loadSavedData = useCallback(async () => {
    if (!user || !caseId) return;

    setLoadingSavedData(true);
    try {
      // Load saved discovery documents
      const { data: savedDocs, error: docsError } = await supabase
        .from('discovery_responses')
        .select('*')
        .eq('case_id', caseId)
        .eq('user_id', user.id);

      if (docsError) {
        console.error("Error loading saved documents:", docsError);
      } else if (savedDocs && savedDocs.length > 0) {
        const newExtractedData: typeof extractedDiscoveryData = {
          formInterrogatories: null,
          requestsForAdmissions: null,
          requestsForProduction: null,
          specialInterrogatories: null,
        };

        savedDocs.forEach((doc) => {
          const category = doc.document_category as keyof typeof uploadedFiles;
          newExtractedData[category] = {
            documentType: doc.document_type || '',
            propoundingParty: doc.propounding_party || '',
            respondingParty: doc.responding_party || '',
            caseNumber: doc.case_number,
            setNumber: doc.set_number,
            serviceDate: doc.service_date,
            responseDeadline: doc.response_deadline,
            questions: doc.questions || [],
          };
        });

        setExtractedDiscoveryData(newExtractedData);

        toast({
          title: "Data Loaded",
          description: `Loaded ${savedDocs.length} saved discovery document(s).`,
        });
      }

      // Load saved objections and questions
      const { data: savedResponseData, error: responseDataError } = await supabase
        .from('discovery_response_data')
        .select('*')
        .eq('case_id', caseId)
        .eq('user_id', user.id)
        .single();

      if (responseDataError && responseDataError.code !== 'PGRST116') {
        console.error("Error loading response data:", responseDataError);
      } else if (savedResponseData) {
        if (savedResponseData.case_type) {
          setCaseType(savedResponseData.case_type);
        }
        if (savedResponseData.detected_case_type) {
          setDetectedCaseType(savedResponseData.detected_case_type);
        }
        if (savedResponseData.objections) {
          setSuggestedObjections(savedResponseData.objections);
        }
        if (savedResponseData.selected_objection_ids) {
          setSelectedObjections(savedResponseData.selected_objection_ids);
        }
        if (savedResponseData.client_questions) {
          setEditedQuestions(savedResponseData.client_questions);
        }
        if (savedResponseData.selected_client_id) {
          setSelectedClient(savedResponseData.selected_client_id);
        }
        if (savedResponseData.client_responses) {
          setClientResponses(savedResponseData.client_responses);
        }
        if (savedResponseData.has_client_responded !== undefined) {
          setHasClientResponded(savedResponseData.has_client_responded);
        }
        if (savedResponseData.case_narratives) {
          setCaseNarratives(savedResponseData.case_narratives);
        }
        if (savedResponseData.selected_narrative) {
          setSelectedNarrative(savedResponseData.selected_narrative);
        }
        if (savedResponseData.response_suggestions) {
          setResponseSuggestions(savedResponseData.response_suggestions);
        }
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    } finally {
      setLoadingSavedData(false);
    }
  }, [user, caseId, toast]);

  // Save response data (objections, questions, narratives, etc.)
  const saveResponseData = useCallback(async () => {
    if (!user || !caseId) return;

    try {
      await supabase
        .from('discovery_response_data')
        .upsert({
          case_id: caseId,
          user_id: user.id,
          case_type: caseType,
          detected_case_type: detectedCaseType,
          objections: suggestedObjections,
          selected_objection_ids: selectedObjections,
          client_questions: editedQuestions,
          selected_client_id: selectedClient,
          client_responses: clientResponses,
          has_client_responded: hasClientResponded,
          case_narratives: caseNarratives,
          selected_narrative: selectedNarrative,
          response_suggestions: responseSuggestions,
        }, {
          onConflict: 'case_id'
        });
    } catch (error) {
      console.error("Error saving response data:", error);
    }
  }, [user, caseId, caseType, detectedCaseType, suggestedObjections, selectedObjections, editedQuestions, selectedClient, clientResponses, hasClientResponded, caseNarratives, selectedNarrative, responseSuggestions]);

  // Fetch case details
  const { data: caseData, isLoading: isLoadingCase } = useQuery<CaseData | null>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      if (!user || !caseId) return null;
      
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error("Error fetching case data:", error);
        toast({
          title: "Error",
          description: "Could not fetch case data.",
          variant: "destructive",
        });
        throw error;
      }
      return data;
    },
    enabled: !!user && !!caseId,
  });

  // Function to fetch client details for the case (matching CasePage)
  const fetchCaseClientDetails = useCallback(async () => {
    if (!user || !caseId || !caseData?.clients || caseData.clients.length === 0) {
      setCaseClientDetails([]);
      return;
    }
    
    setIsLoadingCaseClients(true);
    try {
      // Fetch details for all clients assigned to this case
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .in('id', caseData.clients);
      
      if (error) throw error;
      
      // Process clients to include full name for display
      const clientsWithFullName = (data || []).map(client => ({
        ...client,
        fullName: `${client.first_name} ${client.last_name}`
      }));
      
      setCaseClientDetails(clientsWithFullName);
    } catch (error) {
      console.error('Error fetching case client details:', error);
      toast({
        title: "Error",
        description: "Failed to load client information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCaseClients(false);
    }
  }, [user, caseId, caseData?.clients, toast]);

  // Fetch client details when case data changes
  useEffect(() => {
    fetchCaseClientDetails();
  }, [fetchCaseClientDetails]);

  // Fetch client questionnaire and responses
  const { data: activeQuestionnaire, refetch: refetchQuestionnaire } = useQuery({
    queryKey: ['clientQuestionnaire', caseId, selectedClient],
    queryFn: async () => {
      if (!user || !caseId || !selectedClient) return null;
      
      const { data, error } = await supabase
        .from('client_questionnaires')
        .select('*')
        .eq('case_id', caseId)
        .eq('client_id', selectedClient)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching questionnaire:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!user && !!caseId && !!selectedClient,
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  // Update state when questionnaire status changes
  useEffect(() => {
    if (activeQuestionnaire) {
      // Auto-navigate to step 5 if questionnaire exists and we're at early steps
      if (activeStep < 4) {
        setActiveStep(5);
      }
      
      // Load the questions from the questionnaire into editedQuestions
      if (activeQuestionnaire.questions && activeQuestionnaire.questions.length > 0) {
        setEditedQuestions(activeQuestionnaire.questions);
      }
      
      setHasClientResponded(activeQuestionnaire.status === 'completed');
      
      if (activeQuestionnaire.status === 'completed') {
        // Fetch the actual responses
        const fetchResponses = async () => {
          const { data: responses, error } = await supabase
            .from('client_responses')
            .select('*')
            .eq('questionnaire_id', activeQuestionnaire.id);
          
          if (!error && responses) {
            const clientResponsesData: ClientResponse[] = responses.map(r => ({
              questionId: r.question_id,
              question: r.question_text,
              response: r.response_text || '',
              submittedAt: r.updated_at
            }));
            setClientResponses(clientResponsesData);
          }
        };
        
        fetchResponses();

        // Send completion notification to lawyer (one-time)
        if (!completionNotifiedRef.current && user && profile?.phone) {
          completionNotifiedRef.current = true;
          const clientDetail = caseClientDetails?.find(c => c.id === selectedClient);
          sendSms({
            to_phone: profile.phone,
            message_type: 'completion',
            client_id: selectedClient || undefined,
            lawyer_id: user.id,
            case_id: caseId,
            questionnaire_id: activeQuestionnaire.id,
            client_name: clientDetail?.fullName || clientDetail?.first_name || 'Your client',
            case_name: caseData?.name || 'your case',
            question_count: activeQuestionnaire.total_questions,
          }).then(result => {
            if (result.success) console.log('Completion SMS sent to lawyer');
          }).catch(err => console.warn('Completion SMS error:', err));
        }
      }
    }
  }, [activeQuestionnaire]);

  // Load saved data on page load
  useEffect(() => {
    if (caseData && user && caseId) {
      loadSavedData();
    }
  }, [caseData, user, caseId, loadSavedData]);

  // Detect case type from extracted data and case info
  useEffect(() => {
    if (caseData?.case_type) {
      setDetectedCaseType(caseData.case_type);
      if (!caseType) {
        setCaseType(caseData.case_type);
      }
    } else if (caseData?.complaint_data) {
      const complaintData = caseData.complaint_data as unknown as ComplaintInformation;
      if (complaintData?.caseType) {
        setDetectedCaseType(complaintData.caseType);
        if (!caseType) {
          setCaseType(complaintData.caseType);
        }
      }
    }
  }, [caseData, caseType]);

  // Auto-save response data when it changes
  useEffect(() => {
    if (user && caseId && (suggestedObjections.length > 0 || editedQuestions.length > 0 || clientResponses.length > 0)) {
      const timeoutId = setTimeout(() => {
        saveResponseData();
      }, 1000); // Debounce by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [user, caseId, caseType, detectedCaseType, suggestedObjections, selectedObjections, editedQuestions, selectedClient, clientResponses, hasClientResponded, caseNarratives, selectedNarrative, responseSuggestions, saveResponseData]);

  // Loading state
  if (isLoadingCase || loadingSavedData) {
    return (
      <DashboardLayout>
        <div className="p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="h-16 bg-gray-200 rounded mb-6"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-40 bg-gray-200 rounded"></div>
              <div className="h-40 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64 = base64String.split(',')[1] || base64String;
        resolve({ base64, mimeType: file.type });
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Upload document to storage and save to database
  const uploadAndSaveDocument = async (
    file: File,
    category: keyof typeof uploadedFiles,
    extractedData: DiscoveryDocumentData
  ) => {
    if (!user || !caseId) return;

    try {
      // Upload file to storage
      const fileExtension = file.name.split('.').pop();
      const fileName = `${category}_${Date.now()}.${fileExtension}`;
      const filePath = `cases/${caseId}/discovery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('doculaw')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw uploadError;
      }

      // Save document metadata and extracted data to database
      const { error: dbError } = await supabase
        .from('discovery_responses')
        .upsert({
          case_id: caseId,
          user_id: user.id,
          document_category: category,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          document_type: extractedData.documentType,
          propounding_party: extractedData.propoundingParty,
          responding_party: extractedData.respondingParty,
          case_number: extractedData.caseNumber,
          set_number: extractedData.setNumber,
          service_date: extractedData.serviceDate,
          response_deadline: extractedData.responseDeadline,
          questions: extractedData.questions,
        }, {
          onConflict: 'case_id,document_category'
        });

      if (dbError) {
        console.error("Error saving to database:", dbError);
        throw dbError;
      }

      toast({
        title: "Document Saved",
        description: "Discovery document has been saved successfully.",
      });
    } catch (error) {
      console.error("Error in uploadAndSaveDocument:", error);
      toast({
        title: "Save Failed",
        description: "Could not save the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete a saved discovery document
  const deleteDiscoveryDocument = async (category: keyof typeof uploadedFiles) => {
    if (!user || !caseId) return;

    try {
      // Get the document to delete
      const { data: doc, error: fetchError } = await supabase
        .from('discovery_responses')
        .select('file_path')
        .eq('case_id', caseId)
        .eq('document_category', category)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      if (doc?.file_path) {
        await supabase.storage
          .from('doculaw')
          .remove([doc.file_path]);
      }

      // Delete from database
      await supabase
        .from('discovery_responses')
        .delete()
        .eq('case_id', caseId)
        .eq('document_category', category);

      // Clear local state
      setUploadedFiles(prev => ({ ...prev, [category]: null }));
      setExtractedDiscoveryData(prev => ({ ...prev, [category]: null }));

      toast({
        title: "Document Deleted",
        description: "Discovery document has been removed.",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the document.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (category: keyof typeof uploadedFiles) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFiles(prev => ({ ...prev, [category]: file }));
      
      // Automatically extract information from the uploaded document
      setIsExtracting(true);
      try {
        toast({
          title: "Processing Document",
          description: `Extracting information from ${category}...`,
        });
        
        const { base64, mimeType } = await fileToBase64(file);
        
        // Map category to friendly names
        const categoryNames: Record<string, string> = {
          formInterrogatories: "Form Interrogatories",
          requestsForAdmissions: "Requests for Admissions",
          requestsForProduction: "Requests for Production",
          specialInterrogatories: "Special Interrogatories",
        };
        
        const extractedData = await extractDiscoveryDocument(
          base64,
          mimeType,
          categoryNames[category]
        );
        
        setExtractedDiscoveryData(prev => ({
          ...prev,
          [category]: extractedData,
        }));
        
        // Save the document and extracted data
        await uploadAndSaveDocument(file, category, extractedData);
        
        toast({
          title: "Document Saved",
          description: `Successfully extracted and saved ${extractedData.questions.length} questions from ${categoryNames[category]}.`,
        });
      } catch (error) {
        console.error("Error extracting document:", error);
        toast({
          title: "Extraction Failed",
          description: "Could not fully extract information from the document. You can still proceed.",
          variant: "destructive",
        });
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const handleRemoveFile = (category: keyof typeof uploadedFiles) => async () => {
    await deleteDiscoveryDocument(category);
  };

  // Regenerate extraction from existing file
  const handleRegenerateExtraction = async (category: keyof typeof uploadedFiles) => {
    const file = uploadedFiles[category];
    if (!file) {
      toast({
        title: "No File",
        description: "Please upload a file first.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      toast({
        title: "Re-processing Document",
        description: `Re-extracting information from ${category}...`,
      });

      const { base64, mimeType } = await fileToBase64(file);

      const categoryNames: Record<string, string> = {
        formInterrogatories: "Form Interrogatories",
        requestsForAdmissions: "Requests for Admissions",
        requestsForProduction: "Requests for Production",
        specialInterrogatories: "Special Interrogatories",
      };

      const extractedData = await extractDiscoveryDocument(
        base64,
        mimeType,
        categoryNames[category]
      );

      setExtractedDiscoveryData(prev => ({
        ...prev,
        [category]: extractedData,
      }));

      // Update saved data
      await uploadAndSaveDocument(file, category, extractedData);

      toast({
        title: "Re-extraction Complete",
        description: `Successfully re-extracted ${extractedData.questions.length} questions.`,
      });
    } catch (error) {
      console.error("Error re-extracting document:", error);
      toast({
        title: "Re-extraction Failed",
        description: "Could not re-extract information from the document.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
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

  // AI Edit single question
  const handleAiEditQuestion = (questionId: string) => {
    const question = editedQuestions.find(q => q.id === questionId);
    if (question) {
      setAiEditingQuestionId(questionId);
      setAiEditModalOpen(true);
    }
  };

  const handleApplyAiEdit = async (prompt: string) => {
    if (!aiEditingQuestionId) return;
    
    const question = editedQuestions.find(q => q.id === aiEditingQuestionId);
    if (!question) return;
    
    setIsAiEditing(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const result = await model.generateContent(`You are helping a lawyer prepare client-friendly discovery questions.

Original Question: ${question.question}

User's Instruction: ${prompt}

Please modify the question according to the user's instruction while keeping it clear and appropriate for a client to answer. Return only the modified question, nothing else.`);
      const editedText = result.response.text().trim();
      
      if (editedText) {
        setEditedQuestions(prevQuestions => 
          prevQuestions.map(q => 
            q.id === aiEditingQuestionId 
              ? { ...q, question: editedText, edited: true } 
              : q
          )
        );
        
        toast({
          title: "Question Updated",
          description: "AI has successfully edited the question.",
        });
      }
    } catch (error) {
      console.error('Error with AI edit:', error);
      toast({
        title: "AI Edit Failed",
        description: "Could not edit the question with AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiEditing(false);
      setAiEditingQuestionId(null);
    }
  };

  // AI Edit all questions
  const handleBulkAiEdit = async (prompt: string) => {
    setIsAiEditing(true);
    
    try {
      const updatedQuestions = [];
      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      
      for (const question of editedQuestions) {
        const result = await model.generateContent(`You are helping a lawyer prepare client-friendly discovery questions.

Original Question: ${question.question}

User's Instruction: ${prompt}

Please modify the question according to the user's instruction while keeping it clear and appropriate for a client to answer. Return only the modified question, nothing else.`);
        const editedText = result.response.text().trim();
        
        if (editedText) {
          updatedQuestions.push({ ...question, question: editedText, edited: true });
        } else {
          updatedQuestions.push(question);
        }
      }
      
      setEditedQuestions(updatedQuestions);
      
      toast({
        title: "All Questions Updated",
        description: "AI has successfully edited all questions.",
      });
    } catch (error) {
      console.error('Error with bulk AI edit:', error);
      toast({
        title: "AI Edit Failed",
        description: "Could not edit all questions with AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiEditing(false);
    }
  };

  // Regenerate a specific objection with AI
  const handleRegenerateObjection = async (objectionId: string) => {
    const objection = suggestedObjections.find(o => o.id === objectionId);
    if (!objection) return;

    setIsAiEditing(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const result = await model.generateContent(`You are helping a lawyer draft discovery objections.

Question: ${objection.question}

Current Objection: ${objection.objection}

Please generate a NEW alternative objection for this question. Make it legally sound and professionally written. Return only the new objection text, nothing else.`);
      const newObjection = result.response.text().trim();
      
      if (newObjection) {
        setSuggestedObjections(prevObjections => 
          prevObjections.map(o => 
            o.id === objectionId 
              ? { ...o, objection: newObjection } 
              : o
          )
        );
        
        toast({
          title: "Objection Regenerated",
          description: "AI has generated a new objection.",
        });
      }
    } catch (error) {
      console.error('Error regenerating objection:', error);
      toast({
        title: "Regeneration Failed",
        description: "Could not regenerate objection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiEditing(false);
    }
  };

  // AI Edit objection
  const handleAiEditObjection = (objectionId: string) => {
    setAiEditingObjectionId(objectionId);
    setObjectionAiModalOpen(true);
  };

  const handleApplyObjectionAiEdit = async (prompt: string) => {
    if (!aiEditingObjectionId) return;
    
    const objection = suggestedObjections.find(o => o.id === aiEditingObjectionId);
    if (!objection) return;
    
    setIsAiEditing(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const result = await model.generateContent(`You are helping a lawyer draft discovery objections.

Question: ${objection.question}

Current Objection: ${objection.objection}

User's Instruction: ${prompt}

Please modify the objection according to the user's instruction while keeping it legally sound. Return only the modified objection, nothing else.`);
      const editedText = result.response.text().trim();
      
      if (editedText) {
        setSuggestedObjections(prevObjections => 
          prevObjections.map(o => 
            o.id === aiEditingObjectionId 
              ? { ...o, objection: editedText } 
              : o
          )
        );
        
        toast({
          title: "Objection Updated",
          description: "AI has successfully edited the objection.",
        });
      }
    } catch (error) {
      console.error('Error with AI edit:', error);
      toast({
        title: "AI Edit Failed",
        description: "Could not edit the objection with AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiEditing(false);
      setAiEditingObjectionId(null);
    }
  };

  // Generate strategy (objections + narratives) from client responses
  const generateStrategyFromResponses = async () => {
    if (!clientResponses || clientResponses.length === 0) {
      toast({
        title: "No Client Responses",
        description: "Waiting for client to complete the questionnaire.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingStrategy(true);
    try {
      // First, generate narratives if not already generated
      if (caseNarratives.length === 0) {
        const questionsWithResponses = clientResponses.map(cr => ({
          question: cr.question,
          clientResponse: cr.response
        }));
        
        const result = await generateObjectionsAndNarratives(
          questionsWithResponses,
          caseData?.complaint_data as unknown as ComplaintInformation | undefined,
          caseType || detectedCaseType
        );
        
        setCaseNarratives(result.narratives);
        
        // Auto-select the strongest narrative
        const strongestNarrative = result.narratives.find(n => n.strength === 'strong');
        if (strongestNarrative) {
          setSelectedNarrative(strongestNarrative.id);
        } else if (result.narratives.length > 0) {
          setSelectedNarrative(result.narratives[0].id);
        }
        
        toast({
          title: "Narratives Generated",
          description: `Generated ${result.narratives.length} case narrative strategies.`,
        });
        
        setIsGeneratingStrategy(false);
        return;
      }
      
      // Generate multiple objections for each request
      const objectionsData: Record<string, {
        objections: string[];
        selectedObjectionIndex: number | null;
        useDirectAnswer: boolean;
        directAnswer: string;
      }> = {};
      
      // Create the model once outside the loop
      const model = genAI.getGenerativeModel({ 
        model: geminiModel,
        safetySettings 
      });
      
      for (let i = 0; i < clientResponses.length; i++) {
        const response = clientResponses[i];
        const editedQuestion = editedQuestions.find(q => q.id === response.questionId);
        const originalQuestion = editedQuestion?.original || response.question;
        
        // Generate 3 objection options for this request
        const objectionPromises = [1, 2, 3].map(async (optionNum) => {
          let focus, instructions;
          if (optionNum === 1) {
            focus = 'vagueness and ambiguity';
            instructions = 'Focus on terms that are vague, ambiguous, or undefined. Object to unclear language and lack of specific factual predicates.';
          } else if (optionNum === 2) {
            focus = 'prematurity and insufficient discovery';
            instructions = 'Focus on the need for additional discovery, investigation, or expert analysis before responding.';
          } else {
            focus = 'expert opinion and improper characterization';
            instructions = 'Focus on requests that call for expert opinion, legal conclusions, or improper characterizations.';
          }
          
          const prompt = `You are a defense attorney. Draft ONE objection to this Request for Admission.

REQUEST FOR ADMISSION: ${originalQuestion}

CLIENT'S RESPONSE: ${response.response}

CASE STRATEGY: ${caseNarratives.find(n => n.id === selectedNarrative)?.description || ''}

OBJECTION FOCUS: ${focus}
${instructions}

REQUIREMENTS:
1. Start with "Objection."
2. State specific objection grounds clearly
3. Include: "Subject to and without waiving the foregoing objections, Responding Party responds as follows:"
4. Provide a substantive response after that phrase
5. Be professional and legally sound
6. Return ONLY the objection text - no preamble, no options list, no explanations

EXAMPLE FORMAT:
Objection. [Specific grounds]. Subject to and without waiving the foregoing objections, Responding Party responds as follows: [Response]`;

          const result = await model.generateContent(prompt);
          let text = result.response.text().trim();
          
          // Clean up any extra formatting the AI might add
          text = text.replace(/^\*\*Option \d+:.*?\*\*\n*/i, '');
          text = text.replace(/^Okay,.*?:\n*/i, '');
          text = text.replace(/^Here (?:is|are).*?:\n*/i, '');
          text = text.replace(/^\*\*/g, '');
          text = text.replace(/\*\*$/g, '');
          
          return text.trim();
        });
        
        const objections = await Promise.all(objectionPromises);
        
        objectionsData[`request_${i}`] = {
          objections: objections.filter(o => o),
          selectedObjectionIndex: null,
          useDirectAnswer: false,
          directAnswer: ''
        };
      }
      
      setRequestObjections(objectionsData);
      
      toast({
        title: "Objections Generated",
        description: `Generated multiple objection options for ${clientResponses.length} requests.`,
      });
    } catch (error) {
      console.error("Error generating strategy:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate objections from responses.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  // Generate direct answer for a request (admit/deny based on client response)
  const generateDirectAnswer = async (requestIndex: number) => {
    const response = clientResponses[requestIndex];
    const editedQuestion = editedQuestions.find(q => q.id === response.questionId);
    const originalQuestion = editedQuestion?.original || response.question;
    
    setIsAiEditing(true);
    
    try {
      const prompt = `You are a defense attorney drafting responses to Requests for Admissions.

REQUEST FOR ADMISSION: ${originalQuestion}

Client's Response: ${response.response}

Based on the client's response, generate an appropriate direct answer (admit, deny, or cannot admit or deny with explanation).

Format your response as:
"[Admit/Deny/Cannot admit or deny]. [If needed, add brief explanation]"

Keep it concise and legally appropriate.`;

      const model = genAI.getGenerativeModel({ 
        model: geminiModel,
        safetySettings 
      });

      const result = await model.generateContent(prompt);
      const answer = result.response.text().trim();
      
      setRequestObjections(prev => ({
        ...prev,
        [`request_${requestIndex}`]: {
          ...prev[`request_${requestIndex}`],
          directAnswer: answer,
          useDirectAnswer: true,
          selectedObjectionIndex: null
        }
      }));
      
      toast({
        title: "Direct Answer Generated",
        description: "AI has generated a direct response based on client's answer.",
      });
    } catch (error) {
      console.error('Error generating direct answer:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate direct answer.",
        variant: "destructive",
      });
    } finally {
      setIsAiEditing(false);
    }
  };

  // Regenerate a specific objection option
  const regenerateObjectionOption = async (requestIndex: number, optionIndex: number) => {
    const response = clientResponses[requestIndex];
    const editedQuestion = editedQuestions.find(q => q.id === response.questionId);
    const originalQuestion = editedQuestion?.original || response.question;
    
    setIsAiEditing(true);
    
    try {
      let focus, instructions;
      if (optionIndex === 0) {
        focus = 'vagueness and ambiguity';
        instructions = 'Focus on terms that are vague, ambiguous, or undefined. Object to unclear language and lack of specific factual predicates.';
      } else if (optionIndex === 1) {
        focus = 'prematurity and insufficient discovery';
        instructions = 'Focus on the need for additional discovery, investigation, or expert analysis before responding.';
      } else {
        focus = 'expert opinion and improper characterization';
        instructions = 'Focus on requests that call for expert opinion, legal conclusions, or improper characterizations.';
      }
      
      const prompt = `You are a defense attorney. Draft ONE objection to this Request for Admission.

REQUEST FOR ADMISSION: ${originalQuestion}

CLIENT'S RESPONSE: ${response.response}

CASE STRATEGY: ${caseNarratives.find(n => n.id === selectedNarrative)?.description || ''}

OBJECTION FOCUS: ${focus}
${instructions}

REQUIREMENTS:
1. Start with "Objection."
2. State specific objection grounds clearly
3. Include: "Subject to and without waiving the foregoing objections, Responding Party responds as follows:"
4. Provide a substantive response after that phrase
5. Be professional and legally sound
6. Return ONLY the objection text - no preamble, no options list, no explanations`;

      const model = genAI.getGenerativeModel({ 
        model: geminiModel,
        safetySettings 
      });

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      
      // Clean up any extra formatting
      text = text.replace(/^\*\*Option \d+:.*?\*\*\n*/i, '');
      text = text.replace(/^Okay,.*?:\n*/i, '');
      text = text.replace(/^Here (?:is|are).*?:\n*/i, '');
      text = text.replace(/^\*\*/g, '');
      text = text.replace(/\*\*$/g, '');
      
      setRequestObjections(prev => {
        const requestKey = `request_${requestIndex}`;
        const newObjections = [...prev[requestKey].objections];
        newObjections[optionIndex] = text.trim();
        
        return {
          ...prev,
          [requestKey]: {
            ...prev[requestKey],
            objections: newObjections
          }
        };
      });
      
      toast({
        title: "Objection Regenerated",
        description: `Option ${optionIndex + 1} has been regenerated.`,
      });
    } catch (error) {
      console.error('Error regenerating objection:', error);
      toast({
        title: "Regeneration Failed",
        description: error instanceof Error ? error.message : "Could not regenerate objection.",
        variant: "destructive",
      });
    } finally {
      setIsAiEditing(false);
    }
  };

  // Save manually edited objection
  const saveEditedObjection = () => {
    if (!editingObjection) return;
    
    setRequestObjections(prev => {
      const requestKey = `request_${editingObjection.requestIndex}`;
      const newObjections = [...prev[requestKey].objections];
      newObjections[editingObjection.optionIndex] = editingObjection.text;
      
      return {
        ...prev,
        [requestKey]: {
          ...prev[requestKey],
          objections: newObjections
        }
      };
    });
    
    setEditingObjection(null);
    toast({
      title: "Objection Updated",
      description: "Your changes have been saved.",
    });
  };

  // AI Edit individual objection option function
  const handleAiEditObjectionOption = async (prompt: string) => {
    if (!aiEditingObjectionOption) return;
    
    const { requestIndex, optionIndex } = aiEditingObjectionOption;
    const requestKey = `request_${requestIndex}`;
    const currentObjection = requestObjections[requestKey]?.objections[optionIndex];
    
    if (!currentObjection) return;
    
    setIsAiEditing(true);
    
    try {
      const fullPrompt = `You are a defense attorney editing an objection to a Request for Admission.

Current Objection:
${currentObjection}

User's Instruction: ${prompt}

Modify the objection according to the user's instruction while keeping it legally sound and professional.

Return ONLY the modified objection text, no preamble or explanation.`;

      const model = genAI.getGenerativeModel({ 
        model: geminiModel,
        safetySettings 
      });

      const result = await model.generateContent(fullPrompt);
      let text = result.response.text().trim();
      
      // Clean up formatting
      text = text.replace(/^\*\*/g, '');
      text = text.replace(/\*\*$/g, '');
      
      setRequestObjections(prev => {
        const newObjections = [...prev[requestKey].objections];
        newObjections[optionIndex] = text;
        
        return {
          ...prev,
          [requestKey]: {
            ...prev[requestKey],
            objections: newObjections
          }
        };
      });
      
      toast({
        title: "Objection Edited",
        description: "AI has updated the objection based on your instructions.",
      });
    } catch (error) {
      console.error('Error with AI edit:', error);
      toast({
        title: "AI Edit Failed",
        description: error instanceof Error ? error.message : "Could not edit objection.",
        variant: "destructive",
      });
    } finally {
      setIsAiEditing(false);
      setAiEditingObjectionOption(null);
    }
  };

  // Generate client-friendly questions when moving to step 5
  const generateQuestions = async () => {
    if (editedQuestions.length > 0) return; // Already generated
    
    setIsGeneratingQuestions(true);
    try {
      // Combine all questions from all discovery documents
      const allQuestions = Object.values(extractedDiscoveryData)
        .filter(Boolean)
        .flatMap(data => data!.questions);
      
      if (allQuestions.length === 0) {
        toast({
          title: "No Questions Found",
          description: "Please upload and process discovery documents first.",
          variant: "destructive",
        });
        return;
      }
      
      const clientQuestions = await generateClientQuestions(
        allQuestions,
        caseData?.complaint_data as unknown as ComplaintInformation | undefined
      );
      
      setEditedQuestions(clientQuestions);
      
      toast({
        title: "Questions Generated",
        description: `Generated ${clientQuestions.length} client-friendly questions.`,
      });
    } catch (error) {
      console.error("Error generating questions:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate client questions.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleNextStep = async () => {
    // Validate current step
    if (activeStep === 1) {
      // Check if any document has been uploaded OR if we have extracted data from saved documents
      const anyFile = Object.values(uploadedFiles).some(f => f !== null);
      const anyExtracted = Object.values(extractedDiscoveryData).some(d => d !== null);
      
      if (!anyFile && !anyExtracted) {
        toast({
          title: "Missing documents",
          description: "Upload at least one discovery document to continue",
          variant: "destructive",
        });
        return;
      }
      
      // If we have files but no extracted data yet, wait for processing
      if (anyFile && !anyExtracted && !isExtracting) {
        toast({
          title: "Processing Required",
          description: "Please wait for documents to be processed.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (activeStep === 2) {
      if (!caseType) {
        toast({
          title: "Missing information",
          description: "Please select a case type to continue",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (activeStep === 3) {
      // Step 3: Identify Client
      if (!selectedClient) {
        toast({
          title: "Missing selection",
          description: "Please select a client to continue",
          variant: "destructive",
        });
        return;
      }
      
      // Generate questions when moving to step 4
      setActiveStep(4);
      await generateQuestions();
      return;
    }
    
    if (activeStep === 5) {
      // Step 5: Wait for client responses
      if (!hasClientResponded) {
        toast({
          title: "Awaiting Client",
          description: "Please wait for the client to complete the questionnaire.",
          variant: "destructive",
        });
        return;
      }
      
      // Generate strategy when moving to step 6
      setActiveStep(6);
      await generateStrategyFromResponses();
      return;
    }
    
    setActiveStep(prev => Math.min(prev + 1, 7));
  };

  const handlePrevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
  };

  const handleUpdateQuestions = async () => {
    if (!user || !activeQuestionnaire || editedQuestions.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please ensure questions are available to update.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Update the questionnaire with new questions
      const { error } = await supabase
        .from('client_questionnaires')
        .update({
          questions: editedQuestions,
          total_questions: editedQuestions.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeQuestionnaire.id);
      
      if (error) throw error;
      
      // Update the client_responses table with new question texts
      for (const question of editedQuestions) {
        await supabase
          .from('client_responses')
          .update({
            question_text: question.question,
            updated_at: new Date().toISOString()
          })
          .eq('questionnaire_id', activeQuestionnaire.id)
          .eq('question_id', question.id);
      }
      
      setLoading(false);
      toast({
        title: "Questions Updated",
        description: "The questions have been successfully updated.",
        variant: "default",
      });
      
      // Refetch the questionnaire
      await refetchQuestionnaire();
      setActiveStep(5);
    } catch (error) {
      console.error("Error updating questions:", error);
      setLoading(false);
      toast({
        title: "Update Failed",
        description: "Could not update the questions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendToClient = async () => {
    if (!user || !caseId || !selectedClient || editedQuestions.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please ensure client and questions are selected.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Determine the discovery type from uploaded documents
      const discoveryTypes = [];
      if (extractedDiscoveryData.formInterrogatories) discoveryTypes.push('Form Interrogatories');
      if (extractedDiscoveryData.requestsForAdmissions) discoveryTypes.push('Requests for Admissions');
      if (extractedDiscoveryData.requestsForProduction) discoveryTypes.push('Requests for Production');
      if (extractedDiscoveryData.specialInterrogatories) discoveryTypes.push('Special Interrogatories');
      
      // Get the earliest deadline from all documents
      const deadlines = Object.values(extractedDiscoveryData)
        .filter(Boolean)
        .map(d => d?.responseDeadline)
        .filter(Boolean);
      
      const earliestDeadline = deadlines.length > 0 ? deadlines.sort()[0] : null;
      
      // Create the questionnaire
      const { data: questionnaire, error } = await supabase
        .from('client_questionnaires')
        .insert({
          case_id: caseId,
          lawyer_id: user.id,
          client_id: selectedClient,
          title: `${caseData?.name || 'Case'} - ${discoveryTypes.join(', ')}`,
          case_name: caseData?.name || 'Unknown Case',
          case_number: caseData?.case_number,
          questions: editedQuestions,
          discovery_type: discoveryTypes.join(', '),
          response_deadline: earliestDeadline ? new Date(earliestDeadline).toISOString() : null,
          total_questions: editedQuestions.length,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create empty response records for each question
      const responseRecords = editedQuestions.map(q => ({
        questionnaire_id: questionnaire.id,
        question_id: q.id,
        question_text: q.question,
        response_text: null,
      }));
      
      const { error: responsesError } = await supabase
        .from('client_responses')
        .insert(responseRecords);
      
      if (responsesError) {
        console.error("Error creating response records:", responsesError);
        // Continue anyway - records can be created when client starts answering
      }

      // Send SMS notification to client
      try {
        const clientDetails = await getClientDetails(selectedClient);
        if (clientDetails.phone) {
          const loginLink = `${window.location.origin}/client-login`;
          const smsResult = await sendSms({
            to_phone: clientDetails.phone,
            message_type: 'questionnaire_sent',
            client_id: selectedClient,
            lawyer_id: user.id,
            case_id: caseId,
            questionnaire_id: questionnaire.id,
            client_name: clientDetails.first_name || 'there',
            lawyer_name: profile?.name || 'your attorney',
            case_name: caseData?.name || 'your case',
            question_count: editedQuestions.length,
            deadline: earliestDeadline || undefined,
            login_link: loginLink,
          });
          
          if (smsResult.success) {
            console.log('SMS notification sent:', smsResult);
          } else {
            console.warn('SMS notification failed:', smsResult.error);
          }
        } else {
          console.warn('No phone number for client, skipping SMS');
        }
      } catch (smsError) {
        console.warn('SMS notification error (non-blocking):', smsError);
      }
      
      setLoading(false);
      toast({
        title: "Questionnaire Sent",
        description: "The questionnaire has been sent to the client successfully.",
        variant: "default",
      });
      setActiveStep(5); // Move to waiting for responses
    } catch (error) {
      console.error("Error sending questionnaire:", error);
      setLoading(false);
      toast({
        title: "Send Failed",
        description: "Could not send the questionnaire. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Simulate receiving client responses (for testing - remove in production)
  const simulateClientResponses = () => {
    const mockResponses: ClientResponse[] = editedQuestions.map((q, index) => ({
      questionId: q.id,
      question: q.question,
      response: `[Client's detailed response to question ${index + 1}. This would be filled in by the actual client through their portal.]`,
      submittedAt: new Date().toISOString()
    }));
    
    setClientResponses(mockResponses);
    setHasClientResponded(true);
    
    toast({
      title: "Client Responses Received",
      description: `Received ${mockResponses.length} responses from client.`,
    });
  };

  const handleGenerateDocument = async () => {
    if (!clientResponses || clientResponses.length === 0) {
      toast({
        title: "No Client Responses",
        description: "Please wait for client to complete the questionnaire before generating the document.",
        variant: "destructive",
      });
      return;
    }

    if (Object.keys(requestObjections).length === 0) {
      toast({
        title: "No Objections Selected",
        description: "Please generate objections first in Step 6.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Build plain text for copy/download (no equal signs, with tabs)
      let documentContent = `DISCOVERY RESPONSES\n${caseData?.name || 'Case Name'}\nCase Number: ${caseData?.case_number || 'N/A'}\nGenerated: ${new Date().toLocaleDateString()}\n\n`;

      clientResponses.forEach((response, index) => {
        const editedQuestion = editedQuestions.find(q => q.id === response.questionId);
        const requestKey = `request_${index}`;
        const requestData = requestObjections[requestKey];
        
        let selectedResponse = '';
        if (requestData) {
          if (requestData.useDirectAnswer) {
            selectedResponse = requestData.directAnswer;
          } else if (requestData.selectedObjectionIndex !== null) {
            selectedResponse = requestData.objections[requestData.selectedObjectionIndex];
          }
        }
        
        documentContent += `REQUEST FOR ADMISSION NO. ${index + 1}:\n\t${editedQuestion?.original || response.question}\n\nRESPONSE TO REQUEST FOR ADMISSION NO. ${index + 1}:\n\t${selectedResponse || 'No response selected'}\n\n`;
      });

      // Store in state to display
      setGeneratedDocument(documentContent);
      
      toast({
        title: "Document Generated",
        description: "Your discovery response has been prepared.",
      });

      setLoading(false);
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate the document. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
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
              onClick={() => navigate(`/case/${caseId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Draft Discovery Response</h1>
              <p className="text-gray-600 mt-1">Create a comprehensive response to discovery requests for{" "}
                <Link to={`/case/${caseId}`} className="text-blue-600 hover:underline">
                  {caseData?.name || "this case"}
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Progress bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex justify-between mb-2 text-sm">
                <span>Upload</span>
                <span>Client</span>
                <span>Strategy</span>
                <span>Generate</span>
              </div>
              <Progress value={(activeStep / 7) * 100} className="h-2" />
            </div>

            {/* Main content card */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-doculaw-100 text-doculaw-700 font-medium mr-3">
                    {activeStep < 7 ? `0${activeStep}` : <Check className="h-5 w-5" />}
                  </div>
                  <CardTitle>
                    {activeStep === 1 && "Upload Discovery Documents"}
                    {activeStep === 2 && "Check Case Information"}
                    {activeStep === 3 && "Identify the Client"}
                    {activeStep === 4 && "Edit Client Questions"}
                    {activeStep === 5 && "Wait for Client Responses"}
                    {activeStep === 6 && "Review Responses & Generate Strategy"}
                    {activeStep === 7 && "Generate Discovery Response"}
                  </CardTitle>
                </div>
                <CardDescription className="ml-11">
                  {activeStep === 1 && "Upload one or more discovery request documents you received"}
                  {activeStep === 2 && "Confirm the type of case this discovery relates to"}
                  {activeStep === 3 && "Select the client who will answer these questions"}
                  {activeStep === 4 && "Review and edit questions before sending to client"}
                  {activeStep === 5 && "Monitor client questionnaire completion status"}
                  {activeStep === 6 && "AI analyzes responses to generate objections and case narratives"}
                  {activeStep === 7 && "Generate the final discovery response document"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Step 1: Upload Document */}
                {activeStep === 1 && (
                  <div className="space-y-8">
                    <div className="bg-doculaw-50 border border-doculaw-200 rounded-lg p-4 flex items-start">
                      <Sparkles className="h-5 w-5 text-doculaw-600 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-doculaw-800 mb-2">AI-Powered Document Analysis</h3>
                        <p className="text-sm text-gray-700">
                          Upload your discovery request documents and our AI will automatically extract all questions, deadlines, and relevant information. You can upload one or more categories.
                        </p>
                      </div>
                    </div>
                    
                    {isExtracting && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
                        <Loader2 className="h-5 w-5 text-blue-500 mr-3 animate-spin flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Processing document...</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Our AI is extracting questions and metadata from your document.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center"><FileText className="h-4 w-4 mr-2 text-doculaw-500" /> Form Interrogatories</h4>
                          {uploadedFiles.formInterrogatories && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Uploaded</Badge>
                          )}
                        </div>
                        {uploadedFiles.formInterrogatories || extractedDiscoveryData.formInterrogatories ? (
                          <div className="text-sm space-y-2">
                            <p className="font-medium">{uploadedFiles.formInterrogatories?.name || 'Saved Document'}</p>
                            {uploadedFiles.formInterrogatories && (
                              <p className="text-gray-500">{(uploadedFiles.formInterrogatories.size / 1024 / 1024).toFixed(2)} MB</p>
                            )}
                            {extractedDiscoveryData.formInterrogatories && (
                              <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                                <p className="text-xs text-green-800">
                                  <Check className="h-3 w-3 inline mr-1" />
                                  Extracted {extractedDiscoveryData.formInterrogatories.questions.length} questions
                                </p>
                                {extractedDiscoveryData.formInterrogatories.responseDeadline && (
                                  <p className="text-xs text-green-700 mt-1">
                                    Deadline: {extractedDiscoveryData.formInterrogatories.responseDeadline}
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="flex space-x-2">
                              {uploadedFiles.formInterrogatories && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleRegenerateExtraction('formInterrogatories')}
                                  disabled={isExtracting}
                                >
                                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Regenerate
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={handleRemoveFile('formInterrogatories')}>
                                <X className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start space-y-3">
                            <p className="text-sm text-gray-600">Upload the propounding party's form interrogatories.</p>
                            <div>
                              <Button size="sm" onClick={() => document.getElementById('upload-form-interrogatories')?.click()}>Upload File</Button>
                              <input id="upload-form-interrogatories" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange('formInterrogatories')} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center"><FileText className="h-4 w-4 mr-2 text-doculaw-500" /> Requests for Admissions</h4>
                          {uploadedFiles.requestsForAdmissions && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Uploaded</Badge>
                          )}
                        </div>
                        {uploadedFiles.requestsForAdmissions || extractedDiscoveryData.requestsForAdmissions ? (
                          <div className="text-sm space-y-2">
                            <p className="font-medium">{uploadedFiles.requestsForAdmissions?.name || 'Saved Document'}</p>
                            {uploadedFiles.requestsForAdmissions && (
                              <p className="text-gray-500">{(uploadedFiles.requestsForAdmissions.size / 1024 / 1024).toFixed(2)} MB</p>
                            )}
                            {extractedDiscoveryData.requestsForAdmissions && (
                              <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                                <p className="text-xs text-green-800">
                                  <Check className="h-3 w-3 inline mr-1" />
                                  Extracted {extractedDiscoveryData.requestsForAdmissions.questions.length} requests
                                </p>
                                {extractedDiscoveryData.requestsForAdmissions.responseDeadline && (
                                  <p className="text-xs text-green-700 mt-1">
                                    Deadline: {extractedDiscoveryData.requestsForAdmissions.responseDeadline}
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="flex space-x-2">
                              {uploadedFiles.requestsForAdmissions && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleRegenerateExtraction('requestsForAdmissions')}
                                  disabled={isExtracting}
                                >
                                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Regenerate
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={handleRemoveFile('requestsForAdmissions')}>
                                <X className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start space-y-3">
                            <p className="text-sm text-gray-600">Upload the requests for admissions document.</p>
                            <div>
                              <Button size="sm" onClick={() => document.getElementById('upload-requests-admissions')?.click()}>Upload File</Button>
                              <input id="upload-requests-admissions" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange('requestsForAdmissions')} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center"><FileText className="h-4 w-4 mr-2 text-doculaw-500" /> Requests for Production</h4>
                          {uploadedFiles.requestsForProduction && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Uploaded</Badge>
                          )}
                        </div>
                        {uploadedFiles.requestsForProduction || extractedDiscoveryData.requestsForProduction ? (
                          <div className="text-sm space-y-2">
                            <p className="font-medium">{uploadedFiles.requestsForProduction?.name || 'Saved Document'}</p>
                            {uploadedFiles.requestsForProduction && (
                              <p className="text-gray-500">{(uploadedFiles.requestsForProduction.size / 1024 / 1024).toFixed(2)} MB</p>
                            )}
                            {extractedDiscoveryData.requestsForProduction && (
                              <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                                <p className="text-xs text-green-800">
                                  <Check className="h-3 w-3 inline mr-1" />
                                  Extracted {extractedDiscoveryData.requestsForProduction.questions.length} requests
                                </p>
                                {extractedDiscoveryData.requestsForProduction.responseDeadline && (
                                  <p className="text-xs text-green-700 mt-1">
                                    Deadline: {extractedDiscoveryData.requestsForProduction.responseDeadline}
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="flex space-x-2">
                              {uploadedFiles.requestsForProduction && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleRegenerateExtraction('requestsForProduction')}
                                  disabled={isExtracting}
                                >
                                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Regenerate
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={handleRemoveFile('requestsForProduction')}>
                                <X className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start space-y-3">
                            <p className="text-sm text-gray-600">Upload the requests for production document.</p>
                            <div>
                              <Button size="sm" onClick={() => document.getElementById('upload-requests-production')?.click()}>Upload File</Button>
                              <input id="upload-requests-production" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange('requestsForProduction')} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center"><FileText className="h-4 w-4 mr-2 text-doculaw-500" /> Special Interrogatories</h4>
                          {uploadedFiles.specialInterrogatories && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Uploaded</Badge>
                          )}
                        </div>
                        {uploadedFiles.specialInterrogatories || extractedDiscoveryData.specialInterrogatories ? (
                          <div className="text-sm space-y-2">
                            <p className="font-medium">{uploadedFiles.specialInterrogatories?.name || 'Saved Document'}</p>
                            {uploadedFiles.specialInterrogatories && (
                              <p className="text-gray-500">{(uploadedFiles.specialInterrogatories.size / 1024 / 1024).toFixed(2)} MB</p>
                            )}
                            {extractedDiscoveryData.specialInterrogatories && (
                              <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                                <p className="text-xs text-green-800">
                                  <Check className="h-3 w-3 inline mr-1" />
                                  Extracted {extractedDiscoveryData.specialInterrogatories.questions.length} questions
                                </p>
                                {extractedDiscoveryData.specialInterrogatories.responseDeadline && (
                                  <p className="text-xs text-green-700 mt-1">
                                    Deadline: {extractedDiscoveryData.specialInterrogatories.responseDeadline}
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="flex space-x-2">
                              {uploadedFiles.specialInterrogatories && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleRegenerateExtraction('specialInterrogatories')}
                                  disabled={isExtracting}
                                >
                                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Regenerate
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={handleRemoveFile('specialInterrogatories')}>
                                <X className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start space-y-3">
                            <p className="text-sm text-gray-600">Upload the special interrogatories document.</p>
                            <div>
                              <Button size="sm" onClick={() => document.getElementById('upload-special-interrogatories')?.click()}>Upload File</Button>
                              <input id="upload-special-interrogatories" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange('specialInterrogatories')} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Summary of extracted data */}
                    {Object.values(extractedDiscoveryData).some(d => d !== null) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-medium text-blue-900 mb-3">Extraction Summary</h3>
                        <div className="space-y-2">
                          {Object.entries(extractedDiscoveryData).map(([category, data]) => {
                            if (!data) return null;
                            return (
                              <div key={category} className="flex justify-between text-sm">
                                <span className="text-blue-800">{data.documentType}</span>
                                <span className="font-medium text-blue-900">
                                  {data.questions.length} questions
                                  {data.responseDeadline && ` • Due: ${data.responseDeadline}`}
                                </span>
                              </div>
                            );
                          })}
                          <div className="pt-2 mt-2 border-t border-blue-300">
                            <div className="flex justify-between text-sm font-medium">
                              <span className="text-blue-900">Total Questions</span>
                              <span className="text-blue-900">
                                {Object.values(extractedDiscoveryData)
                                  .filter(Boolean)
                                  .reduce((sum, d) => sum + (d?.questions.length || 0), 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">Supported formats: PDF, DOC, DOCX (max 25MB each). You may proceed after uploading any one category; additional categories can be added later.</p>
                  </div>
                )}

                {/* Step 2: Case Information */}
                {activeStep === 2 && (
                  <div className="space-y-6">
                    {/* Show extracted case information */}
                    {caseData && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                        <h3 className="font-medium text-gray-900">Case Information</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Case Name:</span>
                            <p className="font-medium">{caseData.name}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Case Number:</span>
                            <p className="font-medium">{caseData.case_number || 'Not specified'}</p>
                          </div>
                          {caseData.client_name && (
                            <div>
                              <span className="text-gray-500">Client:</span>
                              <p className="font-medium">{caseData.client_name}</p>
                            </div>
                          )}
                          {caseData.court && (
                            <div>
                              <span className="text-gray-500">Court:</span>
                              <p className="font-medium">{caseData.court}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Show discovery document info */}
                        {Object.entries(extractedDiscoveryData).some(([_, data]) => data !== null) && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium text-gray-900 mb-2">Uploaded Discovery Documents</h4>
                            <div className="space-y-2">
                              {Object.entries(extractedDiscoveryData).map(([category, data]) => {
                                if (!data) return null;
                                return (
                                  <div key={category} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">{data.documentType}</span>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      {data.questions.length} questions
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <Label htmlFor="case-type">Case Type</Label>
                      <Select value={caseType} onValueChange={setCaseType}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select case type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Common Case Types</SelectLabel>
                            <SelectItem value="personal injury">Personal Injury</SelectItem>
                            <SelectItem value="medical-malpractice">Medical Malpractice</SelectItem>
                            <SelectItem value="employment">Employment Dispute</SelectItem>
                            <SelectItem value="contract">Contract Dispute</SelectItem>
                            <SelectItem value="family-law">Family Law</SelectItem>
                            <SelectItem value="real-estate">Real Estate</SelectItem>
                            <SelectItem value="immigration">Immigration</SelectItem>
                            <SelectItem value="criminal">Criminal Defense</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectGroup>
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

                {/* Step 3: Identify Client */}
                {activeStep === 3 && (
                  <div className="space-y-6">
                    <div className="bg-doculaw-50 border border-doculaw-200 rounded-lg p-4">
                      <h3 className="font-medium text-doculaw-800 mb-2">Select Client for Questionnaire</h3>
                      <p className="text-sm text-gray-700">
                        Select the client who needs to answer these discovery questions. We'll prepare a questionnaire for them to complete.
                      </p>
                    </div>

                    {isLoadingCaseClients ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-600">Loading clients...</span>
                      </div>
                    ) : caseClientDetails && caseClientDetails.length > 0 ? (
                      <div className="space-y-4">
                        {caseClientDetails.map((client) => {
                          const displayName = client.fullName || `${client.first_name} ${client.last_name}`;
                          
                          return (
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
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{displayName}</p>
                                <p className="text-sm text-gray-500">{client.email}</p>
                              </div>
                              <div>
                                {selectedClient === client.id && (
                                  <CheckCircle2 className="h-5 w-5 text-doculaw-500" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">No clients found for this case.</p>
                        <p className="text-sm text-gray-500 mb-4">
                          Add a client to this case to send them the discovery questionnaire.
                        </p>
                        <Button 
                          variant="outline"
                          onClick={() => navigate(`/case/${caseId}`)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Manage Clients
                        </Button>
                      </div>
                    )}

                    {caseClientDetails && caseClientDetails.length > 0 && (
                      <div className="pt-4 border-t">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate(`/case/${caseId}`)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Manage Clients
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Edit Client Questions */}
                {activeStep === 4 && (
                  <div className="space-y-6">
                    <div className="bg-doculaw-50 border border-doculaw-200 rounded-lg p-4 flex items-start">
                      <Sparkles className="h-5 w-5 text-doculaw-600 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-doculaw-800 mb-2">AI-Simplified Questions</h3>
                        <p className="text-sm text-gray-700">
                          We've converted the legal discovery questions into clear, client-friendly language. Review and edit these questions before sending them to your client.
                        </p>
                      </div>
                    </div>

                    {isGeneratingQuestions ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-12 w-12 animate-spin text-doculaw-500 mx-auto mb-4" />
                          <p className="text-gray-600">Converting questions to client-friendly format...</p>
                          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
                        </div>
                      </div>
                    ) : !editedQuestions || editedQuestions.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No questions available.</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {activeQuestionnaire 
                            ? "Questions are loading from the questionnaire..." 
                            : "Please go back to upload documents and generate questions."}
                        </p>
                        {!activeQuestionnaire && (
                          <Button 
                            onClick={() => setActiveStep(1)}
                            className="mt-4"
                          >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Upload
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto">
                          <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2 border-b">
                            <p className="text-sm text-gray-600">
                              {editedQuestions.length} question{editedQuestions.length !== 1 ? 's' : ''} loaded
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBulkAiEditModalOpen(true)}
                              disabled={isAiEditing}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              AI Edit All Questions
                            </Button>
                          </div>
                          
                          {editedQuestions.map((q, index) => (
                            <div key={q.id} className="rounded-lg border overflow-hidden">
                              {editQuestionId === q.id ? (
                                <div className="p-4">
                                  <Label htmlFor={`edit-${q.id}`} className="font-medium mb-2 block">
                                    Edit Question {index + 1}
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
                                        Question {index + 1}
                                      </label>
                                      {q.edited && (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                          Edited
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-gray-800 mb-2">{q.question}</p>
                                    {q.original !== q.question && (
                                      <details className="mt-2">
                                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                          Show original legal question
                                        </summary>
                                        <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                          {q.original}
                                        </p>
                                      </details>
                                    )}
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
                                      onClick={() => handleAiEditQuestion(q.id)}
                                      disabled={isAiEditing}
                                    >
                                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                                      AI Edit
                                    </Button>
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
                          {activeQuestionnaire ? (
                            <Button 
                              className="bg-doculaw-500 hover:bg-doculaw-600"
                              onClick={handleUpdateQuestions}
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button 
                              className="bg-doculaw-500 hover:bg-doculaw-600"
                              onClick={handleSendToClient}
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <SendIcon className="h-4 w-4 mr-2" />
                                  Send to Client
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 5: Wait for Client Responses */}
                {activeStep === 5 && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex">
                      <CheckCircle2 className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-blue-800">Questionnaire Sent Successfully</p>
                            <p className="text-sm text-blue-700 mt-1">
                              The questionnaire has been sent to {
                                caseClientDetails?.find(c => c.id === selectedClient)?.fullName || 
                                "the client"
                              }. Waiting for their responses...
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveStep(4);
                              // Scroll to top
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Questions
                          </Button>
                        </div>
                      </div>
                    </div>

                    {hasClientResponded ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800">Client Responses Received!</p>
                          <p className="text-sm text-green-700 mt-1">
                            {clientResponses.length} responses received from {caseClientDetails?.find(c => c.id === selectedClient)?.fullName}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-lg border p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium">Response Status</h3>
                            <Badge 
                              variant="outline" 
                              className={
                                activeQuestionnaire?.status === 'in_progress'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }
                            >
                              {activeQuestionnaire?.status === 'in_progress' ? 'In Progress' : 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            The client will receive an email notification with a link to complete the questionnaire. 
                            You'll be notified once they submit their responses.
                          </p>
                          {activeQuestionnaire && (
                            <>
                              <Progress 
                                value={(activeQuestionnaire.completed_questions / activeQuestionnaire.total_questions) * 100} 
                                className="h-2 mb-2" 
                              />
                              <p className="text-xs text-gray-500">
                                {activeQuestionnaire.completed_questions} of {activeQuestionnaire.total_questions} questions answered
                              </p>
                              {activeQuestionnaire.response_deadline && (
                                <p className="text-xs text-amber-600 mt-2">
                                  <AlertCircle className="h-3 w-3 inline mr-1" />
                                  Deadline: {new Date(activeQuestionnaire.response_deadline).toLocaleDateString()}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        {/* Send Reminder SMS */}
                        <div className="border-t pt-4">
                          <Button 
                            onClick={async () => {
                              try {
                                const clientDetails = await getClientDetails(selectedClient);
                                if (!clientDetails.phone) {
                                  toast({ title: "No Phone Number", description: "This client has no phone number on file.", variant: "destructive" });
                                  return;
                                }
                                const loginLink = `${window.location.origin}/client-login`;
                                const remaining = activeQuestionnaire 
                                  ? activeQuestionnaire.total_questions - activeQuestionnaire.completed_questions 
                                  : editedQuestions.length;
                                const result = await sendSms({
                                  to_phone: clientDetails.phone,
                                  message_type: 'reminder',
                                  client_id: selectedClient,
                                  lawyer_id: user?.id,
                                  case_id: caseId,
                                  questionnaire_id: activeQuestionnaire?.id,
                                  client_name: clientDetails.first_name || 'there',
                                  lawyer_name: profile?.name || 'your attorney',
                                  case_name: caseData?.name || 'your case',
                                  question_count: editedQuestions.length,
                                  remaining_questions: remaining,
                                  deadline: activeQuestionnaire?.response_deadline || undefined,
                                  login_link: loginLink,
                                });
                                if (result.success) {
                                  toast({ title: "Reminder Sent", description: `SMS reminder sent to ${clientDetails.first_name || 'the client'}.` });
                                } else {
                                  toast({ title: "Reminder Failed", description: result.error || "Could not send SMS.", variant: "destructive" });
                                }
                              } catch (err) {
                                console.error('Reminder SMS error:', err);
                                toast({ title: "Error", description: "Failed to send reminder.", variant: "destructive" });
                              }
                            }}
                            variant="outline"
                            className="w-full"
                          >
                            <SendIcon className="h-4 w-4 mr-2" />
                            Send Reminder SMS to Client
                          </Button>
                        </div>

                        {/* Simulate button removed for production */}
                      </div>
                    )}

                    {hasClientResponded && (
                      <div className="rounded-lg border overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <h3 className="font-medium">Client Responses Preview</h3>
                        </div>
                        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                          {clientResponses.map((response, index) => (
                            <div key={response.questionId} className="border-b pb-4 last:border-0">
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Question {index + 1}
                              </p>
                              <p className="text-sm text-gray-900 mb-2">{response.question}</p>
                              <div className="bg-blue-50 rounded p-3 text-sm text-gray-800">
                                {response.response}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 6: Review Responses & Generate Strategy */}
                {activeStep === 6 && (
                  <div className="space-y-6">
                    <div className="bg-doculaw-50 border border-doculaw-200 rounded-lg p-4 flex items-start">
                      <Sparkles className="h-5 w-5 text-doculaw-600 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-doculaw-800 mb-2">Review Client Responses & Build Strategy</h3>
                        <p className="text-sm text-gray-700">
                          Review the client's responses, select a case narrative strategy, then generate tailored objections for each discovery request.
                        </p>
                      </div>
                    </div>

                    {/* 1. Client Responses Section */}
                    {clientResponses && clientResponses.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-lg">Client Responses</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const text = clientResponses
                                .map((r, i) => `Question ${i + 1}: ${r.question}\n\nClient's Answer: ${r.response || 'No answer provided'}\n\n---\n\n`)
                                .join('');
                              navigator.clipboard.writeText(text);
                              toast({
                                title: "Copied to Clipboard",
                                description: "All questions and answers have been copied.",
                              });
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy All
                          </Button>
                        </div>
                        
                        <div className="space-y-3 max-h-[400px] overflow-y-auto border rounded-lg">
                          {clientResponses.map((response, index) => {
                            // Find the corresponding edited question to get the original
                            const editedQuestion = editedQuestions.find(q => q.id === response.questionId);
                            
                            return (
                              <div key={response.id} className="border-b last:border-0">
                                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                                  <span className="font-medium text-sm">Question {index + 1}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`Question: ${response.question}\n\nAnswer: ${response.response || 'No answer provided'}`);
                                      toast({
                                        title: "Copied",
                                        description: "Question and answer copied to clipboard.",
                                      });
                                    }}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="p-4 space-y-3">
                                  {/* Original Legal Question */}
                                  {editedQuestion?.original && editedQuestion.original !== response.question && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Original Legal Question:</p>
                                      <div className="text-sm text-gray-700 bg-amber-50 p-3 rounded border border-amber-200">
                                        {editedQuestion.original}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Simplified Question Sent to Client */}
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Question Sent to Client:</p>
                                    <p className="text-sm text-gray-900">{response.question}</p>
                                  </div>
                                  
                                  {/* Client Answer */}
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Client's Answer:</p>
                                    <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded border border-blue-200">
                                      {response.response || <span className="text-gray-400 italic">No answer provided</span>}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. Case Narratives Section */}
                    {isGeneratingStrategy ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-12 w-12 animate-spin text-doculaw-500 mx-auto mb-4" />
                          <p className="text-gray-600">
                            {caseNarratives.length === 0 
                              ? 'Generating case narratives...' 
                              : 'Generating objections...'
                            }
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            {caseNarratives.length === 0 
                              ? 'Analyzing client responses to create strategic narratives' 
                              : `Creating 3 objection options for ${clientResponses.length} requests`
                            }
                          </p>
                        </div>
                      </div>
                    ) : caseNarratives.length > 0 ? (
                      <>
                        {/* Case Narratives */}
                        {caseNarratives.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-lg">Case Narrative Strategies</h3>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={generateStrategyFromResponses}
                                disabled={isGeneratingStrategy}
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Regenerate Narratives
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600">
                              Based on client responses, select a narrative strategy. Then generate objections tailored to this narrative:
                            </p>
                            <div className="space-y-3">
                              {caseNarratives.map((narrative) => (
                                <div 
                                  key={narrative.id}
                                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                                    selectedNarrative === narrative.id
                                      ? 'border-doculaw-500 bg-doculaw-50 ring-2 ring-doculaw-200'
                                      : 'border-gray-200 hover:border-doculaw-200'
                                  }`}
                                  onClick={() => setSelectedNarrative(narrative.id)}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {selectedNarrative === narrative.id && (
                                        <CheckCircle2 className="h-5 w-5 text-doculaw-600" />
                                      )}
                                      <h4 className="font-medium text-gray-900">{narrative.title}</h4>
                                    </div>
                                    <Badge 
                                      variant="outline"
                                      className={
                                        narrative.strength === 'strong'
                                          ? 'bg-green-50 text-green-700 border-green-200'
                                          : narrative.strength === 'moderate'
                                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          : 'bg-gray-50 text-gray-700 border-gray-200'
                                      }
                                    >
                                      {narrative.strength.charAt(0).toUpperCase() + narrative.strength.slice(1)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-3">{narrative.description}</p>
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-600">Key Points:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                      {narrative.keyPoints.map((point, idx) => (
                                        <li key={idx} className="text-xs text-gray-700">{point}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Generate Objections Button - Only show if narrative selected but no objections yet */}
                        {selectedNarrative && Object.keys(requestObjections).length === 0 && (
                          <div className="flex justify-center py-8 border rounded-lg bg-gradient-to-br from-doculaw-50 to-purple-50">
                            <div className="text-center">
                              <CheckCircle2 className="h-12 w-12 text-doculaw-500 mx-auto mb-4" />
                              <h4 className="font-medium text-gray-900 mb-2">Narrative Selected</h4>
                              <p className="text-sm text-gray-600 mb-4 max-w-md">
                                Ready to generate objections tailored to the "{caseNarratives.find(n => n.id === selectedNarrative)?.title}" strategy
                              </p>
                              <Button
                                size="lg"
                                onClick={generateStrategyFromResponses}
                                className="bg-doculaw-500 hover:bg-doculaw-600"
                                disabled={isGeneratingStrategy}
                              >
                                {isGeneratingStrategy ? (
                                  <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    Generating Objections...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-5 w-5 mr-2" />
                                    Generate Objections
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}


                        {/* Objections - Only show after generation */}
                        {selectedNarrative && Object.keys(requestObjections).length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-lg">Generated Objections & Response Options</h3>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={generateStrategyFromResponses}
                                disabled={isGeneratingStrategy}
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Regenerate All
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600">
                              For each request, choose an objection approach OR generate a direct answer based on client's response:
                            </p>
                            <div className="space-y-6">
                              {clientResponses.map((response, index) => {
                                const requestKey = `request_${index}`;
                                const requestData = requestObjections[requestKey];
                                
                                if (!requestData) return null;
                                
                                // Find the original legal question
                                const editedQuestion = editedQuestions.find(q => 
                                  q.question === response.question || 
                                  q.id === `q_${index + 1}`
                                );
                                
                                return (
                                  <div key={requestKey} className="rounded-lg border border-gray-300 overflow-hidden">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b">
                                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Request for Admission No. {index + 1}
                                      </h4>
                                    </div>
                                    
                                    <div className="p-4 space-y-4">
                                      {/* Original Legal Question (Discovery Request) */}
                                      {editedQuestion?.original && (
                                        <div>
                                          <p className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                            REQUEST FOR ADMISSION NO. {index + 1}:
                                          </p>
                                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-gray-900">
                                            {editedQuestion.original}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Question Sent to Client */}
                                      <div>
                                        <p className="text-xs font-medium text-gray-600 mb-2">Question Sent to Client:</p>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
                                          {response.question}
                                        </div>
                                      </div>
                                      
                                      {/* Client Response */}
                                      <div>
                                        <p className="text-xs font-medium text-gray-600 mb-2">Client's Response:</p>
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-gray-900">
                                          {response.response || <span className="text-gray-400 italic">No answer provided</span>}
                                        </div>
                                      </div>
                                      
                                      {/* Response Options */}
                                      <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                          <p className="text-sm font-semibold text-gray-900">Choose Your Response Strategy:</p>
                                          <Badge variant="outline" className="text-xs">
                                            {requestData.useDirectAnswer ? 'Direct Answer' : requestData.selectedObjectionIndex !== null ? `Objection ${requestData.selectedObjectionIndex + 1}` : 'Not Selected'}
                                          </Badge>
                                        </div>
                                        
                                        {/* Objection Options */}
                                        <div className="space-y-2">
                                          <p className="text-xs font-medium text-purple-700 flex items-center gap-1">
                                            <Sparkles className="h-3 w-3" />
                                            Objection Options (Choose One):
                                          </p>
                                          {requestData.objections.map((objection, objIndex) => (
                                            <div 
                                              key={objIndex}
                                              className={`group rounded-lg border-2 transition-all ${
                                                requestData.selectedObjectionIndex === objIndex && !requestData.useDirectAnswer
                                                  ? 'border-purple-500 bg-purple-50 shadow-sm'
                                                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
                                              }`}
                                            >
                                              <div 
                                                className="p-3 cursor-pointer"
                                                onClick={() => {
                                                  setRequestObjections(prev => ({
                                                    ...prev,
                                                    [requestKey]: {
                                                      ...prev[requestKey],
                                                      selectedObjectionIndex: objIndex,
                                                      useDirectAnswer: false
                                                    }
                                                  }));
                                                }}
                                              >
                                                <div className="flex items-start gap-3">
                                                  <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                    requestData.selectedObjectionIndex === objIndex && !requestData.useDirectAnswer
                                                      ? 'border-purple-500 bg-purple-500'
                                                      : 'border-gray-300 group-hover:border-purple-400'
                                                  }`}>
                                                    {requestData.selectedObjectionIndex === objIndex && !requestData.useDirectAnswer && (
                                                      <div className="h-2 w-2 rounded-full bg-white"></div>
                                                    )}
                                                  </div>
                                                  <div className="flex-1">
                                                    <p className="text-xs font-semibold text-purple-900 mb-1.5">
                                                      Objection Option {objIndex + 1}
                                                      {objIndex === 0 && ' - Vagueness/Ambiguity'}
                                                      {objIndex === 1 && ' - Prematurity/Discovery'}
                                                      {objIndex === 2 && ' - Expert Opinion/Characterization'}
                                                    </p>
                                                    {editingObjection?.requestIndex === index && editingObjection?.optionIndex === objIndex ? (
                                                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                                        <Textarea
                                                          value={editingObjection.text}
                                                          onChange={(e) => setEditingObjection({
                                                            ...editingObjection,
                                                            text: e.target.value
                                                          })}
                                                          className="min-h-[150px] text-sm"
                                                        />
                                                        <div className="flex gap-2">
                                                          <Button
                                                            size="sm"
                                                            onClick={saveEditedObjection}
                                                          >
                                                            <Save className="h-3 w-3 mr-1" />
                                                            Save
                                                          </Button>
                                                          <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingObjection(null)}
                                                          >
                                                            Cancel
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{objection}</p>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              {/* Action buttons for this objection option */}
                                              {!editingObjection && (
                                                <div className="px-3 pb-2 flex justify-end gap-2">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingObjection({
                                                        requestIndex: index,
                                                        optionIndex: objIndex,
                                                        text: objection
                                                      });
                                                    }}
                                                  >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Edit
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setAiEditingObjectionOption({
                                                        requestIndex: index,
                                                        optionIndex: objIndex
                                                      });
                                                      setObjectionAiModalOpen(true);
                                                    }}
                                                    disabled={isAiEditing}
                                                  >
                                                    <Sparkles className="h-3 w-3 mr-1" />
                                                    AI Edit
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      regenerateObjectionOption(index, objIndex);
                                                    }}
                                                    disabled={isAiEditing}
                                                  >
                                                    <Sparkles className="h-3 w-3 mr-1" />
                                                    Regenerate
                                                  </Button>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        
                                        {/* Divider */}
                                        <div className="relative py-2">
                                          <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-200"></div>
                                          </div>
                                          <div className="relative flex justify-center text-xs">
                                            <span className="bg-white px-2 text-gray-500 font-medium">OR</span>
                                          </div>
                                        </div>
                                        
                                        {/* Direct Answer Option */}
                                        <div className="space-y-2">
                                          <p className="text-xs font-medium text-green-700 flex items-center gap-1">
                                            <Check className="h-3 w-3" />
                                            Direct Answer (Admit/Deny):
                                          </p>
                                          <div 
                                            className={`group p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                              requestData.useDirectAnswer
                                                ? 'border-green-500 bg-green-50 shadow-sm'
                                                : 'border-gray-200 hover:border-green-300 hover:bg-green-50/30'
                                            }`}
                                            onClick={() => {
                                              if (!requestData.directAnswer) {
                                                // If no answer yet, generate it
                                                generateDirectAnswer(index);
                                              }
                                              setRequestObjections(prev => ({
                                                ...prev,
                                                [requestKey]: {
                                                  ...prev[requestKey],
                                                  useDirectAnswer: true,
                                                  selectedObjectionIndex: null
                                                }
                                              }));
                                            }}
                                          >
                                            <div className="flex items-start gap-3">
                                              <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                requestData.useDirectAnswer
                                                  ? 'border-green-500 bg-green-500'
                                                  : 'border-gray-300 group-hover:border-green-400'
                                              }`}>
                                                {requestData.useDirectAnswer && (
                                                  <div className="h-2 w-2 rounded-full bg-white"></div>
                                                )}
                                              </div>
                                              <div className="flex-1">
                                                <p className="text-xs font-semibold text-green-900 mb-1.5">
                                                  Direct Response Based on Client's Answer
                                                </p>
                                                {requestData.directAnswer ? (
                                                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{requestData.directAnswer}</p>
                                                ) : (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mt-1"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      generateDirectAnswer(index);
                                                    }}
                                                    disabled={isAiEditing}
                                                  >
                                                    {isAiEditing ? (
                                                      <>
                                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                        Generating...
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                                        Generate Direct Answer
                                                      </>
                                                    )}
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="bg-gray-50 px-4 py-3 border-t flex justify-end space-x-2">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        disabled={!requestData.useDirectAnswer && requestData.selectedObjectionIndex === null}
                                        onClick={() => {
                                          const selectedResponse = requestData.useDirectAnswer 
                                            ? requestData.directAnswer 
                                            : requestData.objections[requestData.selectedObjectionIndex || 0];
                                          const text = `REQUEST FOR ADMISSION NO. ${index + 1}:\n${editedQuestion?.original}\n\nRESPONSE TO REQUEST FOR ADMISSION NO. ${index + 1}:\n${selectedResponse}`;
                                          navigator.clipboard.writeText(text);
                                          toast({
                                            title: "Copied",
                                            description: "Request and selected response copied to clipboard.",
                                          });
                                        }}
                                      >
                                        <Copy className="h-3.5 w-3.5 mr-1" />
                                        Copy Selected Response
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}


                        {/* Response Suggestions */}
                        {responseSuggestions.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="font-medium text-lg">Response Suggestions</h3>
                            <p className="text-sm text-gray-600">
                              Recommendations for crafting specific responses:
                            </p>
                            <div className="space-y-3">
                              {responseSuggestions.map((suggestion, idx) => (
                                <div key={idx} className="p-4 rounded-lg border bg-amber-50 border-amber-200">
                                  <p className="text-sm font-medium text-gray-900 mb-2">{suggestion.suggestion}</p>
                                  <p className="text-xs text-gray-700">
                                    <span className="font-medium">Why:</span> {suggestion.reasoning}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Strategy not generated yet.</p>
                        <Button 
                          onClick={generateStrategyFromResponses}
                          className="mt-4"
                          disabled={!hasClientResponded}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Strategy
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 7: Generate Document */}
                {activeStep === 7 && (
                  <div className="space-y-6">
                    {/* Generated Document Display */}
                    {generatedDocument ? (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-800">Discovery Response Generated</p>
                            <p className="text-sm text-green-700 mt-1">
                              Copy and paste the response below into your discovery response document.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-lg">Formatted Discovery Response</h3>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedDocument);
                                toast({
                                  title: "Copied to Clipboard",
                                  description: "The complete discovery response has been copied.",
                                });
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const blob = new Blob([generatedDocument], { type: 'text/plain' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Discovery_Response_${caseData?.case_number || 'Draft'}_${new Date().toISOString().split('T')[0]}.txt`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                                toast({ title: "Downloaded", description: "Document saved." });
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg overflow-hidden bg-white">
                          <div className="p-6 max-h-[600px] overflow-y-auto">
                            {clientResponses.map((response, index) => {
                              const editedQuestion = editedQuestions.find(q => q.id === response.questionId);
                              const requestKey = `request_${index}`;
                              const requestData = requestObjections[requestKey];
                              
                              let selectedResponse = '';
                              if (requestData) {
                                if (requestData.useDirectAnswer) {
                                  selectedResponse = requestData.directAnswer;
                                } else if (requestData.selectedObjectionIndex !== null) {
                                  selectedResponse = requestData.objections[requestData.selectedObjectionIndex];
                                }
                              }
                              
                              return (
                                <div key={`doc_${index}`} className="mb-8 last:mb-0">
                                  <p className="font-bold underline text-gray-900 mb-1">
                                    REQUEST FOR ADMISSION NO. {index + 1}:
                                  </p>
                                  <p className="text-gray-800 pl-8 mb-4">
                                    {editedQuestion?.original || response.question}
                                  </p>
                                  <p className="font-bold underline text-gray-900 mb-1">
                                    RESPONSE TO REQUEST FOR ADMISSION NO. {index + 1}:
                                  </p>
                                  <p className="text-gray-800 pl-8 whitespace-pre-wrap">
                                    {selectedResponse || <span className="text-gray-400 italic">No response selected for this request.</span>}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setGeneratedDocument('');
                            }}
                          >
                            Back to Summary
                          </Button>
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => setSuccessDialogOpen(true)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Finalize Response
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Summary before generation */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-800">Ready to Generate Response</p>
                            <p className="text-sm text-green-700 mt-1">
                              Review your selections and generate the formatted discovery response document.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b">
                            <h3 className="font-medium">Response Summary</h3>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Total Requests for Admission:</span>
                              <Badge>{clientResponses.length}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Responses Selected:</span>
                              <Badge>
                                {Object.values(requestObjections).filter(r => 
                                  r.useDirectAnswer || r.selectedObjectionIndex !== null
                                ).length} of {clientResponses.length}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Using Objections:</span>
                              <Badge variant="secondary">
                                {Object.values(requestObjections).filter(r => 
                                  r.selectedObjectionIndex !== null && !r.useDirectAnswer
                                ).length}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Using Direct Answers:</span>
                              <Badge variant="secondary">
                                {Object.values(requestObjections).filter(r => 
                                  r.useDirectAnswer
                                ).length}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Preview of unselected requests */}
                        {Object.values(requestObjections).some(r => !r.useDirectAnswer && r.selectedObjectionIndex === null) && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-800">Some Requests Have No Response Selected</p>
                              <p className="text-sm text-amber-700 mt-1">
                                Go back to Step 6 to select an objection or direct answer for all requests.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t flex justify-end">
                          <Button 
                            className="bg-doculaw-500 hover:bg-doculaw-600"
                            onClick={handleGenerateDocument}
                            disabled={loading || Object.keys(requestObjections).length === 0}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Response
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
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
                {activeStep < 7 && (
                  <Button 
                    className="bg-doculaw-500 hover:bg-doculaw-600"
                    onClick={handleNextStep}
                    disabled={activeStep === 5 && !hasClientResponded}
                  >
                    {activeStep === 5 && !hasClientResponded ? "Waiting for Client..." : "Next Step"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-6">
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

            {(activeStep === 2 || activeStep === 6) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-medium text-amber-800 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Response Deadline
                </h3>
                <p className="text-sm text-amber-700">
                  Based on the uploaded document, the response deadline is <span className="font-semibold">September 15, 2023</span> (30 days from service date).
                </p>
              </div>
            )}
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
              <p className="text-gray-500">{caseData?.name || "Case Name"} • Case #{caseData?.case_number || "Case Number"}</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Client Information</h3>
              <p className="text-gray-700">
                {caseClientDetails?.find(c => c.id === selectedClient)?.fullName || 
                 caseClientDetails?.find(c => c.id === selectedClient)?.email || 
                 "Client Name"}
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
              <h4 className="font-medium mb-1">{caseData?.name || "Case Name"} - Responses to First Set of Interrogatories</h4>
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

      {/* AI Edit Modal for Single Question */}
      <AIEditModal
        isOpen={aiEditModalOpen}
        onClose={() => {
          setAiEditModalOpen(false);
          setAiEditingQuestionId(null);
        }}
        onConfirm={handleApplyAiEdit}
        originalText={editedQuestions.find(q => q.id === aiEditingQuestionId)?.question || ''}
        loading={isAiEditing}
      />

      {/* AI Edit Modal for All Questions */}
      <AIEditModal
        isOpen={bulkAiEditModalOpen}
        onClose={() => setBulkAiEditModalOpen(false)}
        onConfirm={handleBulkAiEdit}
        originalText={`Editing all ${editedQuestions.length} questions at once`}
        loading={isAiEditing}
      />

      {/* AI Edit Modal for Objections */}
      <AIEditModal
        isOpen={objectionAiModalOpen}
        onClose={() => {
          setObjectionAiModalOpen(false);
          setAiEditingObjectionOption(null);
        }}
        onConfirm={handleAiEditObjectionOption}
        originalText={
          aiEditingObjectionOption 
            ? requestObjections[`request_${aiEditingObjectionOption.requestIndex}`]?.objections[aiEditingObjectionOption.optionIndex] || ''
            : ''
        }
        loading={isAiEditing}
      />
    </DashboardLayout>
  );
};

export default DiscoveryResponsePage;
