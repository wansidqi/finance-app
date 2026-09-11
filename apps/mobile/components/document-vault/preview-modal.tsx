import { IconButton } from "@/components/ui/icon-button";
import { Image } from "expo-image";
import { Modal, ScrollView, View } from "react-native";
import Pdf from "react-native-pdf";
import WebView from "react-native-webview";

const HTML_MIME_TYPES = new Set(["text/html", "application/xhtml+xml"]);

type Props = {
  visible: boolean;
  uri: string | null;
  mimeType: string | null;
  onClose: () => void;
};

/** Full-screen preview for a local file — images get a zoomable viewer, PDFs render in-app via react-native-pdf. Shared between the pre-save review step (add-document-modal.tsx) and already-saved documents (index.tsx). */
export function DocumentPreviewModal({ visible, uri, mimeType, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/95">
        <View className="flex-row justify-end items-center pt-14 pb-3 px-4 bg-black/95">
          <IconButton onPress={onClose} icon="close-outline" label="Close" size={22} />
        </View>
        {mimeType === "application/pdf" ? (
          <Pdf
            source={{ uri: uri ?? "" }}
            fitPolicy={0}
            style={{ flex: 1, backgroundColor: "transparent" }}
          />
        ) : mimeType && HTML_MIME_TYPES.has(mimeType) ? (
          <View className="flex-1 bg-white">
            <WebView
              source={{ uri: uri ?? "" }}
              style={{ flex: 1 }}
              originWhitelist={["file://*"]}
              allowFileAccess
              allowingReadAccessToURL={uri ?? undefined}
            />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
          >
            {uri && <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
