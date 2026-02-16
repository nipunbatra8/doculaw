import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, RefreshCw, UploadCloud } from "lucide-react";
import { Document as ComplaintDocumentType } from "./types";
import { ComplaintInformation } from '@/integrations/gemini/client';
import { CaseData } from './types';
import FormInterrogatoriesPdfButton from './FormInterrogatoriesPdfButton';
import RequestForAdmissionsPdfButton from './RequestForAdmissionsPdfButton';
import RequestForProductionPdfButton from './RequestForProductionPdfButton';
import SpecialInterrogatoriesController from './SpecialInterrogatoriesController';
import DemandLetterGenerator from './DemandLetterGenerator';

interface InitialScreenProps {
  complaintDocument: ComplaintDocumentType | null;
  complaintInformation: ComplaintInformation | null;
  caseDetails: CaseData | null;
  onUploadNew: () => void;        // For the fallback screen's upload button
  onViewComplaint: () => void;    // For the "View Complaint" button when complaint exists
  onReplaceComplaint: () => void; // For the "Replace Complaint" button when complaint exists
}

const InitialScreen: React.FC<InitialScreenProps> = ({ 
  complaintDocument,
  complaintInformation,
  caseDetails,
  onUploadNew, 
  onViewComplaint, 
  onReplaceComplaint 
}) => {
  const [specialInterrogatoriesGenerated, setSpecialInterrogatoriesGenerated] = useState(false);

  const caseId = caseDetails?.id;

  if (complaintDocument) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Generate Discovery Documents</h2>
            <p className="text-gray-600">
              Select a document type below to generate, preview, and download.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Form Interrogatories */}
          <Card className="hover:border-blue-500 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Form Interrogatories
              </CardTitle>
              <CardDescription>
                Standard questions to gather basic case information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormInterrogatoriesPdfButton extractedData={complaintInformation} caseId={caseId} />
            </CardContent>
          </Card>

          {/* Card 2: Special Interrogatories */}
          <Card className="hover:border-purple-500 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-purple-600" />
                Special Interrogatories
              </CardTitle>
              <CardDescription>
                Tailored questions specific to your case details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpecialInterrogatoriesController extractedData={complaintInformation} caseId={caseId} />
            </CardContent>
          </Card>

          {/* Card 3: Request for Admissions */}
          <Card className="hover:border-green-500 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-600" />
                Request for Admissions
              </CardTitle>
              <CardDescription>
                Ask the opposing party to admit or deny specific facts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RequestForAdmissionsPdfButton 
                extractedData={complaintInformation} 
                caseId={caseId} 
              />
            </CardContent>
          </Card>

          {/* Card 4: Request for Production */}
          <Card className="hover:border-red-500 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-red-600" />
                Request for Production
              </CardTitle>
              <CardDescription>
                Request specific documents and evidence from the opposing party.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RequestForProductionPdfButton extractedData={complaintInformation} caseId={caseId} />
            </CardContent>
          </Card>

          {/* Card 5: Demand Letter */}
          <Card className="hover:border-orange-500 transition-colors md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-orange-600" />
                Demand Letter
              </CardTitle>
              <CardDescription>
                Generate, refine, and export a pre-litigation demand letter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DemandLetterGenerator caseId={caseId} extractedData={complaintInformation} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback for when no complaint document is uploaded
  return (
    <div className="text-center">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit">
            <UploadCloud className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="mt-4">Upload Your Complaint Document</CardTitle>
          <CardDescription>
            To get started, please upload the complaint document for your case. 
            This will enable the generation of relevant discovery documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onUploadNew} className="w-full">
            <UploadCloud className="mr-2 h-4 w-4" /> Upload Complaint
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialScreen;