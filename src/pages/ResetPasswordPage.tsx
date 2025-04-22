
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verify the recovery token on page load
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Session error:", error);
        setError("Invalid or expired recovery link. Please request a new password reset.");
        return;
      }
      
      if (!data.session) {
        console.error("No session found");
        setError("Invalid or expired recovery link. Please request a new password reset.");
      }
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    const { error } = await supabase.auth.updateUser({ password });
    
    setIsSubmitting(false);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
      setError(error.message);
    } else {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
      // Redirect to login page after successful password reset
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center mb-6">
          <img
            src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png"
            alt="DocuLaw Logo"
            className="h-12 w-auto"
          />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">Reset Your Password</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="••••••••"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="••••••••"
            />
          </div>
          
          <Button
            type="submit"
            className="w-full bg-doculaw-500 hover:bg-doculaw-600 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
