import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setIsSubmitting(false);

    if (!error) {
      setIsSubmitted(true);
      toast({
        title: "Reset email sent",
        description: "Check your inbox for instructions to reset your password",
      });
    } else {
      toast({
        title: "An error occurred",
        description: error.message || "We couldn't send the reset email. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex min-h-screen">
        {/* Image/Logo side */}
        <div className="hidden lg:flex w-1/2 bg-doculaw-500 justify-center items-center">
          <div className="p-12 max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <img
                src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png"
                alt="DocuLaw Logo"
                className="h-20 w-auto mx-auto mb-6"
              />
              <h2 className="text-3xl font-bold text-white mb-6">
                Password Recovery
              </h2>
              <p className="text-doculaw-50 text-lg">
                We'll help you reset your password and get back to managing your cases.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Form side */}
        <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-12">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="mb-6 flex justify-center lg:hidden">
              <Link to="/" className="flex items-center">
                <img
                  src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png"
                  alt="DocuLaw Logo"
                  className="h-12 w-auto"
                />
                <span className="ml-2 font-bold text-doculaw-800 text-xl">DocuLaw</span>
              </Link>
            </div>
            <h2 className="text-center text-3xl font-bold text-gray-800">
              Reset your password
            </h2>
            <p className="mt-2 text-center text-gray-500">
              Enter your email and we'll send you instructions to reset your password
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-6 shadow-sm rounded-lg sm:px-10">
              {isSubmitted ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-doculaw-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-8 w-8 text-doculaw-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Check your email</h3>
                  <p className="text-gray-600 mb-6">
                    We've sent password reset instructions to:
                    <br />
                    <span className="font-medium">{email}</span>
                  </p>
                  <div className="space-y-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setIsSubmitted(false)}
                    >
                      Try a different email
                    </Button>
                    <Link to="/login">
                      <Button 
                        variant="ghost" 
                        className="w-full text-gray-600"
                      >
                        Back to login
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="block w-full"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <Button
                      type="submit"
                      className="w-full bg-doculaw-500 hover:bg-doculaw-600 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending..." : "Send reset instructions"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/login" className="text-sm text-gray-600 hover:text-doculaw-500">
              &larr; Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
