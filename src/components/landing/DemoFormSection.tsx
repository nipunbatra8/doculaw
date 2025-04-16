
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const DemoFormSection = () => {
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    firmName: "",
    message: "",
  });
  
  const [submitted, setSubmitted] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would submit to a backend
    console.log("Form submitted:", formState);
    
    // Show success message
    setSubmitted(true);
    
    // Reset form after delay
    setTimeout(() => {
      setFormState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        firmName: "",
        message: "",
      });
    }, 500);
  };
  
  return (
    <div id="book-demo" className="bg-white py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Ready to Transform Your Discovery Process?
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Schedule a personalized demo to see how DocuLaw can revolutionize your legal practice and save you hundreds of hours.
              </p>
              
              <div className="mt-8 space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-doculaw-500" />
                  </div>
                  <span className="ml-3 text-gray-700">
                    See the full platform in action with a live demo
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-doculaw-500" />
                  </div>
                  <span className="ml-3 text-gray-700">
                    Get your questions answered by our legal tech specialists
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-doculaw-500" />
                  </div>
                  <span className="ml-3 text-gray-700">
                    Receive a customized plan for your practice's specific needs
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-doculaw-500" />
                  </div>
                  <span className="ml-3 text-gray-700">
                    No commitment or credit card required
                  </span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-doculaw-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-8 w-8 text-doculaw-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
                  <p className="text-gray-600">
                    Your demo request has been received. One of our specialists will contact you shortly.
                  </p>
                  <Button 
                    className="mt-8 bg-doculaw-500 hover:bg-doculaw-600 text-white"
                    onClick={() => setSubmitted(false)}
                  >
                    Request Another Demo
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900">Book Your Free Demo</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formState.firstName}
                        onChange={handleChange}
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formState.lastName}
                        onChange={handleChange}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formState.email}
                      onChange={handleChange}
                      required
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formState.phone}
                      onChange={handleChange}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="firmName" className="block text-sm font-medium text-gray-700 mb-1">
                      Law Firm Name
                    </label>
                    <Input
                      id="firmName"
                      name="firmName"
                      value={formState.firmName}
                      onChange={handleChange}
                      required
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Information (Optional)
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formState.message}
                      onChange={handleChange}
                      rows={4}
                      className="w-full"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-doculaw-500 hover:bg-doculaw-600 text-white"
                  >
                    Request Your Demo
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    By submitting this form, you agree to our terms and privacy policy.
                  </p>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoFormSection;
