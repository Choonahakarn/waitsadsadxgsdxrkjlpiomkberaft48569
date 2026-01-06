import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Upload, Shield, DollarSign, Users, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Sell() {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: Shield,
      titleKey: "sell.benefitBadgeTitle",
      descKey: "sell.benefitBadgeDesc",
    },
    {
      icon: Users,
      titleKey: "sell.benefitCollectorsTitle",
      descKey: "sell.benefitCollectorsDesc",
    },
    {
      icon: DollarSign,
      titleKey: "sell.benefitCommissionTitle",
      descKey: "sell.benefitCommissionDesc",
    },
  ];

  const steps = [
    "sell.step1",
    "sell.step2",
    "sell.step3",
    "sell.step4",
    "sell.step5",
  ];

  const mediums = [
    "sell.medium1",
    "sell.medium2",
    "sell.medium3",
    "sell.medium4",
    "sell.medium5",
    "sell.medium6",
    "sell.medium7",
    "sell.medium8",
  ];

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
              {t('sell.heroTitle1')}{" "}
              <span className="text-primary">{t('sell.heroTitle2')}</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground lg:text-xl">
              {t('sell.heroDesc')}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button className="btn-hero-primary">
                <Upload className="h-5 w-5" />
                {t('sell.startSelling')}
              </Button>
              <Link to="/verification" className="btn-hero-secondary">
                {t('sell.learnVerification')}
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
              {t('sell.whyChoose')}
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.titleKey}
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
                  {t(benefit.titleKey)}
                </h3>
                <p className="mt-3 text-muted-foreground">{t(benefit.descKey)}</p>
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
                {t('sell.getStarted')}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t('sell.getStartedDesc')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {steps.map((stepKey, index) => (
                <div
                  key={stepKey}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-foreground">{t(stepKey)}</p>
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
              {t('sell.whatWeAccept')}
            </h2>
            <p className="mt-4 text-center text-muted-foreground">
              {t('sell.whatWeAcceptDesc')}
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {mediums.map((mediumKey) => (
                <div
                  key={mediumKey}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <Check className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground">{t(mediumKey)}</span>
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
            {t('sell.ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {t('sell.ctaDesc')}
          </p>
          <div className="mt-8">
            <Button className="btn-hero-primary">
              <Upload className="h-5 w-5" />
              {t('sell.applyNow')}
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
