import { memo, useMemo, useRef } from "react";
import { View } from "react-native";
import { parse, SvgAst } from "react-native-svg";
import { uniqueIds } from "./uniqueIds";

let copies = 0;

/** Draws one of the hand-drawn SVGs (src/art/harsi/svg, src/art/people/svg). */
export const HandDrawn = memo(function HandDrawn({ xml, size, mirrored, opacity }: { xml: string; size: number; mirrored?: boolean; opacity?: number }) {
  const copy = useRef(0);
  if (!copy.current) copy.current = ++copies;
  const ast = useMemo(() => parse(uniqueIds(xml, copy.current)), [xml]);
  const art = <SvgAst ast={ast} override={{ width: size, height: size, opacity }} />;
  return mirrored ? <View style={{ width: size, height: size, transform: [{ scaleX: -1 }] }}>{art}</View> : art;
});
