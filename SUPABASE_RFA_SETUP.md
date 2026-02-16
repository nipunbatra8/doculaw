# Request for Admissions - Supabase Integration & AI Editing

This document explains the new Supabase integration and AI editing features for the Request for Admissions functionality.

## 🗄️ Database Setup

### 1. Create the Supabase Table

Run the following SQL migration in your Supabase SQL editor:

```sql
-- Create request_for_admissions table
CREATE TABLE IF NOT EXISTS request_for_admissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id TEXT NOT NULL,
  admissions TEXT[] NOT NULL DEFAULT '{}',
  definitions TEXT[] NOT NULL DEFAULT '{}',
  is_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(case_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_request_for_admissions_case_id ON request_for_admissions(case_id);
CREATE INDEX IF NOT EXISTS idx_request_for_admissions_created_by ON request_for_admissions(created_by);

-- Enable Row Level Security
ALTER TABLE request_for_admissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own request for admissions" ON request_for_admissions
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own request for admissions" ON request_for_admissions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own request for admissions" ON request_for_admissions
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own request for admissions" ON request_for_admissions
  FOR DELETE USING (auth.uid() = created_by);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_request_for_admissions_updated_at
  BEFORE UPDATE ON request_for_admissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Environment Variables

Make sure you have the following environment variables set (this should already be configured):

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## 🚀 New Features

### 1. Supabase Persistence

- **Replaces Local Storage**: Request for Admissions data is now stored in Supabase instead of browser local storage
- **User-Specific**: Each user can only access their own data (Row Level Security)
- **Persistent**: Data persists across devices and browser sessions
- **Real-time**: Changes are immediately saved to the database

### 2. AI-Powered Editing

- **AI Edit Admissions**: Use natural language prompts to modify admissions
- **AI Edit Definitions**: Use natural language prompts to modify definitions
- **Smart Context**: AI understands the current content and legal context
- **Maintains Format**: AI preserves the legal document structure and numbering

## 🎯 How to Use

### Generating Request for Admissions

1. Upload a complaint document
2. Click "Generate Request for Admissions"
3. The system will:
   - Extract relevant information from the complaint
   - Generate admissions and definitions using AI
   - Save everything to Supabase
   - Display the generated content

### AI Editing

1. After generating content, you'll see two new buttons:
   - **"AI Edit Admissions"** - Edit the admissions with AI
   - **"AI Edit Definitions"** - Edit the definitions with AI

2. Click either button to open the AI Edit Modal

3. In the modal:
   - Review the current content
   - Enter a natural language prompt describing your desired changes
   - Click "Edit with AI"
   - The AI will modify the content based on your prompt

### Example AI Prompts

**For Admissions:**
- "Make the admissions more specific about the accident details"
- "Add admissions about the defendant's insurance coverage"
- "Make the admissions more aggressive and direct"
- "Add admissions about the plaintiff's injuries"

**For Definitions:**
- "Add more legal definitions for medical terms"
- "Include definitions for insurance terminology"
- "Add definitions for vehicle-related terms"
- "Make the definitions more comprehensive"

## 🔧 Technical Implementation

### Files Added/Modified

1. **`src/hooks/use-rfa-supabase-persistence.ts`** - New Supabase persistence hook
2. **`src/components/discovery/AIEditModal.tsx`** - AI editing modal component
3. **`src/components/discovery/RequestForAdmissionsPdfButton.tsx`** - Updated with AI editing
4. **`src/integrations/gemini/client.ts`** - Existing Gemini client (already configured)
5. **`supabase/migrations/20241222_create_request_for_admissions_table.sql`** - Database migration

### Key Features

- **Type Safety**: Full TypeScript support
- **Error Handling**: Comprehensive error handling with user feedback
- **Loading States**: Visual feedback during AI processing
- **Data Validation**: Input validation and sanitization
- **Security**: Row Level Security ensures data privacy

## 🔒 Security

- **Row Level Security (RLS)**: Users can only access their own data
- **Authentication Required**: All operations require user authentication
- **Input Validation**: All inputs are validated and sanitized
- **API Rate Limiting**: OpenAI API calls are properly handled

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to save content"**
   - Check if the Supabase table exists
   - Verify RLS policies are set up correctly
   - Ensure user is authenticated

2. **"AI Edit Failed"**
   - Check if VITE_GEMINI_API_KEY is set
   - Verify Gemini API connectivity
   - Check network connectivity

3. **"Data not loading"**
   - Check browser console for errors
   - Verify Supabase connection
   - Check if user has proper permissions

### Debug Mode

Enable debug logging by adding to your browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## 📝 Migration from Local Storage

The system automatically migrates from local storage to Supabase:
- Existing local storage data will be loaded on first use
- New data will be saved to Supabase
- Old local storage data can be cleared manually

## 🎉 Benefits

1. **Cross-Device Access**: Access your data from any device
2. **Collaboration**: Multiple users can work on the same case
3. **Backup**: Data is automatically backed up in Supabase
4. **AI Enhancement**: Natural language editing capabilities
5. **Professional Quality**: AI maintains legal document standards
6. **Scalability**: Database storage scales with your needs

## 🔄 Future Enhancements

- **Version History**: Track changes over time
- **Collaborative Editing**: Multiple users editing simultaneously
- **Template Library**: Save and reuse common admissions/definitions
- **Advanced AI**: More sophisticated legal AI capabilities
- **Export Options**: Additional export formats
