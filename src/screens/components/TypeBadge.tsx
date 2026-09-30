import { StyleSheet, Text, View } from "react-native";
import { typeColor, typeIcon } from "../theme";
import { useI18n } from "../../i18n";

/** A type's colour, symbol and name. `compact` is the small chip used on move buttons. */
export function TypeBadge({ type, compact }: { type: string; compact?: boolean }) {
  const { c } = useI18n();
  return (
    <View style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: typeColor(type) }]}>
      <Text style={[styles.icon, compact && styles.iconCompact]}>{typeIcon(type)}</Text>
      <Text style={[styles.text, compact && styles.textCompact]}>{c.type(type)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    gap: 4,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 0,
    gap: 2,
  },
  icon: {
    fontSize: 12,
  },
  iconCompact: {
    fontSize: 9,
  },
  textCompact: {
    fontSize: 10,
  },
  text: {
    color: "#0d1b2a",
    fontSize: 12,
    fontWeight: "700",
  },
});
