/**
 * Gives every id in a drawing a suffix, so two copies of the same drawing on one page never
 * share ids. A page-wide id has one owner: with the same Ħarsi on the map and in the battle over
 * it, or in the Party list under its detail page, the browser looks `url(#fossary-body)` up in
 * whichever copy comes first, and if that one is hidden its gradients and clip shapes stop
 * working — the shading turns into flat dark boxes.
 */
export function uniqueIds(xml: string, suffix: string | number): string {
  return xml.replace(/\bid="([^"]+)"/g, `id="$1-${suffix}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${suffix})`);
}
