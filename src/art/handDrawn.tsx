import { memo } from "react";
import { View } from "react-native";
import { parse, SvgAst, type JsxAST } from "react-native-svg";

/**
 * Draws one of the hand-drawn SVGs (src/art/harsi/svg, src/art/people/svg). Parsing the markup is
 * the costly part, so each drawing is parsed once and the result reused by every copy on screen.
 */
const parsed = new Map<string, JsxAST | null>();

export const HandDrawn = memo(function HandDrawn({ xml, size, mirrored, opacity }: { xml: string; size: number; mirrored?: boolean; opacity?: number }) {
  if (!parsed.has(xml)) parsed.set(xml, parse(xml));
  const art = <SvgAst ast={parsed.get(xml) ?? null} override={{ width: size, height: size, opacity }} />;
  return mirrored ? <View style={{ width: size, height: size, transform: [{ scaleX: -1 }] }}>{art}</View> : art;
});
