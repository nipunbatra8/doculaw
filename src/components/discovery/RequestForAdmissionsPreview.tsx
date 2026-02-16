import { ComplaintInformation } from "@/integrations/gemini/client";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Users, Gavel as GavelIcon, FileText as FileTextIcon, Edit3, Save, X, Plus, FileText, Download, Sparkles, RefreshCw } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import RequestForAdmissionsDocxButton from "./RequestForAdmissionsDocxButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  PDFViewer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  PDFDownloadLink,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

interface RequestForAdmissionsPreviewProps {
  admissions: string[];
  definitions: string[];
  onSave: (admissions: string[], definitions: string[]) => void;
  onAIEditClick: (text: string, type: 'admission' | 'definition', index: number) => void;
  onAIEditAllClick: (type: 'admissions' | 'definitions') => void;
  onRegenerate: () => void;
  extractedData: ComplaintInformation | null;
  caseId?: string;
}

const RequestForAdmissionsPreview = ({ 
  admissions, 
  definitions,
  onSave,
  onAIEditClick,
  onAIEditAllClick,
  onRegenerate,
  extractedData,
  caseId,
}: RequestForAdmissionsPreviewProps) => {
  const [editableAdmissions, setEditableAdmissions] = useState<string[]>(admissions);
  const [editableDefinitions, setEditableDefinitions] = useState<string[]>(definitions);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const initialRender = useRef(true);

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(admissions) !== JSON.stringify(editableAdmissions) ||
      JSON.stringify(definitions) !== JSON.stringify(editableDefinitions)
    );
  }, [admissions, definitions, editableAdmissions, editableDefinitions]);

  // Update state if props change and there are no local changes
  useEffect(() => {
    if (!hasChanges) {
      setEditableAdmissions(admissions);
      setEditableDefinitions(definitions);
    }
  }, [admissions, definitions, hasChanges]);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    if (hasChanges) {
      toast({
        title: "Unsaved Changes",
        description: "Don't forget to save your work.",
        duration: 5000,
      });
    }
  }, [hasChanges, toast]);

  const handleSaveClick = () => {
    onSave(editableAdmissions, editableDefinitions);
  };

  const handleAdmissionChange = (index: number, value: string) => {
    const updated = [...editableAdmissions];
    updated[index] = value;
    setEditableAdmissions(updated);
  };

  const handleDefinitionChange = (index: number, value: string) => {
    const updated = [...editableDefinitions];
    updated[index] = value;
    setEditableDefinitions(updated);
  };

  const handleAddAdmission = () => {
    setEditableAdmissions([...editableAdmissions, 'Admit that ']);
  };

  const handleRemoveAdmission = (index: number) => {
    const updated = editableAdmissions.filter((_, i) => i !== index);
    setEditableAdmissions(updated);
  };

  const handleAddDefinition = () => {
    setEditableDefinitions([...editableDefinitions, 'The term "" means ']);
  };

  const handleRemoveDefinition = (index: number) => {
    const updated = editableDefinitions.filter((_, i) => i !== index);
    setEditableDefinitions(updated);
  };

  if (!extractedData) {
    return <p>Loading complaint data...</p>;
  }

  return (
    <div className="p-4 text-sm space-y-6 pb-24"> {/* Added padding-bottom */}
      <div>
        <h3 className="text-lg font-semibold">Edit Request for Admissions</h3>
        <p className="text-muted-foreground text-sm">
          Review, edit, and save the generated admissions and definitions.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
        <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Preview PDF
        </Button>
        <RequestForAdmissionsDocxButton
          extractedData={extractedData}
          admissions={editableAdmissions}
          definitions={editableDefinitions}
          caseId={caseId}
        />
      </div>

      {/* Definitions Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold">Definitions</h4>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onAIEditAllClick('definitions')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Edit All with AI
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddDefinition}>
                <Plus className="h-4 w-4 mr-2" />
                Add Definition
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {editableDefinitions.map((definition, index) => (
              <div key={index} className="flex items-start gap-2">
                <Textarea
                  value={definition}
                  onChange={(e) => handleDefinitionChange(index, e.target.value)}
                  className="flex-grow"
                  rows={2}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAIEditClick(definition, 'definition', index)}
                    title="Edit with AI"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDefinition(index)}
                    title="Remove Definition"
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admissions Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold">Admissions</h4>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onAIEditAllClick('admissions')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Edit All with AI
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddAdmission}>
                <Plus className="h-4 w-4 mr-2" />
                Add Admission
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {editableAdmissions.map((admission, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-shrink-0 pt-2 font-medium">{index + 1}.</div>
                <Textarea
                  value={admission}
                  onChange={(e) => handleAdmissionChange(index, e.target.value)}
                  className="flex-grow"
                  rows={3}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAIEditClick(admission, 'admission', index)}
                    title="Edit with AI"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAdmission(index)}
                    title="Remove Admission"
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>PDF Preview</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="absolute top-4 right-4">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="flex-grow">
            <PDFViewer width="100%" height="100%">
              <RFAPdfDocument
                extractedData={extractedData}
                vectorBasedAdmissions={editableAdmissions}
                vectorBasedDefinitions={editableDefinitions}
              />
            </PDFViewer>
          </div>
        </DialogContent>
      </Dialog>

      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-center items-center shadow-lg z-50">
          <Button onClick={handleSaveClick} size="lg">
            <Save className="h-5 w-5 mr-2" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
};

// PDF Document Component (to be placed in the same file or imported)
// Register fonts
Font.register({
  family: 'Times-Roman',
  src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman@1.0.4/Times New Roman.ttf'
});

Font.register({
  family: 'Times-Bold',
  src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/times-new-roman-bold@1.0.4/Times New Roman Bold.ttf'
});

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingLeft: 70,
    fontFamily: 'Times-Roman',
    fontSize: 12,
    lineHeight: 1.25,
  },
  verticalLineLeft: {
    position: 'absolute',
    left: 65,
    top: 40,
    bottom: 40,
    borderColor: '#000',
    borderLeftWidth: 0.5,
  },
  verticalLineLeft2: {
    position: 'absolute',
    left: 68,
    top: 40,
    bottom: 40,
    borderColor: '#000',
    borderLeftWidth: 0.5,
  },
  lineNumbers: {
    position: 'absolute',
    left: 35,
    top: 45,
    width: 20,
    textAlign: 'right',
    fontSize: 10,
    lineHeight: 2,
  },
  headerLeft: {
    textAlign: 'left',
    fontSize: 12,
    marginBottom: 3,
  },
  bold: {
    fontFamily: 'Times-Bold',
  },
  headerInfo: {
    marginBottom: 15,
  },
  courtTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  countyTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  caseBlock: {
    marginTop: 10,
    flexDirection: 'row',
  },
  partiesLeft: {
    width: '50%',
  },
  rightSide: {
    width: '50%',
    paddingLeft: 5,
  },
  partyVs: {
    marginLeft: 70,
  },
  parenthesisRow: {
    flexDirection: 'row',
  },
  parenthesisRight: {
    paddingLeft: 5,
  },
  propoundingParties: {
    marginTop: 20,
    marginBottom: 5,
  },
  codeSection: {
    marginTop: 30,
  },
  codeSectionText: {
    lineHeight: 1.5,
  },
  underline: {
    textDecoration: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
  },
  footerLine: {
    borderTopWidth: 0.5,
    width: '100%',
    marginBottom: 5,
  },
  footerText: {
    textAlign: 'center',
    fontFamily: 'Times-Bold',
  },
  signatureBlock: {
    marginTop: 50,
    alignItems: 'flex-end',
  },
  spacer: {
    height: 10,
  },
  bigSpacer: {
    height: 20,
  },
  smallSpacer: {
    height: 4,
  },
});

const RFAPdfDocument = ({ 
  extractedData, 
  vectorBasedAdmissions, 
  vectorBasedDefinitions 
}: { 
  extractedData: ComplaintInformation;
  vectorBasedAdmissions?: string[];
  vectorBasedDefinitions?: string[];
}) => {
  const generateLineNumbers = (count: number) => Array.from({ length: count }, (_, i) => i + 1);
  const lineNumbers = generateLineNumbers(28);

  const attorney = {
    name: extractedData.attorney?.name || 'Shawna S. Nazari, Esq. SBN 214939',
    firmName: extractedData.attorney?.firm || 'NAZARI LAW',
    address: extractedData.attorney?.address?.street || '2625 Townsgate Rd., Suite 330',
    cityStateZip: `${extractedData.attorney?.address?.city || 'Westlake Village'}, ${extractedData.attorney?.address?.state || 'CA'} ${extractedData.attorney?.address?.zip || '91361'}`,
    phone: extractedData.attorney?.phone || '(818) 380-3015',
    fax: extractedData.attorney?.fax || '(818) 380-3016',
    email: extractedData.attorney?.email || 'eservice@ssnlegal.com',
    attorneyFor: extractedData.attorney?.attorneyFor || 'Plaintiff'
  };

  const courtCounty = extractedData.court?.county || (extractedData.courtName?.split('County of ')[1] || 'San Bernardino');
  const plaintiff = extractedData.plaintiff || 'CARLOS OMAR LEON ZAMUDIO, an individual';
  const plaintiffShort = extractedData.plaintiff?.split(',')[0] || 'CARLOS OMAR ZAMUDIO';
  const defendant = extractedData.defendant || 'INGRID GUADALUPE ZULETA, an individual; AND DOES 1 TO 25, inclusive';
  const caseNumber = extractedData.case?.caseNumber || extractedData.caseNumber || 'CIVSB2426204';

  return (
    <Document title={`Request for Admissions - ${plaintiffShort} v. ${extractedData.defendant?.split(',')[0] || 'Defendant'}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.verticalLineLeft} />
        <View style={styles.verticalLineLeft2} />
        
        <View style={styles.lineNumbers}>
          {lineNumbers.map((num) => (
            <View key={num}>
              <Text>{num}</Text>
              <View style={styles.smallSpacer} />
            </View>
          ))}
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerLeft}><Text style={styles.bold}>{attorney.name}</Text></Text>
          <Text style={styles.headerLeft}><Text style={styles.bold}>{attorney.firmName}</Text></Text>
          <Text style={styles.headerLeft}>{attorney.address}</Text>
          <Text style={styles.headerLeft}>{attorney.cityStateZip}</Text>
          <Text style={styles.headerLeft}>Telephone: {attorney.phone}</Text>
          <Text style={styles.headerLeft}>Facsimile: {attorney.fax}</Text>
          <Text style={styles.headerLeft}>Email: {attorney.email}</Text>
          <Text style={styles.headerLeft}></Text>
          <Text style={styles.headerLeft}>Attorney for {attorney.attorneyFor},</Text>
          <Text style={styles.headerLeft}><Text style={styles.bold}>{plaintiffShort}</Text></Text>
        </View>
        
        <Text style={styles.courtTitle}>SUPERIOR COURT OF THE STATE OF CALIFORNIA</Text>
        <Text style={styles.countyTitle}>FOR THE COUNTY OF {courtCounty.toUpperCase()}</Text>
        
        <View style={styles.caseBlock}>
          <View style={styles.partiesLeft}>
            <Text>{plaintiff},</Text>
            <View style={styles.bigSpacer} />
            <Text style={styles.partyVs}>Plaintiff,</Text>
            <Text>vs.</Text>
            <View style={styles.bigSpacer} />
            <Text style={{ width: '90%' }}>{defendant}</Text>
            <View style={styles.bigSpacer} />
            <Text style={styles.partyVs}>Defendants.</Text>
            <View style={{height: 15}} />
            <Text style={{ marginTop: 5, borderBottomWidth: 0.5, borderColor: '#000', width: '100%' }}></Text>
          </View>
          
          <View style={styles.rightSide}>
            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}>
                <Text>Case No.: {caseNumber}</Text>
                <Text></Text>
              </View>
            </View>

            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}><Text></Text></View>
            </View>

            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}><Text style={styles.bold}>PLAINTIFFS REQUEST FOR ADMISSIONS</Text></View>
            </View>

            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}><Text style={styles.bold}>TO DEFENDANT, SET ONE</Text></View>
            </View>
            
            {Array(8).fill(null).map((_, i) => (
              <View key={i} style={styles.parenthesisRow}>
                <Text>)</Text>
                <View style={styles.parenthesisRight}><Text></Text></View>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.propoundingParties}>
          <Text style={styles.bold}>PROPOUNDING PARTY: Plaintiff, {plaintiffShort}</Text>
          <Text style={styles.bold}>RESPONDING PARTY:   Defendant, {extractedData.defendant?.split(',')[0] || 'INGRID GUADALUPE ZULETA'}</Text>
          <Text style={styles.bold}>SET NUMBER:         ONE</Text>
        </View>
        
        <View style={styles.codeSection}>
          <Text>TO ALL PARTIES HEREIN AND TO THEIR RESPECTIVE ATTORNEYS OF RECORD:</Text>
          <Text></Text>
          <Text style={styles.codeSectionText}>
            Pursuant to California <Text style={styles.underline}>Code of Civil Procedure Section 2033.010</Text>, you are hereby
          </Text>
          <Text style={styles.codeSectionText}>
            requested to admit the truth of the following facts or assertions. Your response is due within
          </Text>
          <Text style={styles.codeSectionText}>
            thirty days from the date of service of this request for admissions.
          </Text>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>1</Text>
          <Text style={styles.footerText}>PLAINTIFF'S REQUEST FOR ADMISSIONS TO DEFENDANT, SET ONE</Text>
        </View>
      </Page>
      
      <Page size="LETTER" style={styles.page}>
        <View style={styles.verticalLineLeft} />
        <View style={styles.verticalLineLeft2} />
        
        <View style={styles.lineNumbers}>
          {lineNumbers.map((num) => (
            <View key={num}>
              <Text>{num}</Text>
              <View style={styles.smallSpacer} />
            </View>
          ))}
        </View>
        
        <View style={{ marginTop: 20 }}>
          <Text style={styles.headerLeft}><Text style={styles.bold}>DEFINITIONS</Text></Text>
          <Text style={{ marginTop: 10 }}></Text>
          
          {(vectorBasedDefinitions || []).map((definition, index) => (
            <View key={index} style={{ marginBottom: 15 }}>
              <Text>{definition}</Text>
            </View>
          ))}
          
          <Text style={{ marginTop: 20 }}></Text>
          
          <Text style={styles.headerLeft}><Text style={styles.bold}>YOU ARE REQUESTED TO ADMIT THAT:</Text></Text>
          <Text style={{ marginTop: 10 }}></Text>
          
          {(vectorBasedAdmissions || []).map((admission, index) => (
            <View key={index} style={{ marginBottom: 20 }}>
              <Text>
                <Text style={styles.bold}>{index + 1}. </Text>
                {admission}
              </Text>
            </View>
          ))}
        </View>
        
        <View style={styles.signatureBlock}>
          <Text>Dated: {format(new Date(), 'MMMM d, yyyy')}</Text>
          <Text style={{ marginTop: 30 }}>{attorney.firmName}</Text>
          <Text style={{ marginTop: 10 }}></Text>
          <Text style={{ marginTop: 10 }}>By: ______________________________</Text>
          <Text style={{ marginTop: 5 }}>{attorney.name}</Text>
          <Text>Attorney for Plaintiff</Text>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>2</Text>
          <Text style={styles.footerText}>PLAINTIFF'S REQUEST FOR ADMISSIONS TO DEFENDANT, SET ONE</Text>
        </View>
      </Page>
    </Document>
  );
};

export default RequestForAdmissionsPreview;