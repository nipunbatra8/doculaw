
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Form validation schemas for each step
const personalInfoSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  title: z.string().optional(),
  phone: z.string().min(5, { message: "Phone number is required" }),
});

const referralSchema = z.object({
  referralSource: z.enum(
    [
      "search_engine",
      "social_media",
      "friend_referral",
      "legal_association",
      "advertisement",
      "conference",
      "other",
    ],
    {
      required_error: "Please select how you found us",
    }
  ),
  referralOther: z.string().optional(),
});

type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
type ReferralValues = z.infer<typeof referralSchema>;

export default function OnboardingPage() {
  const { user, updateUserMetadata, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Personal info form
  const personalInfoForm = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      email: user?.email || "",
      name: user?.user_metadata?.name || "",
      title: user?.user_metadata?.title || "",
      phone: user?.user_metadata?.phone || "",
    },
  });

  // Referral form
  const referralForm = useForm<ReferralValues>({
    resolver: zodResolver(referralSchema),
    defaultValues: {
      referralSource: undefined,
      referralOther: "",
    },
  });

  // Update form values when user data becomes available
  useEffect(() => {
    if (user) {
      personalInfoForm.reset({
        email: user.email || "",
        name: user.user_metadata?.name || "",
        title: user.user_metadata?.title || "",
        phone: user.user_metadata?.phone || "",
      });
    }
  }, [user, personalInfoForm]);

  const handleSubmitPersonalInfo = async (data: PersonalInfoValues) => {
    setIsSubmitting(true);
    try {
      // Update user metadata with personal info
      await updateUserMetadata({
        name: data.name,
        title: data.title,
        phone: data.phone,
      });
      
      setStep(2);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReferral = async (data: ReferralValues) => {
    setIsSubmitting(true);
    try {
      // Combine referral source with "other" field if applicable
      const referralSource = 
        data.referralSource === "other" && data.referralOther
          ? `other: ${data.referralOther}`
          : data.referralSource;

      // Create or update profile in the profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          email: user?.email,
          name: user?.user_metadata?.name,
          title: user?.user_metadata?.title,
          phone: user?.user_metadata?.phone,
          referral_source: referralSource,
          onboarding_completed: true,
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        throw profileError;
      }

      // Update user profile state
      await updateProfile({
        referral_source: referralSource,
        onboarding_completed: true,
      });
      
      toast({
        title: "Setup completed",
        description: "Your profile has been set up successfully!",
      });
      
      // Redirect to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex min-h-screen">
        {/* Left column - Brand */}
        <div className="hidden lg:flex w-1/3 bg-doculaw-500 justify-center items-center">
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
                Welcome to DocuLaw
              </h2>
              <p className="text-doculaw-50 text-lg">
                Complete your profile to get started with our legal document automation tools.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right column - Onboarding Form */}
        <div className="flex flex-col justify-center w-full lg:w-2/3 p-8 lg:p-12">
          <div className="sm:mx-auto sm:w-full sm:max-w-lg">
            {/* Logo for mobile view */}
            <div className="mb-6 text-center lg:hidden">
              <img
                src="/lovable-uploads/0be20ac4-7ddb-481d-a2f7-35e04e74334b.png"
                alt="DocuLaw Logo"
                className="h-12 w-auto mx-auto"
              />
            </div>
            
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-center">Complete Your Profile</h1>
              
              {/* Progress steps */}
              <div className="flex justify-center mt-6">
                <div className="flex items-center space-x-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step > 1 ? 'bg-green-500' : 'bg-doculaw-500'} text-white`}>
                    {step > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
                  </div>
                  <div className={`h-1 w-8 ${step > 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step > 2 ? 'bg-green-500' : step === 2 ? 'bg-doculaw-500' : 'bg-gray-300'} ${step === 2 ? 'text-white' : 'text-gray-500'}`}>
                    {step > 2 ? <CheckCircle className="h-5 w-5" /> : '2'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white py-8 px-6 shadow-sm rounded-lg sm:px-10">
              {/* Step 1 - Personal Information */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl font-semibold mb-6">Your Information</h2>
                  <Form {...personalInfoForm}>
                    <form
                      onSubmit={personalInfoForm.handleSubmit(handleSubmitPersonalInfo)}
                      className="space-y-6"
                    >
                      <FormField
                        control={personalInfoForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input {...field} disabled className="bg-gray-100 cursor-not-allowed" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Professional Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Managing Partner, Attorney" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. (123) 456-7890" required {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full bg-doculaw-500 hover:bg-doculaw-600"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Continue"}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* Step 2 - Referral Information */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl font-semibold mb-6">One Last Thing</h2>
                  <Form {...referralForm}>
                    <form
                      onSubmit={referralForm.handleSubmit(handleSubmitReferral)}
                      className="space-y-6"
                    >
                      <FormField
                        control={referralForm.control}
                        name="referralSource"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>How did you hear about DocuLaw?</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="search_engine">Search Engine</SelectItem>
                                <SelectItem value="social_media">Social Media</SelectItem>
                                <SelectItem value="friend_referral">Friend or Colleague</SelectItem>
                                <SelectItem value="legal_association">Legal Association</SelectItem>
                                <SelectItem value="advertisement">Advertisement</SelectItem>
                                <SelectItem value="conference">Conference or Event</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {referralForm.watch("referralSource") === "other" && (
                        <FormField
                          control={referralForm.control}
                          name="referralOther"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Please specify</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell us how you found us"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep(1)}
                          className="sm:flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          className="sm:flex-1 bg-doculaw-500 hover:bg-doculaw-600"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Finishing..." : "Complete Setup"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
