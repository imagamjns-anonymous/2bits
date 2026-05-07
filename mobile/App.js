import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import LeadFilters from "./src/components/LeadFilters";
import LeadForm from "./src/components/LeadForm";
import LeadList from "./src/components/LeadList";
import {
  createLead,
  exportLeadCsv,
  getLeads,
  markLeadContacted,
  updateLead,
  uploadLeadCard,
} from "./src/api/client";
import { shareCsvFile } from "./src/utils/exportCsv";
import { openWhatsAppChat } from "./src/utils/whatsapp";

const DEFAULT_API_BASE_URL = "http://10.0.2.2:4000/api";

const createEmptyLead = () => ({
  name: "",
  phone: "",
  company: "",
  notes: "",
  temperature: "warm",
  source: "manual",
  cardImageUrl: "",
});

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState(DEFAULT_API_BASE_URL);
  const [expoName, setExpoName] = useState("Expo 2026");
  const [draftFilters, setDraftFilters] = useState({ temperature: "all", date: "" });
  const [appliedFilters, setAppliedFilters] = useState({
    temperature: "all",
    date: "",
  });
  const [leadForm, setLeadForm] = useState(createEmptyLead());
  const [cardImageUri, setCardImageUri] = useState("");
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusText, setStatusText] = useState("Ready for the next conversation.");

  useEffect(() => {
    void loadLeads(appliedFilters);
  }, [apiBaseUrl, appliedFilters]);

  async function loadLeads(filters = appliedFilters) {
    setIsLoading(true);

    try {
      const items = await getLeads(apiBaseUrl, filters);
      setLeads(items);
      setStatusText(`Loaded ${items.length} lead${items.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setStatusText(error.message);
      Alert.alert("Unable to load leads", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveLead() {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) {
      Alert.alert("Missing details", "Name and phone are required.");
      return;
    }

    setIsSaving(true);

    try {
      let cardImageUrl = leadForm.cardImageUrl;

      if (leadForm.source === "card" && cardImageUri && !cardImageUrl) {
        const uploadResult = await uploadLeadCard(apiBaseUrl, cardImageUri);
        cardImageUrl = uploadResult.url;
      }

      const payload = {
        ...leadForm,
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim(),
        company: leadForm.company.trim(),
        notes: leadForm.notes.trim(),
        cardImageUrl,
      };

      if (editingLeadId) {
        await updateLead(apiBaseUrl, editingLeadId, payload);
        setStatusText("Lead updated.");
      } else {
        await createLead(apiBaseUrl, payload);
        setStatusText("Lead created.");
      }

      resetLeadForm();
      await loadLeads(appliedFilters);
    } catch (error) {
      Alert.alert("Unable to save lead", error.message);
      setStatusText(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  function resetLeadForm() {
    setLeadForm(createEmptyLead());
    setCardImageUri("");
    setEditingLeadId(null);
  }

  function handleEditLead(lead) {
    setEditingLeadId(lead.id);
    setLeadForm({
      name: lead.name,
      phone: lead.phone,
      company: lead.company,
      notes: lead.notes,
      temperature: lead.temperature,
      source: lead.source,
      cardImageUrl: lead.cardImageUrl,
    });
    setCardImageUri(lead.cardImageUrl || "");
    setStatusText(`Editing ${lead.name}.`);
  }

  async function handleSendMessage(lead) {
    try {
      await openWhatsAppChat({
        phone: lead.phone,
        message: `Hi, great meeting you at ${expoName.trim() || "the expo"}.`,
      });
      await markLeadContacted(apiBaseUrl, lead.id);
      await loadLeads(appliedFilters);
      setStatusText(`Opened WhatsApp follow-up for ${lead.name}.`);
    } catch (error) {
      Alert.alert("Unable to open WhatsApp", error.message);
      setStatusText(error.message);
    }
  }

  async function handleExport() {
    try {
      const csvText = await exportLeadCsv(apiBaseUrl, appliedFilters);
      const sharedFile = await shareCsvFile(csvText);
      setStatusText(`Exported CSV to ${sharedFile.filename}.`);
    } catch (error) {
      Alert.alert("Unable to export leads", error.message);
      setStatusText(error.message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <Text style={styles.eyebrow}>Expo Lead Hub</Text>
            <Text style={styles.title}>Capture fast. Tag smart. Follow up while the lead is still warm.</Text>
            <Text style={styles.subtitle}>
              Built for booth teams who need one clean workflow from first hello to WhatsApp follow-up.
            </Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Session Setup</Text>
            <Text style={styles.panelHint}>
              Update the event name for message templates and the API URL for your emulator or device.
            </Text>
            <TextInput
              value={expoName}
              onChangeText={setExpoName}
              style={styles.input}
              placeholder="Expo Name"
              placeholderTextColor="#7C7D84"
            />
            <TextInput
              value={apiBaseUrlInput}
              onChangeText={setApiBaseUrlInput}
              style={styles.input}
              placeholder="API base URL"
              placeholderTextColor="#7C7D84"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={styles.connectButton}
              onPress={() => setApiBaseUrl(apiBaseUrlInput.trim() || DEFAULT_API_BASE_URL)}
            >
              <Text style={styles.connectButtonText}>Reconnect API</Text>
            </Pressable>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>

          <LeadForm
            lead={leadForm}
            setLead={setLeadForm}
            cardImageUri={cardImageUri}
            setCardImageUri={setCardImageUri}
            isSaving={isSaving}
            isEditing={Boolean(editingLeadId)}
            onSave={handleSaveLead}
            onCancelEdit={resetLeadForm}
          />

          <LeadFilters
            filters={draftFilters}
            onChange={setDraftFilters}
            onApply={() => setAppliedFilters(draftFilters)}
            onClear={() => {
              const cleared = { temperature: "all", date: "" };
              setDraftFilters(cleared);
              setAppliedFilters(cleared);
            }}
            onExport={handleExport}
            isLoading={isLoading}
          />

          <LeadList
            leads={leads}
            isLoading={isLoading}
            onEdit={handleEditLead}
            onSendMessage={handleSendMessage}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4EFE8",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 44,
    gap: 18,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: "#182026",
    padding: 24,
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#E9884A",
    opacity: 0.35,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#F0B38A",
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#DFE6EA",
  },
  panel: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 12,
    shadowColor: "#111111",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#182026",
  },
  panelHint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5D646B",
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
  statusText: {
    fontSize: 13,
    color: "#5D646B",
  },
  connectButton: {
    alignSelf: "flex-start",
    borderRadius: 14,
    backgroundColor: "#E9884A",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
