import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { ComplaintInformation } from "@/integrations/gemini/client";
import { getAIResponseWithContext } from "@/integrations/openai/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  PageBreak,
  LineNumberRestartFormat
} from "docx";
import { saveAs } from "file-saver";

interface RequestForAdmissionsDocxButtonProps {
  extractedData: ComplaintInformation;
  caseId?: string;
  admissions: string[];
  definitions: string[];
}

const RequestForAdmissionsDocxButton = ({
  extractedData,
  caseId,
  admissions,
  definitions
}: RequestForAdmissionsDocxButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const createWordDocument = async () => {
    setIsGenerating(true);
    toast({
      title: "Generating DOCX...",
      description: "Your Request for Admissions document is being created.",
    });

    try {
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 720, // 1 inch
                  right: 720,
                  bottom: 720,
                  left: 720,
                },
              },
              lineNumbers: {
                countBy: 1,
                restart: LineNumberRestartFormat.NEW_PAGE,
              },
            },
            children: [
              // Attorney Information
              new Paragraph({
                children: [
                  new TextRun({
                    text: extractedData.attorney?.name || "Attorney Name",
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: extractedData.attorney?.firm || "Law Firm",
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                text: `${extractedData.attorney?.address?.street || "Street Address"}`,
              }),
              new Paragraph({
                text: `${extractedData.attorney?.address?.city || "City"}, ${
                  extractedData.attorney?.address?.state || "State"
                } ${extractedData.attorney?.address?.zip || "ZIP"}`,
              }),
              new Paragraph({
                text: `Telephone: ${extractedData.attorney?.phone || "N/A"}`,
              }),
              new Paragraph({
                text: `Facsimile: ${extractedData.attorney?.fax || "N/A"}`,
              }),
              new Paragraph({
                text: `Email: ${extractedData.attorney?.email || "N/A"}`,
              }),
              new Paragraph({ text: "" }),
              new Paragraph({
                text: `Attorney for ${
                  extractedData.attorney?.attorneyFor || "Plaintiff"
                },`,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      extractedData.plaintiff?.split(",")[0] || "PLAINTIFF",
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({ text: "" }),

              // Court Title
              new Paragraph({
                text: "SUPERIOR COURT OF THE STATE OF CALIFORNIA",
                alignment: AlignmentType.CENTER,
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({
                text: `FOR THE COUNTY OF ${
                  extractedData.court?.county?.toUpperCase() || "COUNTY"
                }`,
                alignment: AlignmentType.CENTER,
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({ text: "" }),

              // Case Caption Table
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({ text: extractedData.plaintiff || "Plaintiff Name," }),
                          new Paragraph({ text: "" }),
                          new Paragraph({ text: "Plaintiff," }),
                          new Paragraph({ text: "vs." }),
                          new Paragraph({ text: "" }),
                          new Paragraph({ text: extractedData.defendant || "Defendant Name," }),
                          new Paragraph({ text: "" }),
                          new Paragraph({ text: "Defendants." }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({ text: `Case No.: ${extractedData.caseNumber || "N/A"}` }),
                          new Paragraph({ text: "" }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "PLAINTIFF'S REQUEST FOR ADMISSIONS",
                                bold: true,
                              }),
                            ],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "TO DEFENDANT, SET ONE",
                                bold: true,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({ text: "" }),

              // Propounding Parties
              new Paragraph({
                children: [
                  new TextRun({ text: "PROPOUNDING PARTY: ", bold: true }),
                  new TextRun({ text: `Plaintiff, ${extractedData.plaintiff?.split(",")[0]}` }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "RESPONDING PARTY:   ", bold: true }),
                  new TextRun({ text: `Defendant, ${extractedData.defendant?.split(",")[0]}` }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "SET NUMBER:         ", bold: true }),
                  new TextRun({ text: "ONE" }),
                ],
              }),
              new Paragraph({ text: "" }),

              // Introduction
              new Paragraph({ text: "TO ALL PARTIES HEREIN AND TO THEIR RESPECTIVE ATTORNEYS OF RECORD:" }),
              new Paragraph({ text: "" }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Pursuant to California " }),
                  new TextRun({ text: "Code of Civil Procedure Section 2033.010", underline: {} }),
                  new TextRun({ text: ", you are hereby requested to admit the truth of the following facts or assertions. Your response is due within thirty days from the date of service of this request for admissions." }),
                ],
              }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "" }),

              // Page Break
              new Paragraph({ children: [new PageBreak()] }),

              // Definitions
              new Paragraph({
                children: [new TextRun({ text: "DEFINITIONS", bold: true })],
              }),
              new Paragraph({ text: "" }),
              ...definitions.map(
                (def) => new Paragraph({ text: def })
              ),
              new Paragraph({ text: "" }),

              // Admissions
              new Paragraph({
                children: [
                  new TextRun({ text: "YOU ARE REQUESTED TO ADMIT THAT:", bold: true }),
                ],
              }),
              new Paragraph({ text: "" }),
              ...admissions.map(
                (adm, index) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: `${index + 1}. `, bold: true }),
                      new TextRun({ text: adm }),
                    ],
                    spacing: { after: 200 },
                  })
              ),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "" }),

              // Signature Block
              new Paragraph({
                text: `Dated: ${new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}`,
                alignment: AlignmentType.RIGHT,
              }),
              new Paragraph({ text: "", spacing: { after: 600 } }),
              new Paragraph({
                text: extractedData.attorney?.firm || "Law Firm",
                alignment: AlignmentType.RIGHT,
              }),
              new Paragraph({ text: "", spacing: { after: 1200 } }),
              new Paragraph({
                text: "By: ______________________________",
                alignment: AlignmentType.RIGHT,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: extractedData.attorney?.name || "Attorney Name",
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
              new Paragraph({
                text: "Attorney for Plaintiff",
                alignment: AlignmentType.RIGHT,
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Request for Admissions - ${extractedData.plaintiff?.split(',')[0]}.docx`);
      toast({
        title: "Download Ready",
        description: "Your DOCX file has been downloaded.",
      });
    } catch (error) {
      console.error("Error generating DOCX:", error);
      toast({
        title: "Generation Failed",
        description: "Could not create the DOCX file.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={createWordDocument}
      disabled={isGenerating}
      variant="outline"
    >
      <Download className="h-4 w-4 mr-2" />
      {isGenerating ? "Generating..." : "Download DOCX"}
    </Button>
  );
};

export default RequestForAdmissionsDocxButton;
