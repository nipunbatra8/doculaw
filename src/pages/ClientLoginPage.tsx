import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ChevronLeft } from "lucide-react";

// Form validation schema
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ClientLoginPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  // Form submission handler
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Check if the email belongs to a client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, email')
        .eq('email', data.email)
        .single();

      if (clientError) {
        // Email not found in clients table
        toast({
          title: "Not a registered client",
          description: "This email is not registered as a client. Please contact your lawyer for an invitation.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Email exists in clients table, now send a magic link
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/client-dashboard`,
          // Magic links that fail (e.g., expired) will be caught by the ProtectedRoute component
          // which will redirect to the expired link page
        },
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Magic link sent",
        description: "Check your email for a link to sign in",
      });
    } catch (error: unknown) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "We couldn't send the magic link. Please try again.";
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Split screen layout */}
      <div className="flex min-h-screen">
        {/* Left column - Brand */}
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
                Client Sign In
              </h2>
              <p className="text-doculaw-50 text-lg">
                Access your case documents and communicate with your legal team.
              </p>

              <div className="mt-8">
                <Link
                  to="/"
                  className="text-white flex items-center justify-center hover:underline"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back to Home
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right column - Login form */}
        <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-12">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            {/* Logo for mobile view */}
            <div className="mb-6 text-center lg:hidden">
              <Link to="/" className="inline-block">
                <img
                  src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png"
                  alt="DocuLaw Logo"
                  className="h-12 w-auto"
                />
              </Link>
            </div>
            <h2 className="text-center text-3xl font-bold text-gray-800">
              Client Sign In
            </h2>

            {/* Back to home for mobile */}
            <div className="mt-2 text-center lg:hidden">
              <Link
                to="/"
                className="text-doculaw-600 flex items-center justify-center hover:underline"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Home
              </Link>
            </div>

            <div className="mt-4 mb-8 flex justify-center">
              <Link
                to="/login"
                className="text-sm font-medium text-doculaw-600 hover:text-doculaw-500"
              >
                Lawyers sign in here
              </Link>
            </div>
          </div>

          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            {isSubmitted ? (
              <div className="bg-white py-8 px-6 shadow-sm rounded-lg sm:px-10">
                <div className="text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
                  <p className="text-gray-500 mb-6">
                    We've sent a magic link to your email address. Click the link to sign in to your client portal.
                  </p>
                  <p className="text-sm text-gray-500">
                    Didn't receive the email?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="text-doculaw-600 hover:text-doculaw-500 font-medium"
                    >
                      Try again
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white py-8 px-6 shadow-sm rounded-lg sm:px-10">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-doculaw-500 hover:bg-doculaw-600 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending link..." : "Send magic link"}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6">
                  <p className="text-center text-sm text-gray-500">
                    Only clients who have been invited by their lawyer can sign in.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 