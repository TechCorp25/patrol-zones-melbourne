import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [officerNumber, setOfficerNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = useCallback(async () => {
    setError("");
    if (!officerNumber.trim()) {
      setError("Officer number is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    setSubmitting(true);
    const result = await login(officerNumber.trim(), password);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || "Login failed");
    }
  }, [officerNumber, password, login]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoArea}>
            <View style={styles.iconRing}>
              <MaterialCommunityIcons name="shield-check" size={44} color={Colors.dark.tint} />
            </View>
            <Text style={styles.title}>PATROL ZONES</Text>
            <Text style={styles.subtitle}>Melbourne City Council</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>OFFICER LOGIN</Text>

            {error !== "" && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={14} color={Colors.dark.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>OFFICER NUMBER</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={16} color={Colors.dark.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={officerNumber}
                  onChangeText={setOfficerNumber}
                  placeholder="Enter your officer number"
                  placeholderTextColor={Colors.dark.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.dark.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.flex]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.dark.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={Colors.dark.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>SIGN IN</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => router.replace("/register")}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>
              Don&apos;t have an account? <Text style={styles.switchTextBold}>Register</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Colors.dark.tint,
    backgroundColor: Colors.dark.tintDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.text,
    fontSize: 22,
    letterSpacing: 4,
  },
  subtitle: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 20,
    gap: 16,
  },
  cardTitle: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.tint,
    fontSize: 13,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 4,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.danger,
    fontSize: 11,
    flex: 1,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.textMuted,
    fontSize: 9,
    letterSpacing: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    backgroundColor: Colors.dark.surfaceAlt,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontFamily: "RobotoMono_400Regular",
    fontSize: 14,
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  submitBtn: {
    backgroundColor: Colors.dark.tint,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontFamily: "RobotoMono_700Bold",
    color: "#fff",
    fontSize: 14,
    letterSpacing: 2,
  },
  switchLink: {
    alignItems: "center",
    marginTop: 20,
    padding: 8,
  },
  switchText: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  switchTextBold: {
    color: Colors.dark.tint,
    fontFamily: "RobotoMono_700Bold",
  },
});
