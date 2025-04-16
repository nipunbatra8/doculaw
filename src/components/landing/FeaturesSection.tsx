
import { Check, FileText, Clock, User, Database, Server } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: FileText,
    title: "Automated Document Analysis",
    description: "Our AI-powered system analyzes discovery requests and automatically generates appropriate responses and objections."
  },
  {
    icon: Clock,
    title: "Save 80% of Time",
    description: "Dramatically reduce the time spent on discovery responses from days to hours with our streamlined workflow."
  },
  {
    icon: User,
    title: "Client Collaboration",
    description: "Intuitive client portal allows your clients to easily answer questions and provide signatures digitally."
  },
  {
    icon: Database,
    title: "Document Repository",
    description: "Centralized database for all discovery documents with search capabilities and version history."
  },
  {
    icon: Server,
    title: "Secure Cloud Storage",
    description: "Bank-level security protects all your sensitive legal documents and client information."
  },
  {
    icon: Check,
    title: "Compliance Assurance",
    description: "Automatically ensures your discovery responses comply with relevant legal standards and court rules."
  }
];

const FeaturesSection = () => {
  return (
    <div className="bg-gray-50 py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Revolutionize Your Discovery Process
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            DocuLaw combines intelligent automation with legal expertise to streamline every aspect of the discovery workflow.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-doculaw-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-doculaw-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;
