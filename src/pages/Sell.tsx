import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Upload, Shield, DollarSign, Users, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Shield,
    title: "Human Verified Badge",
    description: "Stand out with our trusted verification badge that proves your work is authentically human-made.",
  },
  {
    icon: Users,
    title: "Engaged Collectors",
    description: "Connect with buyers who specifically seek and value human-created artwork over AI.",
  },
  {
    icon: DollarSign,
    title: "Fair Commission",
    description: "Keep more of what you earn with our artist-friendly 15% platform fee.",
  },
];

const steps = [
  "Create your artist profile with bio and tools",
  "Upload your portfolio with at least 3 artworks",
  "Submit verification materials (sketches, WIP, recordings)",
  "Our team reviews your application within 48 hours",
  "Get verified and start selling!",
];

export default function Sell() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="font-serif text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Sell Your Art to{" "}
              <span className="text-primary">People Who Care</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground lg:text-xl">
              Join a marketplace where human creativity is celebrated, protected, and rewarded. No AI competition—just real artists connecting with real collectors.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button className="btn-hero-primary">
                <Upload className="h-5 w-5" />
                Start Selling
              </Button>
              <Link to="/verification" className="btn-hero-secondary">
                Learn About Verification
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              Why Artists Choose OnlyHumanArt
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft"
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <benefit.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary/50 py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                Get Started in 5 Simple Steps
              </h2>
              <p className="mt-4 text-muted-foreground">
                Our streamlined process gets you verified and selling quickly while maintaining our high standards.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-foreground">{step}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* What We Accept */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl"
          >
            <h2 className="text-center font-serif text-3xl font-bold text-foreground md:text-4xl">
              What We Accept
            </h2>
            <p className="mt-4 text-center text-muted-foreground">
              If you create it by hand (or stylus), we want to showcase it.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {[
                "Oil, Acrylic & Watercolor Paintings",
                "Pencil, Charcoal & Ink Drawings",
                "Digital Paintings & Illustrations",
                "Mixed Media & Collage",
                "Traditional Printmaking",
                "Sculpture & 3D Art",
                "Calligraphy & Lettering",
                "Photography (your original shots)",
              ].map((type) => (
                <div
                  key={type}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <Check className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground">{type}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card py-20">
        <div className="container mx-auto px-4 text-center lg:px-8">
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            Ready to Join the Human Art Movement?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Apply today and become part of a growing community of verified human artists.
          </p>
          <div className="mt-8">
            <Button className="btn-hero-primary">
              <Upload className="h-5 w-5" />
              Apply Now
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
