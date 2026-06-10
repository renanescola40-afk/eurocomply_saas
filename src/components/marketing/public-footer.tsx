import Link from 'next/link';

const productLinks = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Resources', href: '/resources' },
  { label: 'FAQ', href: '/faq' },
];

const companyLinks = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

const trustLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'DPA', href: '/dpa' },
  { label: 'Subprocessors', href: '/subprocessors' },
  { label: 'Status', href: '/status' },
];

export function PublicFooter({ locale }: { locale: string }) {
  return (
    <footer className="border-t bg-background px-6 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="text-base font-semibold text-foreground">EuroComply</p>
          <p className="mt-3 max-w-md leading-6">
            Compliance evidence, risk and vendor operations for modern European teams. Built for operational readiness, not spreadsheet archaeology.
          </p>
        </div>
        <nav>
          <p className="font-medium text-foreground">Product</p>
          <ul className="mt-3 space-y-2">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link href={`/${locale}${link.href}`} className="hover:text-foreground">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav>
          <p className="font-medium text-foreground">Company</p>
          <ul className="mt-3 space-y-2">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <Link href={`/${locale}${link.href}`} className="hover:text-foreground">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav>
          <p className="font-medium text-foreground">Trust</p>
          <ul className="mt-3 space-y-2">
            {trustLinks.map((link) => (
              <li key={link.href}>
                <Link href={`/${locale}${link.href}`} className="hover:text-foreground">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
