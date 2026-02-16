import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, Save, RefreshCw, Sparkles, Download, Eye } from 'lucide-react';
import { useDemandLetterSupabasePersistence } from '@/hooks/use-demand-letter-supabase-persistence';
import { buildDemandLetterDocx } from '@/integrations/docx/demandLetter';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { AIEditModal } from './AIEditModal';
import { DemandLetterPreview } from './DemandLetterPreview';
import { ComplaintInformation } from '@/integrations/gemini/client';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { addDocumentsToVectorStore, searchVectorStore } from '@/integrations/openai/client';

interface DemandLetterGeneratorProps {
  caseId?: string;
  extractedData: ComplaintInformation | null;
  contextDocs?: string[]; // optionally pass in retrieved context from vector search
}

export function DemandLetterGenerator({ caseId, extractedData, contextDocs = [] }: DemandLetterGeneratorProps) {
  const { toast } = useToast();
  const { sections, bodyText, loading, hasPersistedData, generate, updateSection, persistEdits, aiEditSection, aiEditAll } = useDemandLetterSupabasePersistence({ caseId, extractedData });
  const [instructions, setInstructions] = useState('');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<'header'|'re_line'|'salutation'|'opening_paragraph'|'medical_providers'|'injuries'|'damages_summary'|'settlement_demand'|'closing'|'all'|null>(null);
  const [uploading, setUploading] = useState(false);
  const [supportDocs, setSupportDocs] = useState<{name:string; id:string;}[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [retrievedContext, setRetrievedContext] = useState<string[]>(contextDocs);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleGenerate = () => {
    generate(contextDocs, instructions);
  };

  const buildPdf = async () => {
    if (!sections) return null;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 50;
    let cursorY = height - margin;
    const lineHeight = 14;
    const wrapText = (text: string, maxWidth: number) => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        const size = font.widthOfTextAtSize(test, 12);
        if (size > maxWidth) { lines.push(line); line = w; } else { line = test; }
      }
      if (line) lines.push(line);
      return lines;
    };
    const addHeading = (h: string) => { const lines = wrapText(h, width - margin*2); lines.forEach(l=>{ cursorY -= lineHeight; page.drawText(l,{ x: margin, y: cursorY, size:12, font });}); cursorY -= lineHeight/2; };
    const addPara = (p: string) => {
      p.split(/\n+/).forEach(block=>{
        const lines = wrapText(block, width - margin*2);
        lines.forEach(l=>{ cursorY -= lineHeight; if (cursorY < margin){ page.drawText('--- Continued ---',{ x: margin, y: margin, size:10, font }); cursorY = height - margin; }
          page.drawText(l,{ x: margin, y: cursorY, size:12, font }); });
        cursorY -= lineHeight/2;
      });
    };
    addPara(sections.header);
    cursorY -= lineHeight;
    addPara(sections.re_line);
    cursorY -= lineHeight;
    addPara(sections.salutation);
    cursorY -= lineHeight;
    addPara(sections.opening_paragraph);
    if (sections.medical_providers) { addHeading('MEDICAL PROVIDERS'); addPara(sections.medical_providers); }
    if (sections.injuries) { addHeading('INJURIES SUSTAINED'); addPara(sections.injuries); }
    if (sections.damages_summary) { addHeading('DAMAGES'); addPara(sections.damages_summary); }
    addHeading('SETTLEMENT DEMAND');
    addPara(sections.settlement_demand);
    addPara(sections.closing);
  const bytes = await pdfDoc.save();
  const copy = new Uint8Array(bytes); // ensure ArrayBuffer not Shared
  return new Blob([copy], { type: 'application/pdf' });
  };

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!sections || !caseId) return;
    try {
      let blob: Blob;
      if (format === 'docx') blob = await buildDemandLetterDocx(sections);
      else {
        const built = await buildPdf(); if (!built) return; blob = built;
      }
  const ts = new Date().toISOString().split('T')[0];
  const fileName = `Demand_Letter_${caseId}_${ts}.${format}`;
  // Upload to storage (optional persistence for retrieval)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const path = `demand_letters/${caseId}/${fileName}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, blob, { upsert: true, contentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      if (upErr) throw upErr;
      // Get public URL (assuming bucket is public) or signed URL alternative
      const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
      // Update row
      await supabase.from('demand_letters').update({ [`${format}_url`]: pub.publicUrl }).eq('case_id', caseId);
      // Trigger browser download
  saveAs(blob, fileName);
      toast({ title: `${format.toUpperCase()} Ready`, description: 'File saved & downloaded.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      toast({ title: 'Export Error', description: msg, variant: 'destructive' });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!caseId) return;
    const files = e.target.files; if (!files?.length) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const newDocContents: { id:string; name:string; content:string; type:string }[] = [];
      for (const file of Array.from(files)) {
        const arrayBuf = await file.arrayBuffer();
        const textContent = await extractPlainText(arrayBuf, file.type);
        const objectPath = `demand-letter-support/${caseId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(objectPath, file, { upsert: true });
        if (upErr) throw upErr;
        const docId = crypto.randomUUID();
        supportDocs.push({ name: file.name, id: docId });
        newDocContents.push({ id: docId, name: file.name, content: textContent, type: 'demand_support' });
      }
      setSupportDocs([...supportDocs]);
  await addDocumentsToVectorStore(newDocContents, caseId, user.id);
      toast({ title: 'Uploaded', description: 'Supporting documents added & vectorized.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast({ title: 'Upload Failed', description: msg, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const extractPlainText = async (_buf: ArrayBuffer, _mime: string): Promise<string> => {
    // Placeholder: could add PDF parsing; for now we base64 to text flag
    return 'File content text extraction not yet implemented';
  };

  const retrieveContext = async () => {
    if (!caseId) return;
    setContextLoading(true);
    try {
      const query = 'Key factual summary for demand letter';
  const results = await searchVectorStore(query, caseId, 5);
  const ctx = results.map(r => r.content);
  setRetrievedContext(ctx);
  toast({ title: 'Context Retrieved', description: 'Vector context loaded.' });
    } catch (e) {
      toast({ title: 'Context Error', description: 'Failed retrieving context', variant: 'destructive' });
    } finally { setContextLoading(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><FileText className="h-5 w-5 mr-2" /> Demand Letter</CardTitle>
        <CardDescription>
          {hasPersistedData ? 'Review and refine the generated demand letter.' : 'Generate a professional demand letter using case information and optional supporting documents.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasPersistedData && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Optional Instructions to AI</label>
            <Input placeholder="e.g., Emphasize soft tissue damage and lost wages" value={instructions} onChange={e=>setInstructions(e.target.value)} />
            <Button onClick={handleGenerate} disabled={loading || !caseId}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Demand Letter</>}
            </Button>
          </div>
        )}

        {hasPersistedData && sections && (
          <div className="space-y-6">
            {(['header','re_line','salutation','opening_paragraph','medical_providers','injuries','damages_summary','settlement_demand','closing'] as const).map(key => (
              <div key={key} className="space-y-2 border rounded p-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold capitalize">{key.replace(/_/g, ' ')}</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={()=>{ setAiTarget(key); setAiModalOpen(true); }}>AI Edit</Button>
                  </div>
                </div>
                <Textarea value={sections[key] as string} onChange={e=>updateSection(key, e.target.value)} className="min-h-[120px]" />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={()=>generate(retrievedContext, instructions)} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Regenerate
              </Button>
              <Button variant="secondary" onClick={()=>{ setAiTarget('all'); setAiModalOpen(true); }} disabled={loading}>AI Improve All</Button>
              <Button variant="outline" onClick={()=>setPreviewOpen(true)}><Eye className="mr-2 h-4 w-4" /> Preview PDF</Button>
              <Button variant="outline" onClick={()=>handleDownload('pdf')}><Download className="mr-2 h-4 w-4" /> PDF</Button>
              <Button variant="outline" onClick={()=>handleDownload('docx')}><Download className="mr-2 h-4 w-4" /> DOCX</Button>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Full Preview</label>
              <Textarea value={bodyText} readOnly className="min-h-[240px] font-mono text-xs" />
            </div>
          </div>
        )}
        <div className="space-y-3 border p-3 rounded-md">
          <p className="text-sm font-medium">Supporting Documents</p>
          <input type="file" multiple onChange={handleUpload} disabled={uploading} className="text-sm" />
          <div className="flex flex-wrap gap-2 text-xs">{supportDocs.map(d=> <span key={d.id} className="px-2 py-1 bg-muted rounded">{d.name}</span>)}</div>
          <Button size="sm" variant="secondary" onClick={retrieveContext} disabled={contextLoading || !caseId}>
            {contextLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />} Load Vector Context
          </Button>
          {retrievedContext.length>0 && <Textarea readOnly value={retrievedContext.join('\n---\n')} className="text-xs h-32" />}
        </div>
      </CardContent>
      <AIEditModal
        isOpen={aiModalOpen}
        onClose={()=>setAiModalOpen(false)}
        originalText={aiTarget && aiTarget !== 'all' && sections ? sections[aiTarget] : aiTarget==='all' && sections ? JSON.stringify(sections, null, 2) : ''}
        loading={loading}
        onConfirm={async (prompt)=>{
          if (aiTarget === 'all') await aiEditAll(prompt); else if (aiTarget) await aiEditSection(aiTarget, prompt); setAiModalOpen(false); }}
      />
      {sections && (
        <DemandLetterPreview
          data={sections}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </Card>
  );
}

export default DemandLetterGenerator;
