import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const OPTIONS = [
  { label: "Hot", value: "hot", dot: "#E84747" },
  { label: "Warm", value: "warm", dot: "#E2A437" },
  { label: "Cold", value: "cold", dot: "#D5D8DE" },
];

export default function TemperatureSelector({ value, onChange, allowAll = false }) {
  const options = allowAll
    ? [{ label: "All", value: "all", dot: "#182026" }, ...OPTIONS]
    : OPTIONS;

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.pill, isActive && styles.activePill]}
          >
            <View style={[styles.dot, { backgroundColor: option.dot }]} />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D8D2C7",
    backgroundColor: "#FBF8F4",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  activePill: {
    borderColor: "#182026",
    backgroundColor: "#182026",
  },
  label: {
    color: "#182026",
    fontWeight: "700",
  },
  activeLabel: {
    color: "#FFFFFF",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
