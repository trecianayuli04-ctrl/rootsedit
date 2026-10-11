import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";

import { makeStyles, useTheme } from "@/src/theme";

export const Icon = Ionicons;
export const sp = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const rad = { sm: 6, md: 12, lg: 20, pill: 999 };

export const useWide = () => useWindowDimensions().width >= 768;

export function Header({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode }) {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[s.header, { paddingTop: insets.top + sp.sm }]}>
      {back && (
        <Pressable testID="header-back-button" onPress={() => router.back()} style={s.iconBtn} hitSlop={8}>
          <Icon name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.hTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && <Text style={s.hSub}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function Page({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  return <View style={[s.page, style]}>{children}</View>;
}

export function Card({ children, style, onPress, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; testID?: string }) {
  const s = useStyles();
  if (onPress)
    return (
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  return (
    <View testID={testID} style={[s.card, style]}>
      {children}
    </View>
  );
}

type BtnProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};
export function Btn({ title, onPress, variant = "primary", icon, loading, disabled, testID, style, small }: BtnProps) {
  const s = useStyles();
  const { colors } = useTheme();
  const map = {
    primary: [colors.brandPrimary, colors.onBrandPrimary],
    secondary: [colors.brandSecondary, colors.onBrandSecondary],
    danger: [colors.error, colors.onError],
    success: [colors.success, colors.onSuccess],
    ghost: [colors.surfaceTertiary, colors.onSurface],
  }[variant];
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: map[0], opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={map[1]} />
      ) : (
        <>
          {!!icon && <Icon name={icon as any} size={small ? 16 : 20} color={map[1]} />}
          <Text style={[s.btnText, small && { fontSize: 13 }, { color: map[1] }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, ...p }: TextInputProps & { label: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: sp.md }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={s.input} {...p} />
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange, testPrefix }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void; testPrefix: string }) {
  const s = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.chipRow}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} testID={`${testPrefix}-${o.value}`} onPress={() => onChange(o.value)} style={[s.chip, active && s.chipActive]}>
            <Text style={[s.chipText, active && s.chipTextActive]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Badge({ label, tone = "muted" }: { label: string; tone?: "success" | "warning" | "error" | "info" | "brand" | "muted" }) {
  const { colors } = useTheme();
  const bg = { success: colors.success, warning: colors.warning, error: colors.error, info: colors.info, brand: colors.brandPrimary, muted: colors.surfaceTertiary }[tone];
  const fg = tone === "muted" ? colors.onSurfaceTertiary : colors.onSuccess;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: sp.sm, paddingVertical: 2, borderRadius: rad.pill, alignSelf: "flex-start" }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export const STATUS_TONE: Record<string, "success" | "warning" | "error" | "info"> = {
  pending: "warning",
  approved: "info",
  received: "success",
  rejected: "error",
  paid: "success",
  draft: "warning",
};

export function Stat({ label, value, tone, testID, icon }: { label: string; value: string; tone?: "success" | "error" | "brand"; testID?: string; icon?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const c = tone === "success" ? colors.success : tone === "error" ? colors.error : tone === "brand" ? colors.brandPrimary : colors.onSurface;
  return (
    <View style={s.stat} testID={testID}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp.xs }}>
        {!!icon && <Icon name={icon as any} size={14} color={colors.muted} />}
        <Text style={s.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[s.statValue, { color: c }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export function StateView({ loading, error, empty, onRetry }: { loading?: boolean; error?: string | null; empty?: string; onRetry?: () => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  if (loading) return <ActivityIndicator style={{ margin: sp.xl }} color={colors.brandPrimary} />;
  if (error)
    return (
      <View style={s.center} testID="error-state">
        <Text style={s.muted}>{error}</Text>
        {onRetry && <Btn title="Coba lagi" variant="secondary" small onPress={onRetry} style={{ marginTop: sp.md }} />}
      </View>
    );
  if (empty)
    return (
      <View style={s.center} testID="empty-state">
        <Icon name="cafe-outline" size={36} color={colors.muted} />
        <Text style={[s.muted, { marginTop: sp.sm }]}>{empty}</Text>
      </View>
    );
  return null;
}

export function Sheet({ visible, onClose, title, children, testID }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode; testID?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} testID="sheet-backdrop" />
        <View style={[s.sheet, { paddingBottom: insets.bottom + sp.lg }]} testID={testID}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Pressable testID="sheet-close-button" onPress={onClose} hitSlop={10} style={s.iconBtn}>
              <Icon name="close" size={24} color={colors.onSurface} />
            </Pressable>
          </View>
          <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: sp.lg }}>
            {children}
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Toast ----------
const ToastCtx = createContext<(msg: string, type?: "success" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [t, setT] = useState<{ msg: string; type: string } | null>(null);
  const timer = useRef<any>(null);
  const show = useCallback((msg: string, type: "success" | "error" = "success") => {
    setT({ msg, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && (
        <Animated.View entering={FadeInUp} exiting={FadeOutUp} style={[s.toast, { top: insets.top + sp.sm, backgroundColor: t.type === "error" ? colors.error : colors.surfaceInverse }]} testID="toast-message">
          <Icon name={t.type === "error" ? "alert-circle" : "checkmark-circle"} size={20} color={colors.onSurfaceInverse} />
          <Text style={{ color: colors.onSurfaceInverse, flex: 1, fontWeight: "600" }}>{t.msg}</Text>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export const useStyles = makeStyles((c) => ({
  page: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", gap: sp.sm, paddingHorizontal: sp.lg, paddingBottom: sp.md, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.divider },
  hTitle: { fontSize: 24, fontWeight: "800", color: c.onSurface, letterSpacing: -0.5 },
  hSub: { fontSize: 13, color: c.muted, marginTop: 2 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: rad.md, borderWidth: 1, borderColor: c.border, padding: sp.lg },
  btn: { minHeight: 48, borderRadius: rad.md, paddingHorizontal: sp.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp.sm },
  btnSmall: { minHeight: 36, paddingHorizontal: sp.md, borderRadius: rad.sm },
  btnText: { fontSize: 15, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary, marginBottom: sp.xs },
  input: { minHeight: 48, borderRadius: rad.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: sp.md, fontSize: 15, color: c.onSurface },
  chipRow: { gap: sp.sm, paddingHorizontal: sp.lg, paddingVertical: 10, alignItems: "center" },
  chip: { height: 36, paddingHorizontal: sp.lg, borderRadius: rad.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { fontSize: 14, fontWeight: "600", color: c.onSurfaceSecondary },
  chipTextActive: { color: c.onBrandPrimary },
  stat: { flexGrow: 1, flexBasis: 150, backgroundColor: c.surfaceSecondary, borderRadius: rad.md, borderWidth: 1, borderColor: c.border, padding: sp.md },
  statLabel: { fontSize: 12, color: c.muted, fontWeight: "600" },
  statValue: { fontSize: 20, fontWeight: "800", marginTop: sp.xs },
  center: { alignItems: "center", padding: sp.xl },
  muted: { color: c.muted, fontSize: 14, textAlign: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: rad.lg, borderTopRightRadius: rad.lg, maxHeight: "90%", width: "100%", maxWidth: 640, alignSelf: "center" },
  sheetHead: { flexDirection: "row", alignItems: "center", paddingLeft: sp.lg, paddingRight: sp.sm, paddingVertical: sp.sm },
  sheetTitle: { flex: 1, fontSize: 20, fontWeight: "800", color: c.onSurface },
  toast: { position: "absolute", left: sp.lg, right: sp.lg, borderRadius: rad.md, padding: sp.md, flexDirection: "row", gap: sp.sm, alignItems: "center" },
  // shared list text
  title: { fontSize: 16, fontWeight: "700", color: c.onSurface },
  sub: { fontSize: 13, color: c.muted, marginTop: 2 },
  value: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  section: { fontSize: 13, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: sp.lg, marginBottom: sp.sm },
  row: { flexDirection: "row", alignItems: "center", gap: sp.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: sp.md },
  list: { padding: sp.lg, gap: sp.md, width: "100%", maxWidth: 1100, alignSelf: "center" },
}));
