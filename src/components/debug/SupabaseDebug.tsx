import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export const SupabaseDebug: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test basic connection
      const { data, error } = await supabase.from('request_for_admissions').select('count').limit(1);
      
      if (error) {
        throw error;
      }
      
      setResults({ type: 'connection', success: true, data });
      toast({
        title: "Connection Test",
        description: "Successfully connected to Supabase!",
      });
    } catch (error: any) {
      setResults({ type: 'connection', success: false, error: error.message });
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testTableExists = async () => {
    setLoading(true);
    try {
      // Try to select from the table
      const { data, error } = await supabase
        .from('request_for_admissions')
        .select('*')
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      setResults({ type: 'table', success: true, data });
      toast({
        title: "Table Test",
        description: "Table exists and is accessible!",
      });
    } catch (error: any) {
      setResults({ type: 'table', success: false, error: error.message });
      toast({
        title: "Table Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        throw error;
      }
      
      setResults({ type: 'auth', success: true, data: user });
      toast({
        title: "Auth Test",
        description: user ? `User authenticated: ${user.email}` : "No user authenticated",
      });
    } catch (error: any) {
      setResults({ type: 'auth', success: false, error: error.message });
      toast({
        title: "Auth Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testInsert = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const testData = {
        case_id: `test-${Date.now()}`,
        admissions: ['Test admission 1', 'Test admission 2'],
        definitions: ['Test definition 1'],
        is_generated: true,
        created_by: user.id
      };

      console.log('Attempting to insert test data:', testData);

      const { data, error } = await supabase
        .from('request_for_admissions')
        .insert(testData)
        .select();
      
      console.log('Insert result:', { data, error });
      
      if (error) {
        throw error;
      }
      
      setResults({ type: 'insert', success: true, data });
      toast({
        title: "Insert Test",
        description: "Successfully inserted test data!",
      });
    } catch (error: any) {
      console.error('Insert test failed:', error);
      setResults({ type: 'insert', success: false, error: error.message });
      toast({
        title: "Insert Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testSelect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('request_for_admissions')
        .select('*')
        .limit(10);
      
      console.log('Select result:', { data, error });
      
      if (error) {
        throw error;
      }
      
      setResults({ type: 'select', success: true, data });
      toast({
        title: "Select Test",
        description: `Found ${data?.length || 0} records in the table`,
      });
    } catch (error: any) {
      console.error('Select test failed:', error);
      setResults({ type: 'select', success: false, error: error.message });
      toast({
        title: "Select Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Supabase Debug Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={testConnection} disabled={loading}>
            Test Connection
          </Button>
          <Button onClick={testTableExists} disabled={loading}>
            Test Table
          </Button>
          <Button onClick={testAuth} disabled={loading}>
            Test Auth
          </Button>
          <Button onClick={testInsert} disabled={loading}>
            Test Insert
          </Button>
          <Button onClick={testSelect} disabled={loading}>
            Test Select
          </Button>
        </div>
        
        {results && (
          <div className="mt-4 p-4 border rounded">
            <h3 className="font-semibold mb-2">
              {results.type.toUpperCase()} Test Results
            </h3>
            <div className={`p-2 rounded ${results.success ? 'bg-green-100' : 'bg-red-100'}`}>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
