import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import TemperatureSelector from "./TemperatureSelector";
import { parseLeadFromQr } from "../utils/leadParsers";

const CAPTURE_METHODS = [
  { label: "Manual", value: "manual" },
  { label: "Visiting Card", value: "card" },
  { label: "QR Scan", value: "qr" },
];

export default function LeadForm({
  lead,
  setLead,
  cardImageUri,
  setCardImageUri,
  isSaving,
  isEditing,
  onSave,
  onCancelEdit,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);

  async function pickCardImage() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission needed",
        "Photo library access is required to upload a visiting card."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled) {
      return;
    }

    const image = result.assets[0];
    setCardImageUri(image.uri);
    setLead({
      ...lead,
      source: "card",
      cardImageUrl: "",
    });
  }

  async function beginQrScan() {
    if (!permission?.granted) {
      const response = await requestPermission();

      if (!response.granted) {
        Alert.alert(
          "Permission needed",
          "Camera access is required to scan QR codes."
        );
        return;
      }
    }

    setLead({ ...lead, source: "qr" });
    setScanLocked(false);
    setShowScanner(true);
  }

  function handleScannedValue(rawValue) {
    if (scanLocked) {
      return;
    }

    setScanLocked(true);
    const parsedLead = parseLeadFromQr(rawValue);
    setLead({
      ...lead,
      ...parsedLead,
      source: "qr",
      temperature: lead.temperature,
    });
    setShowScanner(false);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{isEditing ? "Edit Lead" : "Capture Lead"}</Text>
      <Text style={styles.subtitle}>
        Start from manual entry, attach a visiting card photo, or scan a QR code from a badge.
      </Text>

      <View style={styles.captureRow}>
        {CAPTURE_METHODS.map((method) => {
          const isActive = lead.source === method.value;

          return (
            <Pressable
              key={method.value}
              onPress={() => {
                setLead({
                  ...lead,
                  source: method.value,
                  cardImageUrl: method.value === "card" ? lead.cardImageUrl : "",
                });
                if (method.value !== "qr") {
                  setShowScanner(false);
                  setScanLocked(false);
                }
                if (method.value !== "card") {
                  setCardImageUri("");
                }
              }}
              style={[styles.captureButton, isActive && styles.captureButtonActive]}
            >
              <Text
                style={[
                  styles.captureButtonLabel,
                  isActive && styles.captureButtonLabelActive,
                ]}
              >
                {method.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {lead.source === "card" ? (
        <View style={styles.imagePanel}>
          <Pressable style={styles.utilityButton} onPress={pickCardImage}>
            <Text style={styles.utilityButtonText}>
              {cardImageUri ? "Replace Card Photo" : "Upload Visiting Card"}
            </Text>
          </Pressable>
          <Text style={styles.helperText}>
            V1 stores the card image so your team can review and fill details quickly.
          </Text>
          {cardImageUri ? <Image source={{ uri: cardImageUri }} style={styles.preview} /> : null}
        </View>
      ) : null}

      {lead.source === "qr" ? (
        <View style={styles.scannerPanel}>
          {!showScanner ? (
            <Pressable style={styles.utilityButton} onPress={beginQrScan}>
              <Text style={styles.utilityButtonText}>Open QR Scanner</Text>
            </Pressable>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => handleScannedValue(data)}
              />
              <Pressable
                style={[styles.utilityButton, styles.utilityButtonLight]}
                onPress={() => setShowScanner(false)}
              >
                <Text style={styles.utilityButtonLightText}>Close Scanner</Text>
              </Pressable>
            </>
          )}
          <Text style={styles.helperText}>
            QR scanning supports vCard, MeCard, JSON, and simple label-value formats.
          </Text>
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={lead.name}
          onChangeText={(name) => setLead({ ...lead, name })}
          style={styles.input}
          placeholder="Visitor name"
          placeholderTextColor="#7C7D84"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          value={lead.phone}
          onChangeText={(phone) => setLead({ ...lead, phone })}
          style={styles.input}
          placeholder="+91 98765 43210"
          placeholderTextColor="#7C7D84"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Company</Text>
        <TextInput
          value={lead.company}
          onChangeText={(company) => setLead({ ...lead, company })}
          style={styles.input}
          placeholder="Company"
          placeholderTextColor="#7C7D84"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          value={lead.notes}
          onChangeText={(notes) => setLead({ ...lead, notes })}
          style={[styles.input, styles.notesInput]}
          placeholder="Conversation notes, next steps, product interest..."
          placeholderTextColor="#7C7D84"
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Tagging</Text>
        <TemperatureSelector
          value={lead.temperature}
          onChange={(temperature) => setLead({ ...lead, temperature })}
        />
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.primaryButton, isSaving && styles.disabled]} onPress={onSave}>
          <Text style={styles.primaryButtonText}>
            {isSaving ? "Saving..." : isEditing ? "Update Lead" : "Save Lead"}
          </Text>
        </Pressable>
        {isEditing ? (
          <Pressable style={styles.secondaryButton} onPress={onCancelEdit}>
            <Text style={styles.secondaryButtonText}>Cancel Edit</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 14,
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
  captureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  captureButton: {
    borderRadius: 999,
    backgroundColor: "#F1EBE2",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  captureButtonActive: {
    backgroundColor: "#182026",
  },
  captureButtonLabel: {
    color: "#182026",
    fontWeight: "700",
  },
  captureButtonLabelActive: {
    color: "#FFFFFF",
  },
  imagePanel: {
    gap: 10,
  },
  utilityButton: {
    alignSelf: "flex-start",
    borderRadius: 14,
    backgroundColor: "#E9884A",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  utilityButtonLight: {
    backgroundColor: "#F1EBE2",
  },
  utilityButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  utilityButtonLightText: {
    color: "#182026",
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#5D646B",
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: "#F4EFE8",
  },
  scannerPanel: {
    gap: 10,
  },
  camera: {
    width: "100%",
    height: 240,
    borderRadius: 18,
    overflow: "hidden",
  },
  fieldGroup: {
    gap: 8,
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
  notesInput: {
    minHeight: 110,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: "#182026",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 16,
    backgroundColor: "#F1EBE2",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: "#182026",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});
