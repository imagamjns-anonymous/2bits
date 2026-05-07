import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import TemperatureSelector from "./TemperatureSelector";

export default function LeadFilters({
  filters,
  onChange,
  onApply,
  onClear,
  onExport,
  isLoading,
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Lead Dashboard</Text>
      <Text style={styles.subtitle}>
        Narrow the list by lead temperature or a specific visit date.
      </Text>

      <Text style={styles.label}>Filter by tag</Text>
      <TemperatureSelector
        value={filters.temperature}
        onChange={(temperature) => onChange({ ...filters, temperature })}
        allowAll
      />

      <Text style={styles.label}>Filter by date</Text>
      <TextInput
        value={filters.date}
        onChangeText={(date) => onChange({ ...filters, date })}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#7C7D84"
        style={styles.input}
        autoCapitalize="none"
      />

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.primaryButton]} onPress={onApply}>
          <Text style={styles.primaryText}>{isLoading ? "Refreshing..." : "Apply Filters"}</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={onClear}>
          <Text style={styles.secondaryText}>Clear</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={onExport}>
          <Text style={styles.secondaryText}>Export CSV</Text>
        </Pressable>
      </View>
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
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#182026",
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8D2C7",
    backgroundColor: "#FBF8F4",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#182026",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: "#182026",
  },
  secondaryButton: {
    backgroundColor: "#F1EBE2",
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  secondaryText: {
    color: "#182026",
    fontWeight: "700",
  },
});
