
import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

// UI Components
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  Plus
} from "lucide-react";

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

const AIChatPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI assistant. You can upload files by dragging and dropping them, then ask me questions about them. I can help you analyze documents, edit content, or create new files based on your case materials.',
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
        // Read file content for text files
        let content = '';
        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          content = await file.text();
        }

        const newFile: UploadedFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          content
        };

        setUploadedFiles(prev => [...prev, newFile]);
        
        toast({
          title: "File Uploaded",
          description: `${file.name} has been uploaded successfully.`,
        });
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

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I understand you want to know about: "${currentMessage}". Based on the ${uploadedFiles.length} file(s) you've uploaded, I can help you analyze the content, suggest edits, or create new documents. What specific task would you like me to help you with?`,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
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
            
            <Badge variant="secondary" className="text-sm">
              {uploadedFiles.length} files uploaded
            </Badge>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* File Upload Area */}
            <div 
              className={`m-6 mb-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop files here or click to upload
              </h3>
              <p className="text-gray-500 mb-4">
                Upload documents, PDFs, text files, or any case-related materials
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
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

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mx-6 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files</h3>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          <div className="w-96 border-l flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">AI Assistant</h2>
              <p className="text-sm text-gray-500">Ask questions about your files</p>
            </div>

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
                  onClick={() => setCurrentMessage("Summarize the key points from my uploaded documents")}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIChatPage;
