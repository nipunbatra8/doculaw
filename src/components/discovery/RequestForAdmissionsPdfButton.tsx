import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, AlertCircle, Eye, FileCheck, Printer } from 'lucide-react';
import { downloadPdf, inspectPdfFields } from '@/integrations/pdf/client';
import { 
  ComplaintInformation 
} from '@/integrations/gemini/client';
import { useToast } from '@/hooks/use-toast';
import { useCaseDocuments } from '@/hooks/use-case-documents';
import RequestForAdmissionsPreview from './RequestForAdmissionsPreview';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFDownloadLink, 
  PDFViewer,
  Font
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import {
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { searchVectorStore, getAIResponseWithContext } from '@/integrations/openai/client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface RequestForAdmissionsPdfButtonProps {
  extractedData: ComplaintInformation | null;
  caseId: string | undefined;
  onEditExtractedData?: () => void;
}

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

// Component for generating the RFA PDF document
const RFAPdfDocument = ({ 
  extractedData, 
  vectorBasedAdmissions 
}: { 
  extractedData: ComplaintInformation;
  vectorBasedAdmissions?: string[];
}) => {
  // Generate line numbers for the document (1-28 for first page)
  const generateLineNumbers = (count: number) => {
    const numbers = [];
    for (let i = 0; i < count; i++) {
      numbers.push(i + 1);
    }
    return numbers;
  };

  const lineNumbers = generateLineNumbers(28);

  // Use vector-based admissions if available, otherwise fall back to generated admissions
  const getAdmissions = (): string[] => {
    if (vectorBasedAdmissions && vectorBasedAdmissions.length > 0) {
      return vectorBasedAdmissions;
    }

    console.log('No vector-based admissions found, generating default admissions');
    
    // Fallback to default admissions
    return generateDefaultAdmissions();
  };

  // Generate default admissions for fallback
  const generateDefaultAdmissions = (): string[] => {
    const caseType = extractedData.caseType || 'civil';
    const filingDate = extractedData.filingDate || 'the date specified in the complaint';
    const plaintiff = extractedData.plaintiff || 'the plaintiff';
    const defendant = extractedData.defendant || 'the defendant';
    
    // Default admissions that apply to most cases
    const commonAdmissions = [
      `Admit that the venue is proper in ${extractedData.courtName || 'this court'}.`,
      `Admit that the court has jurisdiction over this matter.`,
      `Admit that you were properly served with the summons and complaint in this action.`,
      `Admit that you received the complaint filed in this action on or about ${filingDate}.`
    ];
    
    // Contract case specific admissions
    const contractAdmissions = [
      `Admit that you entered into a contract with ${plaintiff} on or about ${filingDate}.`,
      `Admit that the terms of the contract required you to pay ${plaintiff} for services rendered.`,
      `Admit that you failed to pay ${plaintiff} pursuant to the terms of the contract.`,
      `Admit that you breached the contract by failing to perform your obligations.`,
      `Admit that ${plaintiff} performed all obligations required under the contract.`,
      `Admit that you received a demand letter from ${plaintiff} prior to this lawsuit.`,
      `Admit that you owe ${plaintiff} damages as a result of your breach of contract.`
    ];
    
    // Personal injury case specific admissions
    const personalInjuryAdmissions = [
      `Admit that you were involved in an incident with ${plaintiff} on or about ${filingDate}.`,
      `Admit that the incident was caused by your negligence.`,
      `Admit that ${plaintiff} was injured as a result of the incident.`,
      `Admit that ${plaintiff} incurred medical expenses as a result of injuries sustained in the incident.`,
      `Admit that ${plaintiff} suffered pain and suffering as a result of injuries sustained in the incident.`,
      `Admit that you had a duty of care toward ${plaintiff}.`,
      `Admit that you breached that duty of care.`
    ];
    
    // Select appropriate admissions based on case type
    let caseSpecificAdmissions: string[] = [];
    
    if (caseType.toLowerCase().includes('contract') || 
        extractedData.chargeDescription?.toLowerCase().includes('contract')) {
      caseSpecificAdmissions = contractAdmissions;
    }
    else if (caseType.toLowerCase().includes('injury') || 
             extractedData.chargeDescription?.toLowerCase().includes('injury') ||
             extractedData.chargeDescription?.toLowerCase().includes('accident')) {
      caseSpecificAdmissions = personalInjuryAdmissions;
    }
    else {
      // Default to contract admissions if case type is not recognized
      caseSpecificAdmissions = contractAdmissions;
    }
    
    // Combine common and case-specific admissions
    return [...commonAdmissions, ...caseSpecificAdmissions];
  };

  // Get attorney information from extracted data
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

  // Get court and case information - proper casing for county
  const courtCounty = extractedData.court?.county || 
    (extractedData.courtName?.split('County of ')[1] || 'San Bernardino');
  const plaintiff = extractedData.plaintiff || 'CARLOS OMAR LEON ZAMUDIO, an individual';
  const plaintiffShort = extractedData.plaintiff?.split(',')[0] || 'CARLOS OMAR ZAMUDIO';
  const defendant = extractedData.defendant || 'INGRID GUADALUPE ZULETA, an individual; AND DOES 1 TO 25, inclusive';
  const caseNumber = extractedData.case?.caseNumber || extractedData.caseNumber || 'CIVSB2426204';

  return (
    <Document title={`Request for Admissions - ${plaintiffShort} v. ${extractedData.defendant?.split(',')[0] || 'Defendant'}`}>
      <Page size="LETTER" style={styles.page}>
        {/* Vertical double lines on left side */}
        <View style={styles.verticalLineLeft} />
        <View style={styles.verticalLineLeft2} />
        
        {/* Line numbers */}
        <View style={styles.lineNumbers}>
          {lineNumbers.map((num) => (
            <View key={num}>
              <Text>{num}</Text>
              <View style={styles.smallSpacer} />
            </View>
          ))}
        </View>
        
        {/* Attorney Information Header */}
        <View style={styles.headerInfo}>
          <Text style={styles.headerLeft}>
            <Text style={styles.bold}>{attorney.name}</Text>
          </Text>
          <Text style={styles.headerLeft}>
            <Text style={styles.bold}>{attorney.firmName}</Text>
          </Text>
          <Text style={styles.headerLeft}>{attorney.address}</Text>
          <Text style={styles.headerLeft}>{attorney.cityStateZip}</Text>
          <Text style={styles.headerLeft}>Telephone: {attorney.phone}</Text>
          <Text style={styles.headerLeft}>Facsimile: {attorney.fax}</Text>
          <Text style={styles.headerLeft}>Email: {attorney.email}</Text>
          <Text style={styles.headerLeft}></Text>
          <Text style={styles.headerLeft}>
            Attorney for {attorney.attorneyFor},
          </Text>
          <Text style={styles.headerLeft}>
            <Text style={styles.bold}>{plaintiffShort}</Text>
          </Text>
        </View>
        
        {/* Court Title */}
        <Text style={styles.courtTitle}>SUPERIOR COURT OF THE STATE OF CALIFORNIA</Text>
        <Text style={styles.countyTitle}>FOR THE COUNTY OF {courtCounty.toUpperCase()}</Text>
        
        {/* Case Block with Parties */}
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
              <View style={styles.parenthesisRight}>
                <Text></Text>
              </View>
            </View>

            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}>
                <Text style={styles.bold}>PLAINTIFFS REQUEST FOR ADMISSIONS</Text>
              </View>
            </View>

            <View style={styles.parenthesisRow}>
              <Text>)</Text>
              <View style={styles.parenthesisRight}>
                <Text style={styles.bold}>TO DEFENDANT, SET ONE</Text>
              </View>
            </View>
            
            {/* Fill with parenthesis and right-side text for each line */}
            {Array(8).fill(null).map((_, i) => (
              <View key={i} style={styles.parenthesisRow}>
                <Text>)</Text>
                <View style={styles.parenthesisRight}>
                  <Text></Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        
        {/* Propounding/Responding Parties */}
        <View style={styles.propoundingParties}>
          <Text style={styles.bold}>PROPOUNDING PARTY: Plaintiff, {plaintiffShort}</Text>
          <Text style={styles.bold}>RESPONDING PARTY:   Defendant, {extractedData.defendant?.split(',')[0] || 'INGRID GUADALUPE ZULETA'}</Text>
          <Text style={styles.bold}>SET NUMBER:         ONE</Text>
        </View>
        
        {/* Introduction and Code Section */}
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
        
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>1</Text>
          <Text style={styles.footerText}>PLAINTIFF'S REQUEST FOR ADMISSIONS TO DEFENDANT, SET ONE</Text>
        </View>
      </Page>
      
      {/* Second page for admissions content */}
      <Page size="LETTER" style={styles.page}>
        {/* Vertical double lines on left side */}
        <View style={styles.verticalLineLeft} />
        <View style={styles.verticalLineLeft2} />
        
        {/* Line numbers - reset for second page */}
        <View style={styles.lineNumbers}>
          {lineNumbers.map((num) => (
            <View key={num}>
              <Text>{num}</Text>
              <View style={styles.smallSpacer} />
            </View>
          ))}
        </View>
        
        {/* Admissions Content */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.headerLeft}><Text style={styles.bold}>ADMISSIONS:</Text></Text>
          <Text style={{ marginTop: 10 }}></Text>
          
          {getAdmissions().map((admission, index) => (
            <View key={index} style={{ marginBottom: 20 }}>
              <Text>
                <Text style={styles.bold}>{index + 1}. </Text>
                {admission}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Signature Block - aligned to the right */}
        <View style={styles.signatureBlock}>
          <Text>Dated: {format(new Date(), 'MMMM d, yyyy')}</Text>
          <Text style={{ marginTop: 30 }}>{attorney.firmName}</Text>
          <Text style={{ marginTop: 10 }}></Text>
          <Text style={{ marginTop: 10 }}>By: ______________________________</Text>
          <Text style={{ marginTop: 5 }}>{attorney.name}</Text>
          <Text>Attorney for Plaintiff</Text>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>2</Text>
          <Text style={styles.footerText}>PLAINTIFF'S REQUEST FOR ADMISSIONS TO DEFENDANT, SET ONE</Text>
        </View>
      </Page>
    </Document>
  );
};

const RequestForAdmissionsPdfButton = ({
  extractedData,
  caseId,
  onEditExtractedData
}: RequestForAdmissionsPdfButtonProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [vectorBasedAdmissions, setVectorBasedAdmissions] = useState<string[]>([]);
  const [editedAdmissions, setEditedAdmissions] = useState<string[]>([]);
  const totalPages = 2;
  const { toast } = useToast();

  // Handle admission changes from the preview component
  const handleAdmissionsChange = (admissions: string[]) => {
    setEditedAdmissions(admissions);
  };

  // Get the admissions to use - edited ones take priority
  const getAdmissionsForPdf = (): string[] => {
    if (editedAdmissions.length > 0) {
      return editedAdmissions;
    }
    return vectorBasedAdmissions;
  };

  /**
   * Generate admissions based on complaint vectors stored in the vector store
   */
  const generateAdmissionsFromVectors = async (): Promise<string[]> => {
    if (!caseId) {
      throw new Error('Case ID is required to search complaint vectors');
    }

    try {
      // Search for key topics in the complaint document
      const queries = [
        "What are the main claims and allegations in this case?",
        "What are the key facts and circumstances described?",
        "What damages or injuries are claimed?",
        "What contractual obligations or duties are mentioned?",
        "What is the timeline of events described?",
        "What evidence or documentation is referenced?",
        "What parties and their roles are involved?",
        "What legal theories or causes of action are asserted?"
      ];

      const searchResults = [];
      
      // Search for each query to gather comprehensive information
      for (const query of queries) {
        const results = await searchVectorStore(query, caseId, 3);
        searchResults.push(...results);
      }

      // Remove duplicates and get unique content
      const uniqueContent = Array.from(new Set(searchResults.map(r => r.content)))
        .join('\n\n');

      // Use AI to generate specific admissions based on the complaint content
      const aiPrompt = `Based on the following content from a legal complaint, generate 10-15 specific Request for Admissions statements. These should be factual statements that directly relate to the allegations and circumstances described in the complaint.

Each admission should:
1. Be specific to the facts in this case
2. Use proper legal language
3. Begin with "Admit that..."
4. Be answerable with admit/deny/insufficient information
5. Focus on key elements needed to prove the case

IMPORTANT: Format each admission exactly as shown in the examples below, with each admission on a separate line starting with "Admit that":

Example format:
Admit that you entered into a contract with plaintiff on January 1, 2023.
Admit that you failed to perform your obligations under the contract.
Admit that you received written notice of default from plaintiff.

Complaint content:
${uniqueContent}

Case information:
- Plaintiff: ${extractedData?.plaintiff || 'Unknown'}
- Defendant: ${extractedData?.defendant || 'Unknown'}
- Case Type: ${extractedData?.caseType || 'Unknown'}
- Filing Date: ${extractedData?.filingDate || 'Unknown'}

Generate 10-15 admissions in the exact format shown above, each starting with "Admit that" and ending with a period:`;

      const aiResponse = await getAIResponseWithContext(aiPrompt, caseId, 10);
      
      // Debug: Log the AI response to understand the format
      console.log('AI Response for admissions:', aiResponse);
      
      // Parse the AI response to extract individual admissions
      // Try multiple parsing strategies to be more robust
      let admissions: string[] = [];
      
      // Strategy 1: Look for lines starting with "Admit that"
      admissions = aiResponse
        .split('\n')
        .filter(line => line.trim().startsWith('Admit that'))
        .map(line => line.trim())
        .slice(0, 15);
      
      // Strategy 2: If no "Admit that" found, look for numbered items and convert them
      if (admissions.length === 0) {
        console.log('No "Admit that" lines found, trying numbered format...');
        const numberedLines = aiResponse
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            return /^\d+[.)]/.test(trimmed) && trimmed.length > 10; // Numbered lines with substantial content
          })
          .map(line => {
            let content = line.trim();
            // Remove number prefix (e.g., "1. " or "1)")
            content = content.replace(/^\d+[.)]\s*/, '');
            // Ensure it starts with "Admit that"
            if (!content.toLowerCase().startsWith('admit that')) {
              content = 'Admit that ' + content;
            }
            return content;
          })
          .slice(0, 15);
        
        admissions = numberedLines;
      }
      
      // Strategy 3: If still no admissions, look for any substantial lines and convert them
      if (admissions.length === 0) {
        console.log('No numbered lines found, trying general parsing...');
        const generalLines = aiResponse
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 20 && // Substantial content
                   !trimmed.toLowerCase().includes('request for admissions') && // Not headers
                   !trimmed.toLowerCase().includes('based on') && // Not explanatory text
                   !trimmed.toLowerCase().includes('following') && // Not intro text
                   (trimmed.includes('defendant') || trimmed.includes('plaintiff')); // Likely admission content
          })
          .map(line => {
            let content = line.trim();
            // Clean up any prefixes
            content = content.replace(/^[-*•]\s*/, ''); // Remove bullet points
            content = content.replace(/^\d+[.)]\s*/, ''); // Remove numbers
            // Ensure it starts with "Admit that"
            if (!content.toLowerCase().startsWith('admit that')) {
              content = 'Admit that ' + content;
            }
            return content;
          })
          .slice(0, 15);
        
        admissions = generalLines;
      }
      
      console.log(`Extracted ${admissions.length} admissions:`, admissions);

      if (admissions.length === 0) {
        // Fallback to default admissions if AI parsing fails
        console.warn('No admissions extracted from AI response, using fallback');
        return generateDefaultAdmissions(uniqueContent);
      }

      return admissions;
    } catch (error) {
      console.error('Error generating admissions from vectors:', error);
      // Fallback to default admissions
      return generateDefaultAdmissions();
    }
  };

  /**
   * Generate default admissions when vector search fails
   */
  const generateDefaultAdmissions = (complaintContent?: string): string[] => {
    const caseType = extractedData?.caseType || 'civil';
    const filingDate = extractedData?.filingDate || 'the date specified in the complaint';
    const plaintiff = extractedData?.plaintiff || 'the plaintiff';
    const defendant = extractedData?.defendant || 'the defendant';
    
    // Default admissions that apply to most cases
    const commonAdmissions = [
      `Admit that the venue is proper in ${extractedData?.courtName || 'this court'}.`,
      `Admit that the court has jurisdiction over this matter.`,
      `Admit that you were properly served with the summons and complaint in this action.`,
      `Admit that you received the complaint filed in this action on or about ${filingDate}.`
    ];
    
    // Add content-specific admissions if complaint content is available
    if (complaintContent) {
      const contentAdmissions = [
        `Admit that the facts alleged in the complaint are true.`,
        `Admit that you were involved in the events described in the complaint.`,
        `Admit that you have knowledge of the circumstances described in the complaint.`,
        `Admit that you have documents related to the matters described in the complaint.`
      ];
      return [...commonAdmissions, ...contentAdmissions];
    }
    
    // Fallback to case-type specific admissions
    let caseSpecificAdmissions: string[] = [];
    
    if (caseType.toLowerCase().includes('contract') || 
        extractedData?.chargeDescription?.toLowerCase().includes('contract')) {
      caseSpecificAdmissions = [
        `Admit that you entered into a contract with ${plaintiff} on or about ${filingDate}.`,
        `Admit that the terms of the contract required you to pay ${plaintiff} for services rendered.`,
        `Admit that you failed to pay ${plaintiff} pursuant to the terms of the contract.`,
        `Admit that you breached the contract by failing to perform your obligations.`,
        `Admit that ${plaintiff} performed all obligations required under the contract.`
      ];
    } else if (caseType.toLowerCase().includes('injury') || 
               extractedData?.chargeDescription?.toLowerCase().includes('injury')) {
      caseSpecificAdmissions = [
        `Admit that you were involved in an incident with ${plaintiff} on or about ${filingDate}.`,
        `Admit that the incident was caused by your negligence.`,
        `Admit that ${plaintiff} was injured as a result of the incident.`,
        `Admit that ${plaintiff} incurred medical expenses as a result of injuries sustained.`,
        `Admit that you had a duty of care toward ${plaintiff}.`
      ];
    } else {
      caseSpecificAdmissions = [
        `Admit that you are the party named as defendant in this action.`,
        `Admit that you have personal knowledge of the events described in the complaint.`,
        `Admit that you have the capacity to respond to these requests for admissions.`,
        `Admit that you understand the nature of the claims against you.`
      ];
    }
    
    return [...commonAdmissions, ...caseSpecificAdmissions];
  };

  // Generate request for admissions with case data
  const handleGenerateRequestForAdmissions = async () => {
    if (!extractedData || !caseId) {
      toast({
        title: 'Missing Data',
        description: 'No case information available to generate the document.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setErrorDetails(null);

    try {
      toast({
        title: 'Generating Request for Admissions',
        description: 'Analyzing complaint vectors to create specific admissions...',
      });
      
      // Generate admissions based on complaint vectors
      const generatedAdmissions = await generateAdmissionsFromVectors();
      setVectorBasedAdmissions(generatedAdmissions);
      
      // Mark as generated
      setIsGenerated(true);
      
      toast({
        title: 'Document Generation Complete',
        description: `Generated ${generatedAdmissions.length} specific admissions based on your complaint.`,
      });
    } catch (error) {
      console.error('Error generating form:', error);
      
      // Set error details for user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorDetails(`Error: ${errorMessage}`);
      
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate the document. You can try downloading the blank form instead.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Inspect the PDF fields for debugging
  const handleInspectFields = async () => {
    try {
      setIsInspecting(true);
      
      // Get the response from the PDF client
      const fields = await inspectPdfFields();
      
      console.log('PDF fields:', fields);
      
      toast({
        title: 'PDF Inspection Complete',
        description: `Found ${fields.length} fields in the PDF. Check console for details.`,
      });
    } catch (error) {
      console.error('Error inspecting PDF:', error);
      
      toast({
        title: 'Inspection Failed',
        description: 'Failed to inspect the PDF fields. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsInspecting(false);
    }
  };

  // Download the original form from courts website
  const handleDownloadOriginalForm = async () => {
    try {
      toast({
        title: 'Downloading Blank Form',
        description: 'Downloading the blank Request for Admissions form...',
      });
      
      // Fetch the blank RFA form
      const response = await fetch('/RFA.pdf');
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
      
      const pdfBytes = await response.arrayBuffer();
      
      // Download the PDF
      downloadPdf(pdfBytes, 'Blank_Request_for_Admissions.pdf');
      
      toast({
        title: 'Download Complete',
        description: 'The blank Request for Admissions form has been downloaded.',
      });
    } catch (error) {
      console.error('Error downloading blank form:', error);
      
      toast({
        title: 'Download Failed',
        description: 'Failed to download the blank form. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Determine the button state based on current processing status
  const getButtonState = () => {
    if (isProcessing) {
      return {
        icon: <Loader2 className="h-4 w-4 mr-2 animate-spin" />,
        text: 'Generating...',
        action: () => {},
        disabled: true
      };
    }
    
    if (isGenerated) {
      return {
        icon: <Download className="h-4 w-4 mr-2" />,
        text: 'Download PDF',
        action: () => {}, // This is now handled by the PDFDownloadLink
        disabled: false
      };
    }
    
    return {
      icon: <FileText className="h-4 w-4 mr-2" />,
      text: 'Generate PDF',
      action: handleGenerateRequestForAdmissions,
      disabled: false
    };
  };

  const buttonState = getButtonState();

  if (!extractedData) {
    return (
      <Button variant="outline" disabled>
        <FileText className="h-4 w-4 mr-2" />
        Generate RFA
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      {errorDetails && (
        <div className="bg-destructive/10 rounded-md p-3 flex items-start text-sm border border-destructive">
          <AlertCircle className="h-4 w-4 mr-2 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Error Generating PDF</p>
            <p className="mt-1 text-muted-foreground">{errorDetails}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={handleDownloadOriginalForm}
            >
              <FileText className="h-3 w-3 mr-2" />
              Download Blank Form
            </Button>
          </div>
        </div>
      )}
      
      {isGenerated && extractedData && (
        <div className="bg-card rounded-md border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/40 flex justify-between items-center">
            <div className="flex items-center">
              <FileCheck className="h-4 w-4 mr-2 text-primary" />
              <h3 className="text-sm font-medium">Request for Admissions Generated</h3>
            </div>
            
            {onEditExtractedData && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onEditExtractedData}
              >
                Edit Info
              </Button>
            )}
          </div>
          
          <RequestForAdmissionsPreview 
            extractedData={extractedData} 
            vectorBasedAdmissions={vectorBasedAdmissions} 
            onAdmissionsChange={handleAdmissionsChange}
          />
          
          <div className="px-4 py-3 border-t bg-muted/20 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview PDF
            </Button>
            
            <PDFDownloadLink 
              document={<RFAPdfDocument extractedData={extractedData} vectorBasedAdmissions={getAdmissionsForPdf()} />} 
              fileName={`Request_for_Admissions_${extractedData.case?.caseNumber || ''}.pdf`}
              style={{ textDecoration: 'none' }}
            >
              {({ blob, url, loading, error }) => (
                <Button variant="default" size="sm" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      )}
      
      {!isGenerated && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={buttonState.action}
            disabled={buttonState.disabled}
            className="flex-1"
          >
            {buttonState.icon}
            {buttonState.text}
          </Button>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleInspectFields}
              disabled={isInspecting}
              title="Inspect PDF Fields (Developer Tool)"
            >
              {isInspecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadOriginalForm}
              title="Download Blank Form"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Request for Admissions Preview</span>
              <DialogClose className="ml-auto">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </DialogTitle>
            <DialogDescription>
              This preview shows the Request for Admissions document generated based on the complaint vectors.
              You can download the full document or print it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden mt-4">
            <PDFViewer width="100%" height="100%" className="border rounded">
              <RFAPdfDocument extractedData={extractedData} vectorBasedAdmissions={getAdmissionsForPdf()} />
            </PDFViewer>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex gap-2">
              <PDFDownloadLink 
                document={<RFAPdfDocument extractedData={extractedData} vectorBasedAdmissions={getAdmissionsForPdf()} />} 
                fileName={`Request_for_Admissions_${extractedData.case?.caseNumber || ''}.pdf`}
                className="inline-flex"
              >
                {({ blob, url, loading, error }) => (
                  <Button variant="outline" size="sm" disabled={loading}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </PDFDownloadLink>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestForAdmissionsPdfButton; 