import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { Btn, Field, Icon, sp } from "@/src/ui";
import { makeStyles, useTheme } from "@/src/theme";

export default function Login() {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle, googleError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={[s.form, { paddingTop: insets.top + sp.xl, paddingBottom: insets.bottom + sp.xl }]}
      >
        <View style={s.logoRow}>
          <View style={s.logoMark} testID="login-logo">
            <Icon name="leaf" size={26} color={colors.onBrandPrimary} />
          </View>
          <View>
            <Text style={s.brand}>ROOTS</Text>
            <Text style={s.sub}>Sistem Manajemen Outlet</Text>
          </View>
        </View>

        <View style={s.card}>
          <Field label="Email" testID="login-email-input" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="nama@rollow.id" returnKeyType="next" />
          <Field label="Password" testID="login-password-input" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" returnKeyType="go" onSubmitEditing={submit} />
          {!!err && (
            <Text style={s.err} testID="login-error-text">
              {err}
            </Text>
          )}
          <Btn title="Masuk" testID="login-submit-button" loading={busy} onPress={submit} disabled={!email || !password} />
          <Text style={s.or}>atau</Text>
          <Btn title="Masuk dengan Google" variant="secondary" icon="logo-google" testID="login-google-button" onPress={loginWithGoogle} />
          {!!googleError && (
            <Text style={[s.err, { marginTop: sp.md }]} testID="login-google-error-text">
              {googleError}
            </Text>
          )}
        </View>

        <Text style={s.hint}>Akun dibuat oleh Owner. Login Google hanya untuk email yang sudah didaftarkan Owner di menu Karyawan.</Text>
        <View style={s.demo} testID="demo-accounts-box">
          <Text style={s.demoTitle}>Akun demo (password: Rollow@2026)</Text>
          {["owner", "manager", "spv", "finance", "marketing", "crew"].map((r) => (
            <Text key={r} style={s.demoItem} onPress={() => { setEmail(`${r}@rollow.id`); setPassword("Rollow@2026"); }} testID={`demo-account-${r}`}>
              {r}@rollow.id  ›
            </Text>
          ))}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useS = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  form: { padding: sp.xl, width: "100%", maxWidth: 460, alignSelf: "center" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: sp.md, marginBottom: sp.xl },
  logoMark: { width: 52, height: 52, borderRadius: 14, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 34, fontWeight: "900", color: c.brandPrimary, letterSpacing: 2, lineHeight: 38 },
  sub: { fontSize: 14, color: c.muted },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: sp.lg, gap: sp.xs },
  err: { color: c.error, marginBottom: sp.md, fontWeight: "600" },
  hint: { color: c.muted, fontSize: 12, marginTop: sp.lg, textAlign: "center" },
  or: { color: c.muted, textAlign: "center", marginVertical: sp.md },
  demo: { marginTop: sp.lg, padding: sp.md, borderRadius: 12, backgroundColor: c.brandTertiary, gap: sp.xs },
  demoTitle: { fontWeight: "700", color: c.onBrandTertiary, marginBottom: sp.xs },
  demoItem: { color: c.onSurface, fontSize: 14, paddingVertical: 6 },
}));
