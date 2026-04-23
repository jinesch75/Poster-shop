import Image from 'next/image';
import Link from 'next/link';
import type { PosterView } from '@/lib/posters';
import { Watermark } from './Watermark';

export function PosterCard({ poster }: { poster: PosterView }) {
  return (
    <Link href={`/shop/${poster.slug}`} className="card">
      <div className="no">{poster.number}</div>
      <div className="thumb">
        <Image
          src={poster.file}
          alt={poster.title}
          width={600}
          height={800}
          sizes="(max-width: 520px) 50vw, (max-width: 820px) 33vw, (max-width: 1100px) 25vw, 20vw"
        />
        <Watermark lines={10} fontSize={11} />
      </div>
      <div className="meta">
        <div className="meta-left">
          <div className="title">{poster.title}</div>
          <div className="city">{poster.city}</div>
        </div>
        <div className="price">€{poster.priceEur}</div>
      </div>
    </Link>
  );
}
