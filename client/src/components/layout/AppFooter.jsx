import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo.jsx";

const footerLinkClass =
  "text-sm text-zinc-400 hover:text-primary-fixed transition-colors duration-200";

function FooterColumn({ title, children }) {
  return (
    <div className="space-y-4 text-center sm:text-left">
      <div>
        <h3 className="font-headline text-base font-bold text-white">{title}</h3>
        <div className="mt-3 mx-auto sm:mx-0 h-px w-10 bg-zinc-600" aria-hidden="true" />
      </div>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLinkItem({ to, children, external = false }) {
  if (external) {
    return (
      <li>
        <a
          href={to}
          className={footerLinkClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link to={to} className={footerLinkClass}>
        {children}
      </Link>
    </li>
  );
}

function FooterTextItem({ children }) {
  return (
    <li>
      <span className="text-sm text-zinc-500">{children}</span>
    </li>
  );
}

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/Green-Barter/61556686514209/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M13.5 8.5V6.7c0-.8.6-1.2 1.4-1.2h2.1V2h-2.9c-2.8 0-4.1 1.7-4.1 4v2.5H7.5V12h2.5v10h3.5V12h3l.5-3.5h-3.5z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M6.5 9.5h3v11h-3v-11zm1.5-5a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6zM10 9.5h2.9v1.5h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5v5.2H16.5V15c0-1.2 0-2.7-1.7-2.7-1.8 0-2.1 1.4-2.1 2.8v5H10V9.5z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/greenbarter24/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M12 7.1A4.9 4.9 0 1016.9 12 4.9 4.9 0 0012 7.1zm0 8.1A3.2 3.2 0 1115.2 12 3.2 3.2 0 0112 15.2zM16.8 6.7a1.1 1.1 0 11-1.1-1.1 1.1 1.1 0 011.1 1.1zM19.8 7.2a6.8 6.8 0 00-1.9-4.8A6.8 6.8 0 0013.1.5h-2.2A6.8 6.8 0 005.1 2.4 6.8 6.8 0 003.2 7.2v2.2a6.8 6.8 0 001.9 4.8 6.8 6.8 0 004.8 1.9h2.2a6.8 6.8 0 004.8-1.9 6.8 6.8 0 001.9-4.8V7.2zm-2 2.2a4.8 4.8 0 01-1.3 3.4 4.8 4.8 0 01-3.4 1.3h-2.2a4.8 4.8 0 01-3.4-1.3 4.8 4.8 0 01-1.3-3.4V7.2a4.8 4.8 0 011.3-3.4 4.8 4.8 0 013.4-1.3h2.2a4.8 4.8 0 013.4 1.3 4.8 4.8 0 011.3 3.4v2.2z" />
      </svg>
    ),
  },
];

export default function AppFooter() {
  return (
    <footer className="mt-20 w-full bg-[#1a2e1a] text-zinc-400">
      <div className="mx-auto max-w-screen-2xl px-8 py-14 md:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left space-y-5 sm:col-span-2 lg:col-span-1">
            <BrandLogo variant="footer" />
            <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#24402a] text-zinc-300 transition-colors duration-200 hover:bg-primary hover:text-white"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="How to Exchange Fast">
            <FooterLinkItem to="/upload?mode=give">
              Give or Exchange Quickly
            </FooterLinkItem>
          </FooterColumn>

          <FooterColumn title="Information">
            <FooterLinkItem to="/about-us">About Us</FooterLinkItem>
            <FooterLinkItem to="/contact">Company &amp; Contact Info</FooterLinkItem>
            <FooterLinkItem to="/privacy-policy">Privacy &amp; Policy</FooterLinkItem>
            <FooterLinkItem to="/terms-conditions">Terms &amp; Conditions</FooterLinkItem>
          </FooterColumn>

          <FooterColumn title="Help &amp; Support">
            <FooterLinkItem to="/faq">FAQ</FooterLinkItem>
          </FooterColumn>
        </div>
      </div>

      <div className="border-t border-zinc-800">
        <div className="mx-auto max-w-screen-2xl px-8 py-5 text-center text-xs text-zinc-500">
          <p>
            &copy; Copyright Green Barter Int. 2026. Designed and Developed by
            Indevbd Ltd.
          </p>
        </div>
      </div>
    </footer>
  );
}
