import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { artists } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, FileText, Pencil, Check, Send } from "lucide-react";

export default function Commission() {
  const { t } = useTranslation();
  const [selectedArtist, setSelectedArtist] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    description: "",
    budget: "",
    deadline: "",
    usage: "personal",
  });

  const steps = [
    { icon: FileText, titleKey: "commission.step1Title", descKey: "commission.step1Desc" },
    { icon: Pencil, titleKey: "commission.step2Title", descKey: "commission.step2Desc" },
    { icon: Check, titleKey: "commission.step3Title", descKey: "commission.step3Desc" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(t('commission.requestSubmitted'));
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
              {t('commission.title')}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('commission.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="border-b border-border py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-4">
            {steps.map((step, index) => (
              <div key={step.titleKey} className="flex items-center gap-4">
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
                    {t(step.titleKey)}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(step.descKey)}</p>
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
                  {t('commission.selectArtist')}
                </label>
                <Select value={selectedArtist} onValueChange={setSelectedArtist}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('commission.chooseArtist')} />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.name} - {artist.isTraditional ? t('marketplace.traditional') : t('marketplace.digital')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t('commission.yourName')}
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
                    {t('commission.emailAddress')}
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
                  {t('commission.describeArtwork')}
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('commission.descriptionPlaceholder')}
                  rows={5}
                  required
                />
              </div>

              {/* Budget & Deadline */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t('commission.budget')}
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
                    {t('commission.deadline')}
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
                  {t('commission.usageRights')}
                </label>
                <Select
                  value={formData.usage}
                  onValueChange={(value) => setFormData({ ...formData, usage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">{t('commission.personalUse')}</SelectItem>
                    <SelectItem value="commercial">{t('commission.commercialUse')}</SelectItem>
                    <SelectItem value="exclusive">{t('commission.exclusiveRights')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('commission.usageNote')}
                </p>
              </div>

              <Button type="submit" className="btn-hero-primary w-full">
                <Send className="h-5 w-5" />
                {t('commission.submitRequest')}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
