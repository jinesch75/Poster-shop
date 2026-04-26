'use client';

// Image wrapper that disables right-click "Save image", drag-to-desktop,
// and text-style selection on customer-facing previews.
//
// Doesn't stop a determined user with dev tools — that's impossible for
// any static image on the open web. But blocks the casual ~95% of save
// attempts before they happen, and pairs with the resolution-as-protection
// strategy (1200px previews aren't useful for printing anyway) and the
// QR badge baked into every preview file.

import Image, { type ImageProps } from 'next/image';

type Props = Omit<ImageProps, 'onContextMenu' | 'draggable'>;

export function ProtectedImage(props: Props) {
  return (
    <Image
      {...props}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        ...(props.style ?? {}),
        userSelect: 'none',
        WebkitUserDrag: 'none',
      } as React.CSSProperties}
    />
  );
}
