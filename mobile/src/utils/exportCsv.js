import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

async function shareCsvFile(csvText) {
  const filename = `expo-leads-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  const file = new File(Paths.cache, filename);

  file.create();
  file.write(csvText);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/csv",
      dialogTitle: "Export leads",
    });
  }

  return {
    filename,
    uri: file.uri,
  };
}

export { shareCsvFile };
