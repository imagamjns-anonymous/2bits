import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

function getBadgeStyle(temperature) {
  switch (temperature) {
    case "hot":
      return {
        backgroundColor: "#FDEBEC",
        textColor: "#B62631",
        label: "Hot Lead",
      };
    case "cold":
      return {
        backgroundColor: "#EFF2F6",
        textColor: "#596270",
        label: "Cold",
      };
    default:
      return {
        backgroundColor: "#FFF3DC",
        textColor: "#9B5D00",
        label: "Warm",
      };
  }
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString();
}

export default function LeadList({ leads, isLoading, onEdit, onSendMessage }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Leads</Text>
      <Text style={styles.subtitle}>
        {isLoading ? "Refreshing your dashboard..." : "Tap any lead to continue the conversation."}
      </Text>

      {leads.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No leads yet</Text>
          <Text style={styles.emptyText}>
            Save your first expo contact above and the dashboard will appear here.
          </Text>
        </View>
      ) : (
        leads.map((lead) => {
          const badge = getBadgeStyle(lead.temperature);

          return (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <View style={styles.identity}>
                  <Text style={styles.leadName}>{lead.name}</Text>
                  <Text style={styles.companyText}>{lead.company || "Independent"}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
                  <Text style={[styles.badgeText, { color: badge.textColor }]}>{badge.label}</Text>
                </View>
              </View>

              <Text style={styles.metaLine}>{lead.phone}</Text>
              <Text style={styles.metaLine}>
                Source: {lead.source} | Added: {formatDate(lead.createdAt)}
              </Text>
              {lead.lastContactedAt ? (
                <Text style={styles.metaLine}>
                  Last WhatsApp touch: {formatDate(lead.lastContactedAt)}
                </Text>
              ) : null}
              {lead.notes ? <Text style={styles.notes}>{lead.notes}</Text> : null}

              <View style={styles.actions}>
                <Pressable
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => onSendMessage(lead)}
                >
                  <Text style={styles.primaryText}>Send Message</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => onEdit(lead)}
                >
                  <Text style={styles.secondaryText}>Edit</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#182026",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5D646B",
  },
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E6DED2",
    borderStyle: "dashed",
    padding: 18,
    backgroundColor: "#FBF8F4",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#182026",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5D646B",
  },
  leadCard: {
    borderRadius: 22,
    backgroundColor: "#FBF8F4",
    padding: 16,
    gap: 10,
  },
  leadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  identity: {
    flex: 1,
    gap: 4,
  },
  leadName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#182026",
  },
  companyText: {
    fontSize: 13,
    color: "#5D646B",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  metaLine: {
    fontSize: 13,
    color: "#3B434A",
  },
  notes: {
    fontSize: 13,
    lineHeight: 19,
    color: "#3B434A",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  button: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: "#25D366",
  },
  secondaryButton: {
    backgroundColor: "#E6DED2",
  },
  primaryText: {
    color: "#0D2A16",
    fontWeight: "800",
  },
  secondaryText: {
    color: "#182026",
    fontWeight: "700",
  },
});
