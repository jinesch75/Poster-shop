// Rarely hit — Stripe only lands here if the user clicks "back" in Checkout.
// The order stays PENDING in the DB; a nightly cleanup can prune old
// PENDING rows eventually. For now, we just show a friendly message and
// invite them back into the shop.

import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

export const metadata = { title: 'Checkout cancelled — Gridline Cities' };

export default function CheckoutCancelPage() {
  return (
    <>
      <Nav />
      <section className="section">
        <div className="checkout-success">
          <h2 className="title">
            Checkout cancelled<span className="italic">.</span>
          </h2>
          <p className="aside">
            No charge has been made. You can pick up where you left off
            whenever you&apos;re ready.
          </p>
          <div className="checkout-success__back">
            <Link className="btn-ghost" href="/shop">
              ← Back to the catalogue
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
