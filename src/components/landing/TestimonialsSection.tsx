
import { motion } from "framer-motion";
import { QuoteIcon } from "lucide-react";

const testimonials = [
  {
    quote: "DocuLaw has transformed our discovery process. What used to take days now takes hours, and the quality of our responses has improved dramatically.",
    author: "Sarah Johnson",
    title: "Partner, Johnson & Associates",
    image: ""
  },
  {
    quote: "The client portal is a game-changer. My clients love being able to answer questions easily online, and I love not having to chase them down for responses.",
    author: "Michael Chen",
    title: "Attorney, Chen Legal Group",
    image: ""
  },
  {
    quote: "As a solo practitioner, DocuLaw gives me the capabilities of a much larger firm. The automation saves me countless hours I can now dedicate to client care.",
    author: "Jessica Williams",
    title: "Solo Practitioner",
    image: ""
  }
];

const TestimonialsSection = () => {
  return (
    <div className="bg-doculaw-50 py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Trusted by Legal Professionals
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            See what attorneys and law firms say about DocuLaw's discovery automation platform.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-8 shadow-sm relative"
            >
              <QuoteIcon className="h-8 w-8 text-doculaw-300 absolute top-6 left-6 opacity-30" />
              <div className="pt-6">
                <p className="text-gray-700 mb-6 relative z-10">{testimonial.quote}</p>
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-doculaw-200 flex items-center justify-center text-doculaw-600 font-bold">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <p className="font-bold text-gray-900">{testimonial.author}</p>
                    <p className="text-gray-600 text-sm">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestimonialsSection;
