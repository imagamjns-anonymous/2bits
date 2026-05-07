import { Linking } from "react-native";

function normalizePhoneNumber(phone) {
  return phone.replace(/[^\d]/g, "");
}

async function openWhatsAppChat({ phone, message }) {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) {
    throw new Error("A valid phone number is required to open WhatsApp.");
  }

  const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
  const supported = await Linking.canOpenURL(url);

  if (!supported) {
    throw new Error("WhatsApp or the browser link could not be opened on this device.");
  }

  await Linking.openURL(url);
}

export { openWhatsAppChat };
