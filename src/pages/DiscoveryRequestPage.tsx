
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  FileText, 
  Link as LinkIcon,
  ExternalLink,
  MessageSquare,
  HelpCircle
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

const discoveryTypes = [
  {
    id: "form-interrogatories",
    title: "Form Interrogatories",
    description: "Standard set of questions approved for use in specific types of cases.",
    icon: FileText,
    pdfUrl: "https://courts.ca.gov/sites/default/files/courts/default/2024-11/disc001.pdf"
  },
  {
    id: "special-interrogatories",
    title: "Special Interrogatories",
    description: "Custom questions tailored specifically to your case.",
    icon: MessageSquare,
    pdfUrl: null
  },
  {
    id: "request-for-production",
    title: "Request for Production",
    description: "Request for opposing party to produce documents or other items.",
    icon: LinkIcon,
    pdfUrl: null
  },
  {
    id: "request-for-admissions",
    title: "Request for Admissions",
    description: "Ask opposing party to admit or deny specific facts.",
    icon: HelpCircle,
    pdfUrl: null
  }
];

const DiscoveryRequestPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch case details
  const { data: caseData, isLoading } = useQuery({
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

  const handleSelectDiscoveryType = (discoveryType: typeof discoveryTypes[0]) => {
    if (discoveryType.id === "form-interrogatories") {
      // Navigate to case page with state to show PDF editor
      navigate(`/case/${caseId}`, { 
        state: { 
          showPdfEditor: true,
          formType: discoveryType.id
        }
      });
    } else {
      // For other types, we would navigate to a different editor or form
      navigate(`/discovery-request/${caseId}/${discoveryType.id}`);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4"
            onClick={() => navigate(`/case/${caseId}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Case
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Propound Discovery Request
          </h1>
          <p className="text-gray-600">
            Create discovery requests for{" "}
            <Link to={`/case/${caseId}`} className="text-blue-600 hover:underline">
              {caseData?.name || "this case"}
            </Link>
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Select Discovery Type</h2>
          <p className="text-gray-600">
            Choose the type of discovery request you would like to propound in this case.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {discoveryTypes.map(type => (
              <Card 
                key={type.id}
                className="cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => handleSelectDiscoveryType(type)}
              >
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <type.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{type.title}</CardTitle>
                    <CardDescription>
                      {type.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    {type.id === 'form-interrogatories' ? 'Edit Form PDF' : 'Create Request'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-md mt-8">
          <div className="flex items-start">
            <div className="bg-blue-100 p-2 rounded-full mr-4">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Discovery Help</h3>
              <p className="text-sm text-blue-700">
                Need assistance with discovery requests? Our platform can help you create proper discovery 
                documents that comply with court rules. For more information, check out our 
                <a href="#" className="text-blue-600 font-medium hover:underline mx-1">
                  Discovery Guide
                  <ExternalLink className="h-3 w-3 inline ml-1" />
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DiscoveryRequestPage;
