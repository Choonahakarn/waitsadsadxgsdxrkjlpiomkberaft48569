import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { XCircle, CheckCircle, AlertTriangle, Shield } from "lucide-react";

export default function Policy() {
  const { t } = useTranslation();

  const prohibited = [
    "policy.prohibited1",
    "policy.prohibited2",
    "policy.prohibited3",
    "policy.prohibited4",
    "policy.prohibited5",
    "policy.prohibited6",
  ];

  const allowed = [
    "policy.allowed1",
    "policy.allowed2",
    "policy.allowed3",
    "policy.allowed4",
    "policy.allowed5",
    "policy.allowed6",
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
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-destructive/10 p-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
              {t('policy.title')}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('policy.subtitle')}
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
                {t('policy.zeroTolerance')}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t('policy.zeroToleranceDesc')}
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
                {t('policy.notAllowed')}
              </h3>
              <ul className="mt-6 space-y-4">
                {prohibited.map((itemKey) => (
                  <li
                    key={itemKey}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
                  >
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    <span className="text-muted-foreground">{t(itemKey)}</span>
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
                {t('policy.allowed')}
              </h3>
              <ul className="mt-6 space-y-4">
                {allowed.map((itemKey) => (
                  <li
                    key={itemKey}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
                  >
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{t(itemKey)}</span>
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
                {t('policy.enforcement')}
              </h3>
              <div className="mt-6 space-y-4 text-muted-foreground">
                <p>
                  {t('policy.enforcementDesc')}
                </p>
                <ol className="ml-6 list-decimal space-y-2">
                  <li>
                    <strong className="text-foreground">{t('policy.enforcement1Title')}</strong> {t('policy.enforcement1Desc')}
                  </li>
                  <li>
                    <strong className="text-foreground">{t('policy.enforcement2Title')}</strong> {t('policy.enforcement2Desc')}
                  </li>
                  <li>
                    <strong className="text-foreground">{t('policy.enforcement3Title')}</strong> {t('policy.enforcement3Desc')}
                  </li>
                  <li>
                    <strong className="text-foreground">{t('policy.enforcement4Title')}</strong> {t('policy.enforcement4Desc')}
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
                {t('policy.consequences')}
              </h3>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  {t('policy.consequence1')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  {t('policy.consequence2')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  {t('policy.consequence3')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  {t('policy.consequence4')}
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
                {t('policy.contact')}{" "}
                <a href="mailto:policy@soulhuman.com" className="text-primary hover:underline">
                  policy@soulhuman.com
                </a>
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
