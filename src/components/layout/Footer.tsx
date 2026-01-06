import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="container mx-auto px-4 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <span className="font-serif text-lg font-bold text-primary-foreground">S</span>
              </div>
              <span className="font-serif text-xl font-semibold text-foreground">
                SoulHuman
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold text-foreground">
              {t('footer.marketplace')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/marketplace" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.browseArtworks')}
                </Link>
              </li>
              <li>
                <Link to="/artists" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.featuredArtists')}
                </Link>
              </li>
              <li>
                <Link to="/commission" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.commissionArt')}
                </Link>
              </li>
              <li>
                <Link to="/sell" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.sellYourArt')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Safety */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold text-foreground">
              {t('footer.trustSafety')}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/verification" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.artistVerification')}
                </Link>
              </li>
              <li>
                <Link to="/policy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.antiAiPolicy')}
                </Link>
              </li>
              <li>
                <Link to="/policy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.termsOfService')}
                </Link>
              </li>
              <li>
                <Link to="/policy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold text-foreground">
              {t('footer.connect')}
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.aboutUs')}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.contact')}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.blog')}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('footer.newsletter')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="section-divider mt-12" />

        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <p>{t('footer.copyright')}</p>
          <p className="font-medium">{t('footer.slogan')}</p>
        </div>
      </div>
    </footer>
  );
}
