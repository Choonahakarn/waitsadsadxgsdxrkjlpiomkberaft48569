import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { XCircle, CheckCircle, AlertTriangle, Shield } from "lucide-react";

const prohibited = [
  "AI-generated images or artwork",
  "Images created using generative AI models (Midjourney, DALL-E, Stable Diffusion, etc.)",
  "Artwork that uses AI-generated base images, even if modified",
  "AI-assisted generation or enhancement tools that create content",
  "Artwork created by feeding prompts to any AI system",
  "Modifications or edits to AI-generated artwork",
];

const allowed = [
  "Reference photos for inspiration (but not AI-generated ones)",
  "Digital tools for traditional creation (Photoshop, Procreate, etc.)",
  "Basic photo editing (cropping, color correction of YOUR work)",
  "Scans or photos of physical artwork",
  "Digital painting and illustration created stroke-by-stroke",
  "3D modeling and rendering done manually",
];

export default function Policy() {
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
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-destructive/10 p-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
              Anti-AI Policy
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              OnlyHumanArt is committed to celebrating and protecting authentic human creativity.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Core Statement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8"
            >
              <h2 className="flex items-center gap-3 font-serif text-2xl font-bold text-foreground">
                <AlertTriangle className="h-7 w-7 text-destructive" />
                Zero Tolerance for AI Art
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                OnlyHumanArt maintains a strict policy against AI-generated content. Any artwork found to violate this policy will be immediately removed, and the artist will face a <strong className="text-foreground">permanent ban</strong> from the platform.
              </p>
            </motion.div>

            {/* Prohibited */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12"
            >
              <h3 className="flex items-center gap-2 font-serif text-xl font-semibold text-foreground">
                <XCircle className="h-6 w-6 text-destructive" />
                What is NOT Allowed
              </h3>
              <ul className="mt-6 space-y-4">
                {prohibited.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
                  >
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Allowed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12"
            >
              <h3 className="flex items-center gap-2 font-serif text-xl font-semibold text-foreground">
                <CheckCircle className="h-6 w-6 text-primary" />
                What IS Allowed
              </h3>
              <ul className="mt-6 space-y-4">
                {allowed.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
                  >
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Enforcement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12"
            >
              <h3 className="font-serif text-xl font-semibold text-foreground">
                How We Enforce This Policy
              </h3>
              <div className="mt-6 space-y-4 text-muted-foreground">
                <p>
                  Our verification process includes multiple layers of review:
                </p>
                <ol className="ml-6 list-decimal space-y-2">
                  <li>
                    <strong className="text-foreground">Process Documentation:</strong> Artists must provide sketches, work-in-progress images, or screen recordings.
                  </li>
                  <li>
                    <strong className="text-foreground">Community Reporting:</strong> Users can report suspected AI art for review.
                  </li>
                  <li>
                    <strong className="text-foreground">Expert Review:</strong> Flagged content is reviewed by trained moderators.
                  </li>
                  <li>
                    <strong className="text-foreground">Technical Analysis:</strong> We use various detection methods to identify AI-generated content.
                  </li>
                </ol>
              </div>
            </motion.div>

            {/* Consequences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 rounded-2xl border border-border bg-card p-8 shadow-soft"
            >
              <h3 className="font-serif text-xl font-semibold text-foreground">
                Consequences of Violations
              </h3>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  Immediate removal of all artwork
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  Permanent ban from the platform
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  Forfeiture of any pending payments
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  Public listing in our violations registry (artist name only)
                </li>
              </ul>
            </motion.div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 text-center"
            >
              <p className="text-muted-foreground">
                Have questions about our policy? Contact us at{" "}
                <a href="mailto:policy@onlyhumanart.com" className="text-primary hover:underline">
                  policy@onlyhumanart.com
                </a>
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
