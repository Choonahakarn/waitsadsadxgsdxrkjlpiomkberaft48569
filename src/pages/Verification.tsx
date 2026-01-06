import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Check, Upload, Video, FileImage, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function Verification() {
  const { t } = useTranslation();

  const requirements = [
    {
      icon: FileImage,
      titleKey: "verification.reqSketchTitle",
      descKey: "verification.reqSketchDesc",
    },
    {
      icon: Video,
      titleKey: "verification.reqTimelapseTitle",
      descKey: "verification.reqTimelapseDesc",
    },
    {
      icon: Upload,
      titleKey: "verification.reqProcessTitle",
      descKey: "verification.reqProcessDesc",
    },
  ];

  const benefits = [
    "verification.benefit1",
    "verification.benefit2",
    "verification.benefit3",
    "verification.benefit4",
    "verification.benefit5",
  ];

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
              {t('verification.title')}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('verification.subtitle')}
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
                {t('verification.whyVerify')}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t('verification.whyVerifyDesc')}
              </p>
            </motion.div>

            {/* Requirements */}
            <div className="mt-12 space-y-6">
              <h3 className="font-serif text-xl font-semibold text-foreground">
                {t('verification.requirements')}
              </h3>
              {requirements.map((req, index) => (
                <motion.div
                  key={req.titleKey}
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
                    <h4 className="font-semibold text-foreground">{t(req.titleKey)}</h4>
                    <p className="mt-1 text-muted-foreground">{t(req.descKey)}</p>
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
                {t('verification.artistPledge')}
              </h3>
              <p className="mt-4 text-muted-foreground">
                {t('verification.pledgeIntro')}
              </p>
              <blockquote className="mt-4 border-l-4 border-primary pl-4 italic text-foreground">
                {t('verification.pledgeText')}
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
                {t('verification.benefits')}
              </h3>
              <ul className="mt-6 space-y-4">
                {benefits.map((benefitKey) => (
                  <li key={benefitKey} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{t(benefitKey)}</span>
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
                {t('verification.applyNow')}
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
