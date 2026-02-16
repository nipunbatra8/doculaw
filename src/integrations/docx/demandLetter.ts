import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } from 'docx';

export interface DemandLetterSections {
  header: string;
  re_line: string;
  salutation: string;
  opening_paragraph: string;
  medical_providers: string;
  injuries: string;
  damages_summary: string;
  settlement_demand: string;
  closing: string;
  tone?: string;
}

export async function buildDemandLetterDocx(sections: DemandLetterSections): Promise<Blob> {
  const children: Paragraph[] = [];
  
  // Header (date/transmission)
  children.push(new Paragraph({ text: sections.header, alignment: AlignmentType.RIGHT, spacing: { after: 200 } }));
  
  // RE line
  children.push(new Paragraph({ text: sections.re_line, spacing: { after: 200 } }));
  
  // Salutation
  children.push(new Paragraph({ text: sections.salutation, spacing: { after: 200 } }));
  
  // Opening paragraph
  sections.opening_paragraph.split(/\n+/).forEach(p => children.push(new Paragraph(p.trim() || '')));
  children.push(new Paragraph({ text: '' }));
  
  // Medical providers
  if (sections.medical_providers.trim()) {
    children.push(new Paragraph({ text: 'MEDICAL PROVIDERS', heading: HeadingLevel.HEADING_2 }));
    sections.medical_providers.split(/\n+/).forEach(p => children.push(new Paragraph(p.trim() || '')));
    children.push(new Paragraph({ text: '' }));
  }
  
  // Injuries
  if (sections.injuries.trim()) {
    children.push(new Paragraph({ text: 'INJURIES SUSTAINED', heading: HeadingLevel.HEADING_2 }));
    sections.injuries.split(/\n+/).forEach(p => children.push(new Paragraph(p.trim() || '')));
    children.push(new Paragraph({ text: '' }));
  }
  
  // Damages
  if (sections.damages_summary.trim()) {
    children.push(new Paragraph({ text: 'DAMAGES', heading: HeadingLevel.HEADING_2 }));
    sections.damages_summary.split(/\n+/).forEach(p => children.push(new Paragraph(p.trim() || '')));
    children.push(new Paragraph({ text: '' }));
  }
  
  // Settlement demand
  children.push(new Paragraph({ text: 'SETTLEMENT DEMAND', heading: HeadingLevel.HEADING_2 }));
  sections.settlement_demand.split(/\n+/).forEach(p => children.push(new Paragraph(p.trim() || '')));
  children.push(new Paragraph({ text: '' }));
  
  // Closing
  sections.closing.split(/\n+/).forEach(p => children.push(new Paragraph(p.trim() || '')));
  
  // Signature block
  children.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  children.push(new Paragraph({ text: 'Sincerely,', spacing: { after: 200 } }));
  children.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  children.push(new Paragraph({ text: '______________________________' }));
  children.push(new Paragraph({ text: 'Attorney Name' }));
  children.push(new Paragraph({ text: 'Attorney for Plaintiff' }));

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBlob(doc);
  return buffer;
}

// Lightweight text-to-PDF (placeholder: still plain text inside .pdf for now)
export async function buildDemandLetterPdf(sections: DemandLetterSections): Promise<Blob> {
  const content = `${sections.header}\n\n${sections.re_line}\n\n${sections.salutation}\n\n${sections.opening_paragraph}\n\nMEDICAL PROVIDERS\n${sections.medical_providers}\n\nINJURIES SUSTAINED\n${sections.injuries}\n\nDAMAGES\n${sections.damages_summary}\n\nSETTLEMENT DEMAND\n${sections.settlement_demand}\n\n${sections.closing}`;
  return new Blob([content], { type: 'application/pdf' });
}
