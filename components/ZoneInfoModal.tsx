import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { PatrolZone } from "@/constants/zones";

interface ZoneInfoModalProps {
  zone: PatrolZone | null;
  visible: boolean;
  onClose: () => void;
}

export default function ZoneInfoModal({ zone, visible, onClose }: ZoneInfoModalProps) {
  if (!zone) return null;

  const includedBoundaries = zone.boundaries.filter((b) => b.included);
  const excludedBoundaries = zone.boundaries.filter((b) => !b.included);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.colorBar, { backgroundColor: zone.color }]} />
            <View style={styles.headerText}>
              <Text style={[styles.zoneName, { color: zone.color }]}>
                {zone.name}
              </Text>
              <Text style={styles.zoneDesc}>{zone.description}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="map-outline" size={14} color={Colors.dark.tint} />
                <Text style={styles.sectionTitle}>ZONE BOUNDARIES</Text>
              </View>

              {includedBoundaries.length > 0 && (
                <View style={styles.boundaryGroup}>
                  <Text style={styles.boundaryLabel}>INCLUDED (SOLID)</Text>
                  {includedBoundaries.map((b, i) => (
                    <View key={`inc-${i}`} style={styles.boundaryRow}>
                      <Text style={styles.compassBadge}>{b.compass}</Text>
                      <Text style={styles.boundaryStreet}>{b.street}</Text>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.dark.success} />
                    </View>
                  ))}
                </View>
              )}

              {excludedBoundaries.length > 0 && (
                <View style={styles.boundaryGroup}>
                  <Text style={styles.boundaryLabel}>EXCLUDED (BROKEN)</Text>
                  {excludedBoundaries.map((b, i) => (
                    <View key={`exc-${i}`} style={styles.boundaryRow}>
                      <Text style={styles.compassBadge}>{b.compass}</Text>
                      <Text style={styles.boundaryStreet}>{b.street}</Text>
                      <Ionicons name="close-circle" size={14} color={Colors.dark.textMuted} />
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="walk-outline" size={14} color={Colors.dark.tint} />
                <Text style={styles.sectionTitle}>PATROL STREETS</Text>
              </View>

              {zone.patrolStreets.map((ps, i) => (
                <View key={`ps-${i}`} style={styles.streetRow}>
                  <View style={[styles.streetDot, { backgroundColor: zone.color }]} />
                  <View style={styles.streetInfo}>
                    <Text style={styles.streetName}>{ps.street}</Text>
                    {ps.segments.map((seg, j) => (
                      <Text key={`seg-${j}`} style={styles.streetSegment}>
                        {seg.to_landmark ? seg.to_landmark : `${seg.from} → ${seg.to}`}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: zone.color }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 18,
    width: "100%",
    maxWidth: 400,
    height: "80%",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  colorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  zoneName: {
    fontFamily: "RobotoMono_700Bold",
    fontSize: 18,
    letterSpacing: 1.5,
  },
  zoneDesc: {
    fontFamily: "RobotoMono_400Regular",
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: "RobotoMono_700Bold",
    fontSize: 11,
    color: Colors.dark.tint,
    letterSpacing: 2,
  },
  boundaryGroup: {
    gap: 6,
  },
  boundaryLabel: {
    fontFamily: "RobotoMono_400Regular",
    fontSize: 9,
    color: Colors.dark.textMuted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  boundaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  compassBadge: {
    fontFamily: "RobotoMono_700Bold",
    fontSize: 11,
    color: Colors.dark.text,
    width: 20,
    textAlign: "center",
  },
  boundaryStreet: {
    fontFamily: "RobotoMono_400Regular",
    fontSize: 13,
    color: Colors.dark.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 16,
  },
  streetRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
  },
  streetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  streetInfo: {
    flex: 1,
    gap: 2,
  },
  streetName: {
    fontFamily: "RobotoMono_500Medium",
    fontSize: 14,
    color: Colors.dark.text,
  },
  streetSegment: {
    fontFamily: "RobotoMono_400Regular",
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
  doneBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneBtnText: {
    fontFamily: "RobotoMono_700Bold",
    fontSize: 13,
    color: "#fff",
    letterSpacing: 2,
  },
});
