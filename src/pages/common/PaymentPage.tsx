
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PaymentPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setIsSubmitting(false);
    if (!error) {
      setIsSent(true);
      toast({
        title: "Email Sent",
        description: "We've sent you a password setup link.",
      });
    } else {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation email.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen justify-center bg-gray-50">
      <div className="bg-white shadow p-8 rounded-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2 text-center">Payment</h1>
        <p className="mb-6 text-center text-gray-600">
          (Payments coming soon.)<br/>Enter your email to create your account. We'll email you a secure link after you check out.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Account Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting || isSent}
              placeholder="you@lawfirm.com"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-doculaw-500 hover:bg-doculaw-600 text-white"
            disabled={isSubmitting || isSent}
          >
            {isSent ? "Link Sent!" : isSubmitting ? "Sending..." : "Send Setup Link"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PaymentPage;
