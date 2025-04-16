
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const pricingPlans = [
  {
    name: "Starter",
    price: "$99",
    period: "per month",
    description: "Perfect for solo practitioners or small practices",
    features: [
      "Up to 20 active cases",
      "Basic discovery automation",
      "Client portal access",
      "Email support",
      "Document storage (5GB)",
    ],
    highlight: false,
    buttonText: "Start Free Trial",
  },
  {
    name: "Professional",
    price: "$299",
    period: "per month",
    description: "Ideal for growing law firms with multiple attorneys",
    features: [
      "Unlimited active cases",
      "Advanced discovery automation",
      "Client portal with custom branding",
      "Priority support",
      "Document storage (50GB)",
      "Team collaboration tools",
      "Analytics dashboard",
    ],
    highlight: true,
    buttonText: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    description: "Tailored solutions for large firms with complex needs",
    features: [
      "All Professional features",
      "Dedicated account manager",
      "Custom integrations",
      "Advanced security features",
      "Unlimited document storage",
      "On-premise deployment option",
      "24/7 premium support",
    ],
    highlight: false,
    buttonText: "Contact Sales",
  },
];

const PricingSection = () => {
  return (
    <div id="pricing" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Transparent Pricing Plans
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Choose the plan that fits your practice size and needs. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`rounded-2xl overflow-hidden ${
                plan.highlight
                  ? "border-2 border-doculaw-500 shadow-lg relative"
                  : "border border-gray-200 shadow-sm"
              }`}
            >
              {plan.highlight && (
                <div className="bg-doculaw-500 text-white text-sm font-medium py-1 text-center">
                  Most Popular
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="ml-2 text-gray-600">{plan.period}</span>
                </div>
                <p className="mt-2 text-gray-600">{plan.description}</p>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-doculaw-500" />
                      </div>
                      <span className="ml-3 text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Button
                    className={`w-full ${
                      plan.highlight
                        ? "bg-doculaw-500 hover:bg-doculaw-600 text-white"
                        : "bg-white border border-doculaw-300 text-doculaw-700 hover:bg-doculaw-50"
                    }`}
                    asChild
                  >
                    <a href="#book-demo">{plan.buttonText}</a>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingSection;
