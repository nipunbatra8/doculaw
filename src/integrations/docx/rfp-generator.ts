import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { ComplaintInformation } from '@/integrations/gemini/client';

export function generateRfpDoc(
  extractedData: ComplaintInformation,
  productions: string[],
  definitions: string[],
): Document {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'REQUEST FOR PRODUCTION OF DOCUMENTS',
            heading: HeadingLevel.TITLE,
            alignment: 'center',
          }),
          new Paragraph({ text: '' }), // Spacer
          
          // Case Information
          new Paragraph({
            children: [
              new TextRun({ text: 'Plaintiff: ', bold: true }),
              new TextRun(extractedData.plaintiff || ''),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Defendant: ', bold: true }),
              new TextRun(extractedData.defendant || ''),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Case Number: ', bold: true }),
              new TextRun(extractedData.caseNumber || ''),
            ],
          }),
          new Paragraph({ text: '' }), // Spacer

          // Definitions
          new Paragraph({
            text: 'DEFINITIONS',
            heading: HeadingLevel.HEADING_1,
          }),
          ...definitions.map(
            (def) => new Paragraph({ text: def, bullet: { level: 0 } }),
          ),
          new Paragraph({ text: '' }), // Spacer

          // Productions
          new Paragraph({
            text: 'DOCUMENTS TO BE PRODUCED',
            heading: HeadingLevel.HEADING_1,
          }),
          ...productions.map(
            (prod, index) =>
              new Paragraph({
                children: [
                  new TextRun(`${index + 1}. `),
                  new TextRun(prod),
                ],
              }),
          ),
        ],
      },
    ],
  });

  return doc;
}
