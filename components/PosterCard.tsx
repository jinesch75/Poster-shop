import Image from 'next/image';
import Link from 'next/link';
import type { PosterView } from '@/lib/posters';
import { Watermark } from './Watermark';

export function PosterCard({ poster }: { poster: PosterView }) {
  return (
    <Link href={`/shop/${poster.slug}`} className="card">
      <div className="thumb">
        <Image
          src={poster.file}
          alt={poster.title}
          width={600}
          height={800}
          sizes="(max-width: 900px) 50vw, 33vw"
        />
        <Watermark lines={10} fontSize={11} />
      </div>
      <div className="meta">
        <div className="meta-left">
          <div className="title">{poster.title}</div>
          <div className="city">
            {poster.city} · {poster.number}
          </div>
        </div>
        <div className="price">from €{poster.priceEur}</div>
      </div>
    </Link>
  );
}
