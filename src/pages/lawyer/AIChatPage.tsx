import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { 
  addDocumentsToVectorStore, 
  getAIResponseWithContext, 
  deleteDocumentVectors 
} from "@/integrations/openai/client";

// Form Interrogatories Integration
import { ComplaintInformation } from "@/integrations/gemini/client";
import FormInterrogatoriesPdfButton from "@/components/discovery/FormInterrogatoriesPdfButton";

// UI Components
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Icons
import { 
  ChevronLeft, 
  Upload, 
  FileText, 
  Send, 
  Bot, 
  User,
  Trash2,
  Download,
  Edit3,
  Plus,
  AlertTriangle,
  FileCheck
} from "lucide-react";

// Components
import DocumentViewer from "@/components/discovery/DocumentViewer";

// Types
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  url?: string;
}

interface Document {
  id: string;
  user_id: string;
  case_id: string | null;
  name: string;
  path: string;
  url: string;
  type: string;
  size: number;
  extracted_text: string | null;
  created_at: string;
  updated_at: string | null;
  fromStorage?: boolean;
}

const AIChatPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI assistant. You can upload files by dragging and dropping them, then ask me questions about them. I can help you analyze documents, edit content, or create new files based on your case materials.\n\n💡 **New Feature**: You can now generate Form Interrogatories (DISC-001) directly from the sidebar or use the "Generate Form Interrogatories" button in the quick actions below. The AI will analyze your case documents to determine which sections apply.',
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Document viewer state
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState<boolean>(false);
  
  // Document deletion state
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");
  
  // Form Interrogatories state
  const [showFormInterrogatories, setShowFormInterrogatories] = useState<boolean>(false);
  const [extractedComplaintData, setExtractedComplaintData] = useState<ComplaintInformation | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Add at the top of the component, after state declarations
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch case details
  const { data: caseData } = useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      if (!user || !caseId) return null;
      
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!caseId
  });

  // Fetch case documents
  const { data: caseDocuments, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['case-documents', caseId],
    queryFn: async () => {
      if (!user || !caseId) return [];
      
      try {
        // Fetch database records first
        const { data: dbDocuments, error: dbError } = await supabase
          .from('documents')
          .select('*')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false });
        
        if (dbError) throw dbError;
        
        // Also check the storage bucket directly
        const { data: storageData, error: storageError } = await supabase.storage
          .from('doculaw')
          .list(`${user.id}/cases/${caseId}`, {
            sortBy: { column: 'name', order: 'desc' }
          });
        
        if (storageError) throw storageError;
        
        // Create document objects for storage files that aren't in the database
        const dbPaths = new Set((dbDocuments || []).map(doc => doc.path));
        const storageDocuments: Document[] = [];
        
        for (const item of storageData || []) {
          if (!item.id || item.id === '.emptyFolderPlaceholder') continue;
          
          const filePath = `${user.id}/cases/${caseId}/${item.name}`;
          
          // Skip if this file is already in the database
          if (dbPaths.has(filePath)) continue;
          
          // Get a signed URL for the file
          const signedUrl = await getSignedUrl(filePath);
          
          if (!signedUrl) continue;
          
          // Create a document object
          storageDocuments.push({
            id: item.id,
            user_id: user.id,
            case_id: caseId,
            name: item.name,
            path: filePath,
            url: signedUrl,
            type: getFileType(item.name),
            size: item.metadata?.size || 0,
            extracted_text: null,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: null,
            fromStorage: true
          });
        }
        
        // Get signed URLs for database documents as well and add fromStorage: false
        const dbDocumentsWithSignedUrls = await Promise.all((dbDocuments || []).map(async (doc) => {
          const signedUrl = await getSignedUrl(doc.path);
          return {
            ...doc,
            url: signedUrl || doc.url, // Fall back to stored URL if signed URL fails
            fromStorage: false
          } as Document;
        }));
        
        // Merge database and storage documents
        return [...dbDocumentsWithSignedUrls, ...storageDocuments];
      } catch (error) {
        console.error('Error fetching documents:', error);
        return [];
      }
    },
    enabled: !!user && !!caseId
  });

  // Helper function to get signed URL
  const getSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('doculaw')
        .createSignedUrl(filePath, 3600);
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  // Helper function to determine file type from filename
  const getFileType = (fileName: string) => {
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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F to open Form Interrogatories
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFormInterrogatories(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle file drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileUpload = async (files: File[]) => {
    for (const file of files) {
      try {
        // Upload to Supabase storage
        const filePath = `${user?.id}/cases/${caseId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('doculaw')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Get signed URL
        const { data: signedUrlData } = await supabase.storage
          .from('doculaw')
          .createSignedUrl(filePath, 3600);
        
        // Try to extract text if it's a PDF
        let extractedText = null;
        if (file.type === 'application/pdf') {
          try {
            const pdfToText = (await import('react-pdftotext')).default;
            extractedText = await pdfToText(file);
          } catch (extractError) {
            console.error('Error extracting text:', extractError);
            // Continue even if text extraction fails
          }
        }
        
        // Add to database
        const { error: insertError } = await supabase
          .from('documents')
          .insert({
            user_id: user?.id,
            case_id: caseId,
            name: file.name,
            path: filePath,
            url: signedUrlData?.signedUrl || '',
            type: getFileType(file.name),
            size: file.size,
            extracted_text: extractedText,
            created_at: new Date().toISOString()
          });
        
        if (insertError) throw insertError;

        // Add to vector store for AI analysis
        try {
          const documentContent = extractedText || await file.text();
          await addDocumentsToVectorStore(
            [{
              id: filePath, // Use filePath as document ID
              name: file.name,
              content: documentContent,
              type: getFileType(file.name),
            }],
            caseId!,
            user!.id
          );
        } catch (vectorError) {
          console.error('Error adding to vector store:', vectorError);
          // Don't fail the upload if vector store fails
        }
        
        toast({
          title: "File Uploaded",
          description: `${file.name} has been uploaded successfully to the case documents.`,
        });

        // Invalidate case documents query
        queryClient.invalidateQueries({ queryKey: ['case-documents', caseId] });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: "Upload Error",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        });
      }
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Get AI response with context from vector store
      const aiResponse = await getAIResponseWithContext(currentMessage, caseId!);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Check if the AI response mentions Form Interrogatories and suggest the feature
      if (aiResponse.toLowerCase().includes('form interrogatories') || 
          aiResponse.toLowerCase().includes('discovery') ||
          currentMessage.toLowerCase().includes('form interrogatories') ||
          currentMessage.toLowerCase().includes('discovery')) {
        
        // Add a follow-up message suggesting the Form Interrogatories feature
        setTimeout(() => {
          const suggestionMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            type: 'ai',
            content: '💡 **Quick Tip**: You can generate official Form Interrogatories (DISC-001) with AI-powered case analysis using the "Generate Form Interrogatories" button in the sidebar or quick actions below.',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, suggestionMessage]);
        }, 1000);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback response if AI fails
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I apologize, but I'm having trouble accessing the case documents right now. Please try again later or contact support if the issue persists.`,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, fallbackMessage]);
      
      toast({
        title: "AI Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    toast({
      title: "File Removed",
      description: "File has been removed from the chat.",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewDocument = (documentId: string) => {
    setViewingDocumentId(documentId);
    setShowDocumentViewer(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete || !user || !caseId) return;
    
    try {
      // Find the document
      const docToDelete = caseDocuments?.find(doc => doc.id === documentToDelete);
      if (!docToDelete) throw new Error("Document not found");
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('doculaw')
        .remove([docToDelete.path]);
        
      if (storageError) throw storageError;
      
      // If it's in the database (not just storage), delete from database too
      if (!docToDelete.fromStorage) {
        const { error: deleteError } = await supabase
          .from('documents')
          .delete()
          .eq('id', documentToDelete);
          
        if (deleteError) throw deleteError;
        
        // Delete from vector store
        try {
          await deleteDocumentVectors(docToDelete.path);
        } catch (vectorError) {
          console.error('Error deleting from vector store:', vectorError);
          // Don't fail the deletion if vector store fails
        }
      }
      
      toast({
        title: "Document Deleted",
        description: "The document has been removed from this case."
      });
      
      // Invalidate case documents query
      queryClient.invalidateQueries({ queryKey: ['case-documents', caseId] });
      setDocumentToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete the document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGenerateFormInterrogatories = () => {
    setShowFormInterrogatories(true);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4"
            onClick={() => navigate(`/case/${caseId}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Case
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Chat</h1>
              <p className="text-gray-600">
                Chat with AI about {caseData?.name || "your case"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-row overflow-hidden">
          {/* Chat Area (70%) */}
          <div className={`flex-[7] min-w-0 flex flex-col border-r transition-all duration-300` + (sidebarOpen ? '' : ' w-full') }>
            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="flex items-start space-x-2">
                        {message.type === 'ai' && <Bot className="h-4 w-4 mt-1 flex-shrink-0" />}
                        {message.type === 'user' && <User className="h-4 w-4 mt-1 flex-shrink-0" />}
                        <div className="flex-1">
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Ask about your files, request edits, or create new documents..."
                  className="flex-1 min-h-[40px] max-h-[100px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isLoading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {/* Quick Actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentMessage("Summarize the key points from my case documents")}
                >
                  Summarize Files
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentMessage("Help me draft a motion based on these documents")}
                >
                  Draft Motion
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentMessage("Find inconsistencies in the uploaded documents")}
                >
                  Find Issues
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateFormInterrogatories}
                >
                  <FileCheck className="h-3 w-3 mr-1" />
                  Generate Form Interrogatories
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar (30%) for File Upload and Documents, collapsible */}
          {sidebarOpen ? (
            <div className="flex-[3] min-w-[250px] max-w-[500px] flex flex-col bg-gray-50 transition-all duration-300 relative">
              {/* Collapse button */}
              <button
                className="absolute top-2 right-2 z-10 bg-white border rounded-full p-1 shadow hover:bg-gray-100"
                onClick={() => setSidebarOpen(false)}
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {/* File Upload Area */}
              <div 
                className={`m-4 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  Drop files or click to upload
                </h3>
                <p className="text-gray-500 mb-2 text-xs">
                  Upload PDFs, text files, or any case-related materials for AI analysis
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFileUpload(Array.from(e.target.files));
                    }
                  }}
                />
              </div>

              {/* Case Documents Section */}
              <div className="m-4 flex-1 overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Case Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingDocuments ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                      </div>
                    ) : caseDocuments && caseDocuments.length > 0 ? (
                      <div className="space-y-2">
                        {caseDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="text-xs font-medium text-gray-900">{doc.name}</p>
                                <p className="text-[10px] text-gray-500">
                                  {formatFileSize(doc.size)} • {format(parseISO(doc.created_at), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleViewDocument(doc.id)}
                                title="View Document"
                              >
                                <FileText className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => window.open(doc.url, '_blank')}
                                title="Download Document"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDocumentToDelete(doc.id)}
                                title="Delete Document"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-xs">No documents uploaded yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Form Interrogatories Section */}
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileCheck className="h-5 w-5 mr-2" />
                      Discovery Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">Form Interrogatories</h4>
                        <p className="text-xs text-blue-700 mb-3">
                          Generate official Form Interrogatories (DISC-001) with AI-powered case analysis.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={handleGenerateFormInterrogatories}
                        >
                          <FileCheck className="h-3 w-3 mr-1" />
                          Generate & Preview
                        </Button>
                        <p className="text-[10px] text-blue-600 mt-2 text-center">
                          💡 Press Ctrl+F to open quickly
                        </p>
                      </div>
                      
                      <div className="text-xs text-gray-500 text-center">
                        <p>More discovery document types coming soon...</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center w-8 bg-gray-50 border-l">
              <button
                className="m-2 bg-white border rounded-full p-1 shadow hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
                title="Expand sidebar"
              >
                <ChevronLeft className="h-5 w-5 rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={!!documentToDelete} 
        onOpenChange={(open) => {
          if (!open) {
            setDocumentToDelete(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Delete Document
            </DialogTitle>
            <DialogDescription>
              <p className="mb-2">
                Are you <strong>absolutely sure</strong> you want to delete this document? 
              </p>
              <p className="mb-2 text-red-500">
                This action <strong>cannot be undone</strong> and all document data will be permanently lost.
              </p>
              <p>
                Type <strong>DELETE</strong> below to confirm:
              </p>
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-2">
            <Input 
              placeholder="Type DELETE to confirm" 
              className="border-red-200"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={() => {
                setDocumentToDelete(null);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="sm:flex-1"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={handleDeleteDocument}
            >
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      <DocumentViewer
        documentId={viewingDocumentId}
        caseId={caseId}
        open={showDocumentViewer}
        onClose={() => {
          setShowDocumentViewer(false);
          setViewingDocumentId(null);
        }}
      />

      {/* Form Interrogatories Dialog */}
      <Dialog 
        open={showFormInterrogatories} 
        onOpenChange={setShowFormInterrogatories}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileCheck className="h-5 w-5 mr-2" />
              Generate Form Interrogatories
            </DialogTitle>
            <DialogDescription>
              Generate and preview Form Interrogatories (DISC-001) for your case. 
              The AI will analyze your case documents to determine which sections apply.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-6">
            <FormInterrogatoriesPdfButton
              extractedData={extractedComplaintData}
              caseId={caseId}
              onEditExtractedData={() => {
                // TODO: Add edit functionality if needed
                toast({
                  title: "Edit Feature",
                  description: "Edit functionality will be available in a future update.",
                });
              }}
            />
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowFormInterrogatories(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AIChatPage;
