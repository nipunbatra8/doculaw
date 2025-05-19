import { ComplaintInformation } from "@/integrations/gemini/client";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Users, Gavel as GavelIcon, FileText as FileTextIcon } from "lucide-react";

interface RequestForAdmissionsPreviewProps {
  extractedData: ComplaintInformation;
}

const RequestForAdmissionsPreview = ({ extractedData }: RequestForAdmissionsPreviewProps) => {
  // Default example admissions
  const defaultAdmissions = [
    `Admit that you are a party to the contract dated ${extractedData.filingDate || 'the date specified in the complaint'}.`,
    `Admit that you failed to perform under the terms of the contract as alleged in the complaint.`,
    `Admit that you owe the plaintiff damages as a result of your breach of contract.`,
    `Admit that the venue is proper in this court.`,
    `Admit that the court has jurisdiction over this matter.`,
    `Admit that you received a demand letter from the plaintiff prior to this lawsuit.`
  ];

  return (
    <div className="p-4 text-sm">
      <div className="mb-4">
        <h3 className="text-base font-medium mb-2">Document Preview</h3>
        <p className="text-muted-foreground">
          This is a preview of the Request for Admissions document that will be generated.
        </p>
      </div>

      <div className="space-y-4">
        {/* Case Information */}
        <Card>
          <CardContent className="p-4 grid gap-3">
            <div className="flex items-center gap-2">
              <GavelIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Court</p>
                <p className="font-medium">{extractedData.courtName || 'Superior Court of California'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Case Number</p>
                <p className="font-medium">
                  {extractedData.case?.caseNumber || extractedData.caseNumber || 'Unknown'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Parties</p>
                <p className="font-medium">
                  {extractedData.plaintiff || 'Plaintiff'} v. {extractedData.defendant || 'Defendant'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Filing Date</p>
                <p className="font-medium">{extractedData.filingDate || 'Unknown'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Attorney Information */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-xs uppercase text-muted-foreground mb-2">Attorney Information</h4>
            <div className="space-y-1">
              <p className="font-medium">{extractedData.attorney?.name || 'Attorney Name'}</p>
              <p>{extractedData.attorney?.firm || 'Law Firm'}</p>
              <p>
                {extractedData.attorney?.address?.street || 'Street Address'},&nbsp;
                {extractedData.attorney?.address?.city || 'City'},&nbsp;
                {extractedData.attorney?.address?.state || 'State'}&nbsp;
                {extractedData.attorney?.address?.zip || 'ZIP'}
              </p>
              <p>Bar Number: {extractedData.attorney?.barNumber || 'N/A'}</p>
              <p>Phone: {extractedData.attorney?.phone || 'N/A'}</p>
              <p>Email: {extractedData.attorney?.email || 'N/A'}</p>
              <p>Representing: {extractedData.attorney?.attorneyFor || 'Unknown'}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Request For Admissions Preview */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-xs uppercase text-muted-foreground mb-2">Request For Admissions</h4>
            <p className="mb-4">
              <span className="font-medium">{extractedData.formParties?.askingParty || extractedData.plaintiff || 'Plaintiff'}</span> 
              &nbsp;requests that&nbsp;
              <span className="font-medium">{extractedData.formParties?.answeringParty || extractedData.defendant || 'Defendant'}</span>
              &nbsp;admit the truth of the following matters:
            </p>
            
            <div className="space-y-3 pl-3">
              {defaultAdmissions.map((admission, index) => (
                <div key={index} className="flex gap-2">
                  <span className="font-medium">{index + 1}.</span>
                  <p>{admission}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestForAdmissionsPreview; 