import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'About · Gridline Cities',
  description:
    'Architectural posters where line meets the De Stijl palette — a small Luxembourg studio.',
};

export default function AboutPage() {
  return (
    <>
      <Nav />

      <section className="section" id="about">
        <div className="section-header">
          <div className="eyebrow">
            <span className="mono-label">About the work</span>
          </div>
          <div className="inner-row">
            <h2 className="title">
              Architecture, seen through a{' '}
              <span className="italic">De&nbsp;Stijl lens.</span>
            </h2>
          </div>
        </div>

        <div className="manifesto">
          <p className="big-q">
            Each poster takes a city&apos;s most-drawn landmarks — towers,
            bridges, corners, street furniture — and reduces them to the
            essentials: a clean line drawing, the three primary colors, a
            white ground. It&apos;s the conversation Mondrian never got to
            have with a cathedral or a bridge: geometry meeting geometry,
            the building offering its structure, the palette answering with{' '}
            <span className="italic">red, yellow, and blue.</span> A quiet
            collection for people who love cities and modernist design in
            roughly equal measure.
          </p>
          <div className="sig">
            <span className="line"></span>
            <span>Gridline Cities · Luxembourg</span>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
