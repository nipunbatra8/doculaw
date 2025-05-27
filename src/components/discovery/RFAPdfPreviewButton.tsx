import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Eye, 
  Loader2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Printer
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from '@/components/ui/dialog';
import { ComplaintInformation } from '@/integrations/gemini/client';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFDownloadLink, 
  PDFViewer,
  Font,
  Line
} from '@react-pdf/renderer';
import { format } from 'date-fns';

interface RFAPdfPreviewButtonProps {
  extractedData: ComplaintInformation | null;
  caseId?: string;
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
const RFAPdfDocument = ({ extractedData }: { extractedData: ComplaintInformation }) => {
  // Generate line numbers for the document (1-28 for first page)
  const generateLineNumbers = (count: number) => {
    const numbers = [];
    for (let i = 0; i < count; i++) {
      numbers.push(i + 1);
    }
    return numbers;
  };

  const lineNumbers = generateLineNumbers(28);

  // Generate admissions based on case information
  const generateAdmissions = (): string[] => {
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
          
          {generateAdmissions().map((admission, index) => (
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

const RFAPdfPreviewButton = ({ extractedData, caseId }: RFAPdfPreviewButtonProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 2;

  if (!extractedData) {
    return (
      <Button variant="outline" disabled>
        <FileText className="h-4 w-4 mr-2" />
        Preview RFA PDF
      </Button>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowPreview(true)}>
          <Eye className="h-4 w-4 mr-2" />
          Preview RFA
        </Button>
        
        <PDFDownloadLink 
          document={<RFAPdfDocument extractedData={extractedData} />} 
          fileName={`Request_for_Admissions_${extractedData.case?.caseNumber || ''}.pdf`}
          style={{ textDecoration: 'none' }}
        >
          {({ blob, url, loading, error }) => (
            <Button variant="default" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download RFA
            </Button>
          )}
        </PDFDownloadLink>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Request for Admissions Preview</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden mt-4">
            <PDFViewer width="100%" height="100%" className="border rounded">
              <RFAPdfDocument extractedData={extractedData} />
            </PDFViewer>
          </div>
          
          <div className="flex justify-end items-center mt-4 space-x-2">
            <PDFDownloadLink 
              document={<RFAPdfDocument extractedData={extractedData} />} 
              fileName={`Request_For_Admissions_${extractedData.case?.caseNumber || ''}.pdf`}
              className="inline-flex"
            >
              {({ loading }) => (
                <Button variant="outline" size="sm" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download
                </Button>
              )}
            </PDFDownloadLink>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RFAPdfPreviewButton; 