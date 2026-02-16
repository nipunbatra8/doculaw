# Vector Store Setup Guide (Server-Side)

This guide explains how to set up the OpenAI and Pinecone vector store integration for the AI Chat feature using Supabase Edge Functions.

## Prerequisites

1. **OpenAI API Key**: Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Pinecone Account**: Create an account at [Pinecone](https://www.pinecone.io/)
3. **Pinecone Index**: Create a new index with the following settings:
   - Name: `doculaw` (or any name you prefer)
   - Dimensions: `1536` (for text-embedding-3-small model)
   - Metric: `cosine`
   - Cloud: Choose your preferred region
4. **Supabase CLI**: Install and configure Supabase CLI for deploying Edge Functions

## Environment Variables

### Supabase Edge Function Environment Variables

Set these in your Supabase dashboard under Settings > Edge Functions:

```env
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=doculaw
```

### Frontend Environment Variables

No OpenAI or Pinecone API keys are needed in the frontend since all operations are server-side.

## Deployment

### 1. Deploy the Vector Store Edge Function

```bash
# Navigate to the vector-store function directory
cd supabase/functions/vector-store

# Deploy the function
supabase functions deploy vector-store

# Set the environment variables
supabase secrets set OPENAI_API_KEY=your_openai_api_key
supabase secrets set PINECONE_API_KEY=your_pinecone_api_key
supabase secrets set PINECONE_INDEX_NAME=doculaw
```

### 2. Verify Deployment

The function will be available at:
```
https://your-project-ref.supabase.co/functions/v1/vector-store
```

## Features

### Document Processing
- **Text Extraction**: PDF documents are automatically processed to extract text content
- **Chunking**: Large documents are split into smaller chunks (1000 characters) with overlap (200 characters)
- **Embeddings**: Each chunk is converted to a 1536-dimensional vector using OpenAI's text-embedding-3-small model
- **Metadata**: Each vector includes metadata about the document, case, and chunk position

### AI Chat Integration
- **Semantic Search**: User queries are converted to embeddings and matched against document chunks
- **Context Retrieval**: The most relevant document chunks are retrieved and used as context
- **AI Responses**: GPT-4o-mini generates responses based on the retrieved context
- **Source Citation**: AI responses can reference specific documents and sections

### Vector Store Operations
- **Automatic Sync**: Existing case documents are automatically synced to the vector store
- **Real-time Updates**: New documents are added to the vector store when uploaded
- **Cleanup**: Document vectors are deleted when documents are removed from cases
- **Case Isolation**: Each case has its own isolated vector space

## API Endpoints

The vector-store Edge Function provides the following endpoints:

### POST /functions/v1/vector-store

**Actions:**

1. **addDocuments**
   ```json
   {
     "action": "addDocuments",
     "data": {
       "documents": [...],
       "caseId": "case_id",
       "userId": "user_id"
     }
   }
   ```

2. **search**
   ```json
   {
     "action": "search",
     "data": {
       "query": "search query",
       "caseId": "case_id",
       "topK": 5
     }
   }
   ```

3. **getAIResponse**
   ```json
   {
     "action": "getAIResponse",
     "data": {
       "query": "user question",
       "caseId": "case_id",
       "contextLimit": 5
     }
   }
   ```

4. **deleteDocument**
   ```json
   {
     "action": "deleteDocument",
     "data": {
       "documentId": "document_id"
     }
   }
   ```

## Usage

1. **Upload Documents**: Documents uploaded through the AI Chat page are automatically processed and added to the vector store
2. **Ask Questions**: Users can ask questions about their case documents in natural language
3. **Get Contextual Responses**: The AI provides responses based on the actual content of the case documents
4. **Document Management**: Deleting documents also removes them from the vector store

## Error Handling

- **Graceful Degradation**: If vector store operations fail, the application continues to work
- **Fallback Responses**: If AI responses fail, users receive helpful error messages
- **Logging**: All vector store operations are logged for debugging

## Performance Considerations

- **Batch Processing**: Documents are processed in batches of 100 vectors
- **Server-Side Processing**: All heavy computation happens on the server
- **Async Operations**: All vector store operations are asynchronous and don't block the UI
- **Edge Function Optimization**: Functions are optimized for cold start performance

## Security

- **Server-Side API Keys**: All API keys are stored securely on the server
- **User Isolation**: Each user's documents are isolated in the vector store
- **Case Isolation**: Documents are filtered by case ID for security
- **No Client-Side Secrets**: No sensitive API keys are exposed to the client
- **CORS Protection**: Proper CORS headers are set for security

## Monitoring

- **Function Logs**: Monitor Edge Function logs in the Supabase dashboard
- **Error Tracking**: All errors are logged with detailed information
- **Performance Metrics**: Track function execution times and resource usage

## Troubleshooting

### Common Issues

1. **Function Not Deployed**: Ensure the Edge Function is properly deployed
2. **Environment Variables**: Verify all environment variables are set correctly
3. **Pinecone Index**: Ensure the Pinecone index exists and is accessible
4. **API Limits**: Monitor OpenAI and Pinecone API usage limits

### Debug Steps

1. Check Supabase Edge Function logs
2. Verify environment variables are set
3. Test API endpoints directly
4. Check Pinecone index status
5. Monitor OpenAI API usage 