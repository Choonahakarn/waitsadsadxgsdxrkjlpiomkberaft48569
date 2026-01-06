import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Check, Upload, Video, FileImage, Shield, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const requirements = [
  {
    icon: FileImage,
    title: "Sketches & Work-in-Progress",
    description: "Upload preliminary sketches, rough drafts, or work-in-progress images that show the evolution of your artwork.",
  },
  {
    icon: Video,
    title: "Timelapse or Screen Recording",
    description: "For digital artists: Provide screen recordings or timelapse videos of your creation process.",
  },
  {
    icon: Upload,
    title: "Process Documentation",
    description: "Document your creative process with photos showing your workspace, materials, and tools in use.",
  },
];

export default function Verification() {
  return (
    <Layout>
      {/* Header */}
      <section className="border-b border-border bg-secondary/30 py-12 lg:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
              Artist Verification
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Our process-based verification ensures every artwork on OnlyHumanArt is genuinely created by human hands.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Verification */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
                Why We Verify
              </h2>
              <p className="mt-4 text-muted-foreground">
                In an era where AI can generate convincing images in seconds, we believe it's crucial to protect and celebrate authentic human creativity. Our verification process is designed to be thorough yet artist-friendly.
              </p>
            </motion.div>

            {/* Requirements */}
            <div className="mt-12 space-y-6">
              <h3 className="font-serif text-xl font-semibold text-foreground">
                Verification Requirements
              </h3>
              {requirements.map((req, index) => (
                <motion.div
                  key={req.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4 rounded-xl border border-border bg-card p-6 shadow-soft"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <req.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{req.title}</h4>
                    <p className="mt-1 text-muted-foreground">{req.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Artist Pledge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-8"
            >
              <h3 className="font-serif text-xl font-semibold text-foreground">
                Artist Pledge
              </h3>
              <p className="mt-4 text-muted-foreground">
                All artists must agree to the following statement:
              </p>
              <blockquote className="mt-4 border-l-4 border-primary pl-4 italic text-foreground">
                "I confirm that this artwork is created entirely by me, a human, without the use of AI generation, AI-assisted image creation, or any generative models. I understand that violations will result in permanent removal from the platform."
              </blockquote>
            </motion.div>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12"
            >
              <h3 className="font-serif text-xl font-semibold text-foreground">
                Benefits of Verification
              </h3>
              <ul className="mt-6 space-y-4">
                {[
                  "Display the 'Human Verified' badge on all your artworks",
                  "Build trust with buyers who value authentic human art",
                  "Get featured in our curated collections",
                  "Access to commission requests from serious collectors",
                  "Join a community of verified human artists",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 text-center"
            >
              <Link to="/sell" className="btn-hero-primary">
                Apply for Verification
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
