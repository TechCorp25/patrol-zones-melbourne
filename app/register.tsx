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
import { ALLOWED_EMAIL_DOMAIN } from "@shared/schema";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [officerNumber, setOfficerNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = useCallback(async () => {
    setError("");

    if (!email.trim()) {
      setError("Email address is required");
      return;
    }
    if (!email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      setError(`Email must end with @${ALLOWED_EMAIL_DOMAIN}`);
      return;
    }
    if (!officerNumber.trim()) {
      setError("Officer number is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    const result = await register(email.trim(), officerNumber.trim(), password, confirmPassword);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || "Registration failed");
    }
  }, [email, officerNumber, password, confirmPassword, register]);

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
            <Text style={styles.subtitle}>Officer Registration</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>CREATE ACCOUNT</Text>

            {error !== "" && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={14} color={Colors.dark.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={16} color={Colors.dark.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={`name@${ALLOWED_EMAIL_DOMAIN}`}
                  placeholderTextColor={Colors.dark.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>
              <Text style={styles.fieldHint}>Council email required (@{ALLOWED_EMAIL_DOMAIN})</Text>
            </View>

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
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={Colors.dark.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
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

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.dark.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor={Colors.dark.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleRegister}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>REGISTER</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => router.replace("/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>
              Already have an account? <Text style={styles.switchTextBold}>Sign In</Text>
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
    marginBottom: 24,
    gap: 8,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.dark.tint,
    backgroundColor: Colors.dark.tintDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.text,
    fontSize: 20,
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
    gap: 14,
  },
  cardTitle: {
    fontFamily: "RobotoMono_700Bold",
    color: Colors.dark.tint,
    fontSize: 13,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 2,
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
  fieldHint: {
    fontFamily: "RobotoMono_400Regular",
    color: Colors.dark.textMuted,
    fontSize: 9,
    letterSpacing: 0.3,
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
