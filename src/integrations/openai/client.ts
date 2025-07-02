import { supabase } from "@/integrations/supabase/client";

// Types for vector store operations
export interface DocumentChunk {
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

export interface SearchResult {
  id: string;
  score: number;
  metadata: DocumentChunk['metadata'];
  content: string;
}

export interface VectorRecord {
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

/**
 * Add documents to the vector store via server-side API
 */
export async function addDocumentsToVectorStore(
  documents: Array<{
    id: string;
    name: string;
    content: string;
    type: string;
  }>,
  caseId: string,
  userId: string
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('vector-store', {
      body: {
        action: 'addDocuments',
        data: {
          documents,
          caseId,
          userId,
        },
      },
    });

    if (error) throw error;
    
    console.log(`Successfully added documents to vector store for case ${caseId}`);
  } catch (error) {
    console.error('Error adding documents to vector store:', error);
    throw new Error('Failed to add documents to vector store');
  }
}

/**
 * Search for similar documents in the vector store via server-side API
 */
export async function searchVectorStore(
  query: string,
  caseId: string,
  topK: number = 5
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke('vector-store', {
      body: {
        action: 'search',
        data: {
          query,
          caseId,
          topK,
        },
      },
    });

    if (error) throw error;
    
    return data.results;
  } catch (error) {
    console.error('Error searching vector store:', error);
    throw new Error('Failed to search vector store');
  }
}

/**
 * Delete vectors for a specific document via server-side API
 */
export async function deleteDocumentVectors(documentId: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('vector-store', {
      body: {
        action: 'deleteDocument',
        data: {
          documentId,
        },
      },
    });

    if (error) throw error;
    
    console.log(`Deleted vectors for document ${documentId}`);
  } catch (error) {
    console.error('Error deleting document vectors:', error);
    throw new Error('Failed to delete document vectors');
  }
}

/**
 * Get AI response with context from vector store via server-side API
 */
export async function getAIResponseWithContext(
  query: string,
  caseId: string,
  contextLimit: number = 5
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('vector-store', {
      body: {
        action: 'getAIResponse',
        data: {
          query,
          caseId,
          contextLimit,
        },
      },
    });

    if (error) throw error;
    
    return data.response;
  } catch (error) {
    console.error('Error getting AI response with context:', error);
    throw new Error('Failed to get AI response');
  }
} 