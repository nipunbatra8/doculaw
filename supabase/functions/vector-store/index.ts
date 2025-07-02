import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.0.0'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
}

// Initialize clients with error handling
let openai: OpenAI | null = null
let pineconeApiKey: string | null = null
let pineconeIndexName: string | null = null
let pineconeHost: string | null = null

try {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  pineconeApiKey = Deno.env.get('PINECONE_API_KEY')
  pineconeIndexName = Deno.env.get('PINECONE_INDEX_NAME') || 'doculaw'

  if (openaiApiKey) {
    openai = new OpenAI({ apiKey: openaiApiKey })
  }
  
  if (pineconeApiKey) {
    // For Pinecone, we need to construct the host URL differently
    // The format is: https://<index-name>-<project-id>.svc.<environment>.pinecone.io
    // But we need to get the project ID and environment from the Pinecone dashboard
    // For now, let's use a simpler approach and require the full host URL
    
    // Try to get the host from environment variable first
    const pineconeHostEnv = Deno.env.get('PINECONE_HOST')
    if (pineconeHostEnv) {
      pineconeHost = pineconeHostEnv
    } else {
      // Fallback: try to construct from API key (this might not work for all formats)
      // Pinecone API keys are typically in format: <project-id>-<environment>
      const parts = pineconeApiKey.split('-')
      if (parts.length >= 2) {
        const projectId = parts[0]
        const environment = parts[1]
        pineconeHost = `https://${pineconeIndexName}-${projectId}.svc.${environment}.pinecone.io`
      }
    }
  }
} catch (error) {
  console.error('Error initializing clients:', error)
}

// Types
interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    caseId: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
    userId: string;
    type: string;
    createdAt: string;
  };
}

interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    caseId: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
    userId: string;
    type: string;
    createdAt: string;
    content: string;
  };
}

interface SearchResult {
  id: string;
  score: number;
  metadata: DocumentChunk['metadata'];
  content: string;
}

/**
 * Split text into chunks for embedding
 */
function splitTextIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);
    
    // Try to break at a sentence boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + chunkSize * 0.7) {
        chunk = text.slice(start, breakPoint + 1);
        start = breakPoint + 1;
      } else {
        start = end - overlap;
      }
    } else {
      start = end;
    }
    
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }
  
  return chunks;
}

/**
 * Create embeddings for text chunks
 */
async function createEmbeddings(chunks: string[]): Promise<number[][]> {
  if (!openai) {
    throw new Error('OpenAI client not initialized - check OPENAI_API_KEY environment variable');
  }
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunks,
    });
    
    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error creating embeddings:', error);
    throw new Error('Failed to create embeddings');
  }
}

/**
 * Make direct HTTP calls to Pinecone API
 */
async function pineconeUpsert(vectors: VectorRecord[]): Promise<void> {
  if (!pineconeHost || !pineconeApiKey) {
    throw new Error('Pinecone not initialized - check PINECONE_API_KEY environment variable');
  }

  const response = await fetch(`${pineconeHost}/vectors/upsert`, {
    method: 'POST',
    headers: {
      'Api-Key': pineconeApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vectors: vectors.map(v => ({
        id: v.id,
        values: v.values,
        metadata: v.metadata,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinecone upsert failed: ${response.status} ${errorText}`);
  }
}

async function pineconeQuery(vector: number[], filter: any, topK: number = 5): Promise<any> {
  if (!pineconeHost || !pineconeApiKey) {
    throw new Error('Pinecone not initialized - check PINECONE_API_KEY environment variable');
  }

  const response = await fetch(`${pineconeHost}/query`, {
    method: 'POST',
    headers: {
      'Api-Key': pineconeApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vector,
      filter,
      topK,
      includeMetadata: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinecone query failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

async function pineconeDelete(vectorIds: string[]): Promise<void> {
  if (!pineconeHost || !pineconeApiKey) {
    throw new Error('Pinecone not initialized - check PINECONE_API_KEY environment variable');
  }

  const response = await fetch(`${pineconeHost}/vectors/delete`, {
    method: 'POST',
    headers: {
      'Api-Key': pineconeApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids: vectorIds,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinecone delete failed: ${response.status} ${errorText}`);
  }
}

/**
 * Add documents to the vector store
 */
async function addDocumentsToVectorStore(
  documents: Array<{
    id: string;
    name: string;
    content: string;
    type: string;
  }>,
  caseId: string,
  userId: string
): Promise<void> {
  if (!pineconeHost || !pineconeApiKey) {
    throw new Error('Pinecone not initialized - check PINECONE_API_KEY environment variable');
  }
  
  try {
    const vectors: VectorRecord[] = [];
    
    for (const doc of documents) {
      // Split document into chunks
      const chunks = splitTextIntoChunks(doc.content);
      
      // Create embeddings for chunks
      const embeddings = await createEmbeddings(chunks);
      
      // Create vector objects for Pinecone
      for (let i = 0; i < chunks.length; i++) {
        const vectorId = `${doc.id}_chunk_${i}`;
        
        vectors.push({
          id: vectorId,
          values: embeddings[i],
          metadata: {
            caseId,
            documentId: doc.id,
            documentName: doc.name,
            chunkIndex: i,
            userId,
            type: doc.type,
            createdAt: new Date().toISOString(),
            content: chunks[i],
          },
        });
      }
    }
    
    // Upsert vectors to Pinecone in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await pineconeUpsert(batch);
    }
    
    console.log(`Successfully added ${vectors.length} vectors to vector store for case ${caseId}`);
  } catch (error) {
    console.error('Error adding documents to vector store:', error);
    throw new Error('Failed to add documents to vector store');
  }
}

/**
 * Search for similar documents in the vector store
 */
async function searchVectorStore(
  query: string,
  caseId: string,
  topK: number = 5
): Promise<SearchResult[]> {
  if (!pineconeHost || !pineconeApiKey) {
    throw new Error('Pinecone not initialized - check PINECONE_API_KEY environment variable');
  }
  
  try {
    // Create embedding for the query
    const queryEmbedding = await createEmbeddings([query]);
    
    // Search in Pinecone
    const searchResponse = await pineconeQuery(
      queryEmbedding[0],
      { caseId: { $eq: caseId } },
      topK
    );
    
    // Transform results
    return searchResponse.matches.map((match: any) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as DocumentChunk['metadata'],
      content: String(match.metadata?.content || ''),
    }));
  } catch (error) {
    console.error('Error searching vector store:', error);
    throw new Error('Failed to search vector store');
  }
}

/**
 * Delete vectors for a specific document
 */
async function deleteDocumentVectors(documentId: string): Promise<void> {
  if (!pineconeHost || !pineconeApiKey) {
    throw new Error('Pinecone not initialized - check PINECONE_API_KEY environment variable');
  }
  
  try {
    // First, get all vectors for the document
    const queryResponse = await pineconeQuery(
      new Array(1536).fill(0), // Dummy vector for metadata-only query
      { documentId: { $eq: documentId } },
      10000
    );
    
    // Delete the vectors
    if (queryResponse.matches.length > 0) {
      const vectorIds = queryResponse.matches.map((match: any) => match.id);
      await pineconeDelete(vectorIds);
      console.log(`Deleted ${vectorIds.length} vectors for document ${documentId}`);
    }
  } catch (error) {
    console.error('Error deleting document vectors:', error);
    throw new Error('Failed to delete document vectors');
  }
}

/**
 * Get AI response with context from vector store
 */
async function getAIResponseWithContext(
  query: string,
  caseId: string,
  contextLimit: number = 5
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI client not initialized - check OPENAI_API_KEY environment variable');
  }
  
  try {
    // Search for relevant context
    const searchResults = await searchVectorStore(query, caseId, contextLimit);
    
    // Build context from search results
    const context = searchResults
      .map(result => `Document: ${result.metadata.documentName}\nContent: ${result.content}`)
      .join('\n\n');
    
    // Create the prompt with context
    const prompt = `You are a legal AI assistant helping with a case. Use the following context from case documents to answer the user's question. If the context doesn't contain relevant information, say so.

Context from case documents:
${context}

User question: ${query}

Please provide a helpful, accurate response based on the context provided. If you need more information, suggest what additional documents might be helpful.`;

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful legal AI assistant. Provide accurate, helpful responses based on the context provided. Always cite the source documents when possible.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });
    
    return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error getting AI response with context:', error);
    throw new Error('Failed to get AI response');
  }
}

serve(async (req) => {
  // Handle CORS preflight requests FIRST - before any other logic
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  // Handle health check
  if (req.method === 'GET' && req.url.includes('health')) {
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        message: 'Vector store function is running',
        openai: !!openai,
        pinecone: !!(pineconeHost && pineconeApiKey),
        pineconeHost: pineconeHost ? 'configured' : 'not configured',
        debug: {
          hasOpenaiKey: !!Deno.env.get('OPENAI_API_KEY'),
          hasPineconeKey: !!Deno.env.get('PINECONE_API_KEY'),
          hasPineconeIndex: !!Deno.env.get('PINECONE_INDEX_NAME'),
          pineconeKeyLength: Deno.env.get('PINECONE_API_KEY')?.length || 0,
          pineconeIndexName: Deno.env.get('PINECONE_INDEX_NAME') || 'not set'
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }

  // Only allow POST requests for actual operations
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }

  try {
    const body = await req.json()
    const { action, data } = body

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    switch (action) {
      case 'addDocuments': {
        const { documents, caseId, userId } = data
        await addDocumentsToVectorStore(documents, caseId, userId)
        return new Response(
          JSON.stringify({ success: true, message: 'Documents added to vector store' }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      case 'search': {
        const { query, caseId: searchCaseId, topK } = data
        const results = await searchVectorStore(query, searchCaseId, topK)
        return new Response(
          JSON.stringify({ success: true, results }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      case 'getAIResponse': {
        const { query: aiQuery, caseId: aiCaseId, contextLimit } = data
        const response = await getAIResponseWithContext(aiQuery, aiCaseId, contextLimit)
        return new Response(
          JSON.stringify({ success: true, response }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      case 'deleteDocument': {
        const { documentId } = data
        await deleteDocumentVectors(documentId)
        return new Response(
          JSON.stringify({ success: true, message: 'Document vectors deleted' }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
    }
  } catch (error) {
    console.error('Error in vector store function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
}) 