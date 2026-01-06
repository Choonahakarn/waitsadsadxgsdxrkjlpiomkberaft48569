import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="container mx-auto px-4 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <span className="font-serif text-lg font-bold text-primary-foreground">O</span>
              </div>
              <span className="font-serif text-xl font-semibold text-foreground">
                SoulHuman
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The marketplace for 100% human-created artwork. No AI. No algorithms. Only real artists.
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold text-foreground">
              Marketplace
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/marketplace" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Browse Artworks
                </Link>
              </li>
              <li>
                <Link to="/artists" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Featured Artists
                </Link>
              </li>
              <li>
                <Link to="/commission" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Commission Art
                </Link>
              </li>
              <li>
                <Link to="/sell" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Sell Your Art
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Safety */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold text-foreground">
              Trust & Safety
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/verification" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Artist Verification
                </Link>
              </li>
              <li>
                <Link to="/policy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Anti-AI Policy
                </Link>
              </li>
              <li>
                <Link to="/policy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/policy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="mb-4 font-serif text-base font-semibold text-foreground">
              Connect
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Newsletter
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="section-divider mt-12" />

        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <p>© 2026 SoulHuman. All rights reserved.</p>
          <p className="font-medium">Art made by humans, not algorithms.</p>
        </div>
      </div>
    </footer>
  );
}
