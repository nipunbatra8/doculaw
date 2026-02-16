import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { ComplaintInformation } from '@/integrations/gemini/client';

export function generateSiDoc(extractedData: ComplaintInformation, interrogatories: string[], definitions: string[]) {
  const plaintiff = extractedData.plaintiff || 'PLAINTIFF';
  const defendant = extractedData.defendant || 'DEFENDANT';
  const caseNumber = extractedData.case?.caseNumber || extractedData.caseNumber || 'CASE-000';

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: 'SPECIAL INTERROGATORIES', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Case No.: ${caseNumber}` }),
          new Paragraph({ text: `Propounding Party: ${plaintiff}` }),
          new Paragraph({ text: `Responding Party: ${defendant}` }),
          new Paragraph({ text: `Set Number: ONE` }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'DEFINITIONS', heading: HeadingLevel.HEADING_3 }),
          ...definitions.map((d, i) => new Paragraph({ text: `${i + 1}. ${d}` })),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'SPECIAL INTERROGATORIES', heading: HeadingLevel.HEADING_3 }),
          ...interrogatories.map((q, i) => [
            new Paragraph({ children: [ new TextRun({ text: `INTERROGATORY NO. ${i + 1}:`, bold: true }) ] }),
            new Paragraph({ text: q }),
          ]).flat(),
        ],
      },
    ],
  });

  return doc;
}
