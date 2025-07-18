import { ComplaintInformation } from "@/integrations/gemini/client";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Users, Gavel as GavelIcon, FileText as FileTextIcon, Edit3, Save, X, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RequestForAdmissionsPreviewProps {
  extractedData: ComplaintInformation;
  vectorBasedAdmissions?: string[];
  vectorBasedDefinitions?: string[];
  onAdmissionsChange?: (admissions: string[]) => void;
  onDefinitionsChange?: (definitions: string[]) => void;
}

const RequestForAdmissionsPreview = ({ 
  extractedData, 
  vectorBasedAdmissions, 
  vectorBasedDefinitions,
  onAdmissionsChange,
  onDefinitionsChange 
}: RequestForAdmissionsPreviewProps) => {
  // Default example admissions (fallback)
  const defaultAdmissions = [
    `YOU are the party named as defendant in this action.`,
    `The venue is proper in ${extractedData.courtName || 'this court'}.`,
    `This court has jurisdiction over this matter.`,
    `YOU were properly served with the summons and complaint in this action.`,
    `YOU were involved in the INCIDENT described in the complaint.`,
    `YOU have knowledge of the circumstances described in the complaint.`
  ];

  // Default example definitions (fallback)
  const defaultDefinitions = [
    `1. The term "INCIDENT" refers to the events described in the complaint.`,
    `2. The term "YOU" refers to ${extractedData.defendant?.split(',')[0] || 'the defendant'}.`
  ];

  // Use vector-based content if available, otherwise fall back to default
  const initialAdmissions = vectorBasedAdmissions && vectorBasedAdmissions.length > 0 
    ? vectorBasedAdmissions 
    : defaultAdmissions;

  const initialDefinitions = vectorBasedDefinitions && vectorBasedDefinitions.length > 0 
    ? vectorBasedDefinitions 
    : defaultDefinitions;

  const [isEditing, setIsEditing] = useState(false);
  const [editableAdmissions, setEditableAdmissions] = useState<string[]>(initialAdmissions);
  const [editableDefinitions, setEditableDefinitions] = useState<string[]>(initialDefinitions);
  const [tempAdmissions, setTempAdmissions] = useState<string[]>(initialAdmissions);
  const [tempDefinitions, setTempDefinitions] = useState<string[]>(initialDefinitions);

  const handleEditClick = () => {
    setTempAdmissions([...editableAdmissions]);
    setTempDefinitions([...editableDefinitions]);
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    setEditableAdmissions([...tempAdmissions]);
    setEditableDefinitions([...tempDefinitions]);
    setIsEditing(false);
    // Notify parent component of changes
    if (onAdmissionsChange) {
      onAdmissionsChange(tempAdmissions);
    }
    if (onDefinitionsChange) {
      onDefinitionsChange(tempDefinitions);
    }
  };

  const handleCancelClick = () => {
    setTempAdmissions([...editableAdmissions]);
    setTempDefinitions([...editableDefinitions]);
    setIsEditing(false);
  };

  const handleAdmissionChange = (index: number, value: string) => {
    const updated = [...tempAdmissions];
    updated[index] = value;
    setTempAdmissions(updated);
  };

  const handleDefinitionChange = (index: number, value: string) => {
    const updated = [...tempDefinitions];
    updated[index] = value;
    setTempDefinitions(updated);
  };

  const handleAddAdmission = () => {
    setTempAdmissions([...tempAdmissions, 'Admit that ']);
  };

  const handleRemoveAdmission = (index: number) => {
    const updated = tempAdmissions.filter((_, i) => i !== index);
    setTempAdmissions(updated);
  };

  const handleAddDefinition = () => {
    setTempDefinitions([...tempDefinitions, '']);
  };

  const handleRemoveDefinition = (index: number) => {
    const updated = tempDefinitions.filter((_, i) => i !== index);
    setTempDefinitions(updated);
  };

  const handleResetToOriginal = () => {
    setTempAdmissions([...initialAdmissions]);
    setTempDefinitions([...initialDefinitions]);
  };

  const admissionsToDisplay = isEditing ? tempAdmissions : editableAdmissions;
  const definitionsToDisplay = isEditing ? tempDefinitions : editableDefinitions;

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
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs uppercase text-muted-foreground">Request For Admissions</h4>
              <div className="flex items-center gap-2">
                {vectorBasedAdmissions && vectorBasedAdmissions.length > 0 && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    AI-Generated ({vectorBasedAdmissions.length})
                  </span>
                )}
                {editableAdmissions.length > 0 && JSON.stringify(editableAdmissions) !== JSON.stringify(initialAdmissions) && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Edited
                  </span>
                )}
                {!isEditing && (
                  <Button variant="ghost" size="sm" onClick={handleEditClick}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Definitions Section */}
            <div className="mb-6">
              <h5 className="font-medium mb-3">DEFINITIONS</h5>
              <div className="space-y-3 pl-3">
                {definitionsToDisplay.map((definition, index) => (
                  <div key={index} className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Textarea
                          className="flex-1 min-h-[60px]"
                          value={definition}
                          onChange={(e) => handleDefinitionChange(index, e.target.value)}
                          placeholder="Definition..."
                        />
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveDefinition(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <p className="flex-1">{definition}</p>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={handleAddDefinition} className="ml-6">
                    Add Definition
                  </Button>
                )}
              </div>
            </div>

            {/* Admissions Section */}
            <div>
              <h5 className="font-medium mb-3">YOU ARE REQUESTED TO ADMIT THAT:</h5>
              <div className="space-y-3 pl-3">
                {admissionsToDisplay.map((admission, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="font-medium">{index + 1}.</span>
                    {isEditing ? (
                      <>
                        <Textarea
                          className="flex-1 min-h-[60px]"
                          value={admission}
                          onChange={(e) => handleAdmissionChange(index, e.target.value)}
                          placeholder="Admit that..."
                        />
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAdmission(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <p className="flex-1">{admission}</p>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={handleAddAdmission} className="ml-6">
                    Add Admission
                  </Button>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="mt-4 flex justify-between">
                <Button variant="outline" size="sm" onClick={handleResetToOriginal}>
                  Reset to Original
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancelClick}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveClick}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestForAdmissionsPreview; 