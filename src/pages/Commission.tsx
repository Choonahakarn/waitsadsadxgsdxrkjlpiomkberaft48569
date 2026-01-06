import { useState } from "react";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { artists } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, FileText, Pencil, Check, Send } from "lucide-react";

const steps = [
  { icon: FileText, title: "Submit Request", description: "Describe your vision" },
  { icon: Pencil, title: "Sketch Approval", description: "Review initial concepts" },
  { icon: Check, title: "Final Artwork", description: "Receive your masterpiece" },
];

export default function Commission() {
  const [selectedArtist, setSelectedArtist] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    description: "",
    budget: "",
    deadline: "",
    usage: "personal",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert("Commission request submitted! The artist will contact you soon.");
  };

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
            <h1 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
              Commission Custom Art
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Work directly with verified human artists to create your perfect piece
            </p>
          </motion.div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="border-b border-border py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-4">
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-center gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden h-5 w-5 text-muted-foreground md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Form */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-2xl"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Artist Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Select Artist
                </label>
                <Select value={selectedArtist} onValueChange={setSelectedArtist}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.name} - {artist.isTraditional ? "Traditional" : "Digital"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Your Name
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              {/* Artwork Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Describe Your Artwork
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what you'd like the artist to create. Include details about subject, style, colors, size, and any reference images you have."
                  rows={5}
                  required
                />
              </div>

              {/* Budget & Deadline */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Budget (USD)
                  </label>
                  <Input
                    type="text"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="e.g., $500 - $1000"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Desired Deadline
                  </label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>

              {/* Usage Rights */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Usage Rights
                </label>
                <Select
                  value={formData.usage}
                  onValueChange={(value) => setFormData({ ...formData, usage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Use Only</SelectItem>
                    <SelectItem value="commercial">Commercial Use</SelectItem>
                    <SelectItem value="exclusive">Exclusive Rights</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Commercial and exclusive rights may affect pricing
                </p>
              </div>

              <Button type="submit" className="btn-hero-primary w-full">
                <Send className="h-5 w-5" />
                Submit Commission Request
              </Button>
            </form>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
