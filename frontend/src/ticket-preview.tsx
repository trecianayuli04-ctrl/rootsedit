import { Text, View } from "react-native";
import { Platform } from "react-native";

import { ticketLines, Station } from "@/src/receipt";
import { makeStyles } from "@/src/theme";

export function TicketPreview({ sale, settings, station }: { sale: any; settings: any; station: Station }) {
  const s = useS();
  const lines = ticketLines(sale, settings, station);
  return (
    <View style={s.paper} testID={`ticket-preview-${station}`}>
      <Text style={s.mono}>{lines.length ? lines.join("\n") : "(Tidak ada item untuk nota ini)"}</Text>
    </View>
  );
}

const useS = makeStyles((c) => ({
  paper: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 12, alignSelf: "center", maxWidth: "100%" },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), fontSize: 12, lineHeight: 17, color: c.onSurface },
}));
