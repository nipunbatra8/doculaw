# DocuLaw

## Demand Letter Workflow

The application now supports generating a pre-litigation Demand Letter:

1. Upload complaint and supporting documents (medical summaries, invoices, correspondence) in the Demand Letter card.
2. Documents are stored in the `documents` storage bucket and vectorized through the `vector-store` Edge Function (`addDocuments` action) for semantic retrieval.
3. Click Generate Demand Letter (optionally add custom AI instructions). Gemini produces structured JSON sections: Introduction, Liability, Damages, Demand, Closing.
4. Sections are persisted in `demand_letters` (one row per case) along with concatenated `body_text`.
5. You can refine each section inline and Save.
6. Regenerate uses current instructions and re-fetches vector context (`search` action) to enrich the draft.
7. Export to DOCX / PDF stores the file in storage under `demand_letters/<caseId>/` and updates `docx_url` / `pdf_url` columns.

### Table Schema
See migration: `supabase/migrations/20250924_create_demand_letters_table.sql`.

### Env Requirements
Ensure `VITE_SUPABASE_FUNCTIONS_URL` and `VITE_GEMINI_API_KEY` are set. Vectorization also requires OpenAI + Pinecone keys configured on the Supabase Edge Function.

### Future Enhancements
- Rich PDF layout (current PDF is placeholder text blob)
- Section-level AI refinement prompts
- Monetary damages insertion sourced from structured inputs
- Multi-version history (versioned edits)
