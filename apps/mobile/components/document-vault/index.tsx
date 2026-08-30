import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { VaultDocumentInterface } from "@/interface/document-vault";
import { useDeleteVaultDocument, useGetVaultDocuments, getVaultDocumentData } from "@/services/vault";
import { Ionicons } from "@expo/vector-icons";
import { Directory, File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { AddDocumentModal } from "./add-document-modal";

// Scratch space for a document's bytes while it's open for viewing/sharing —
// overwritten on every open, never relied on to persist.
const VIEW_DIR = new Directory(Paths.cache, "vault-document-view");

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

type FolderGroup = { folder: string; docs: VaultDocumentInterface[] };

// Same shape as Assets' platform grouping — a freeform tag on each row,
// grouped client-side rather than a separate folders table.
function groupByFolder(docs: VaultDocumentInterface[]): {
  groups: FolderGroup[];
  ungrouped: VaultDocumentInterface[];
} {
  const map = new Map<string, VaultDocumentInterface[]>();
  const ungrouped: VaultDocumentInterface[] = [];

  for (const doc of docs) {
    const folder = doc.folder?.trim();
    if (!folder) {
      ungrouped.push(doc);
      continue;
    }
    if (!map.has(folder)) map.set(folder, []);
    map.get(folder)!.push(doc);
  }

  const groups = Array.from(map.entries())
    .map(([folder, groupDocs]) => ({ folder, docs: groupDocs }))
    .sort((a, b) => a.folder.localeCompare(b.folder));

  return { groups, ungrouped };
}

export function DocumentVault() {
  const { data = [], isLoading } = useGetVaultDocuments();
  const { mutateAsync: deleteDocument, isPending: isDeleting } = useDeleteVaultDocument();

  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<{ uri: string; mimeType: string } | null>(null);
  const [isOpeningId, setIsOpeningId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (d) => d.name.toLowerCase().includes(q) || (d.note ?? "").toLowerCase().includes(q),
    );
  }, [data, query]);

  // Grouping by folder only makes sense while browsing — an active search
  // is hunting for one specific item, so show flat matches instead.
  const { groups, ungrouped } = useMemo(
    () => (query.trim() ? { groups: [], ungrouped: filtered } : groupByFolder(filtered)),
    [filtered, query],
  );

  const handleOpen = async (doc: VaultDocumentInterface) => {
    setIsOpeningId(doc.id);
    try {
      const full = await getVaultDocumentData(doc.id);
      if (!full) return;

      if (!VIEW_DIR.exists) VIEW_DIR.create({ intermediates: true, idempotent: true });
      const file = new File(VIEW_DIR, full.file_name);
      if (file.exists) file.delete();
      file.write(full.data);

      if (full.mime_type.startsWith("image/") || full.mime_type === "application/pdf") {
        setViewing({ uri: file.uri, mimeType: full.mime_type });
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: full.mime_type });
      } else {
        Alert.alert("Can't open file", "No app is available on this device to open this file type.");
      }
    } finally {
      setIsOpeningId(null);
    }
  };

  const handleDelete = async () => {
    if (deletingId == null) return;
    await deleteDocument(deletingId);
    setDeletingId(null);
  };

  return (
    <View className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between px-6 pt-20 pb-6">
        <View>
          <Text className="text-[13px] font-medium text-slate-500">Overview</Text>
          <Text className="text-[30px] font-bold text-white mt-1 tracking-tight">
            Document Vault
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="rounded-full bg-teal-500 px-5 py-3 active:opacity-80"
        >
          <View className="flex-row items-center gap-1">
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-semibold text-[14px]">Add</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View className="px-6 mb-4">
        <View className="flex-row items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2.5">
          <Ionicons name="search" size={16} color="#64748b" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or note"
            placeholderTextColor="#64748b"
            className="flex-1 text-[13px] text-white"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="px-6 flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && filtered.length > 0 ? (
          <View className="gap-5">
            {groups.map((group) => (
              <View key={group.folder} className="gap-3">
                <View className="flex-row items-center gap-2 px-1">
                  <Ionicons name="folder" size={14} color="#2dd4bf" />
                  <Text className="text-[12px] font-bold text-teal-400 uppercase tracking-wider">
                    {group.folder}
                  </Text>
                  <Text className="text-[11px] text-slate-500">
                    {group.docs.length} {group.docs.length === 1 ? "document" : "documents"}
                  </Text>
                </View>
                {group.docs.map((doc) => (
                  <DocumentListItem
                    key={doc.id}
                    doc={doc}
                    isOpening={isOpeningId === doc.id}
                    onOpen={() => handleOpen(doc)}
                    onDelete={() => setDeletingId(doc.id)}
                  />
                ))}
              </View>
            ))}

            {ungrouped.length > 0 && (
              <View className="gap-3">
                {groups.length > 0 && (
                  <Text className="text-[12px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    Unfiled
                  </Text>
                )}
                {ungrouped.map((doc) => (
                  <DocumentListItem
                    key={doc.id}
                    doc={doc}
                    isOpening={isOpeningId === doc.id}
                    onOpen={() => handleOpen(doc)}
                    onDelete={() => setDeletingId(doc.id)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          !isLoading && (
            <View className="mt-20 items-center justify-center">
              <Ionicons name="lock-closed-outline" size={48} color="#64748b" />
              <Text className="mt-4 text-[16px] font-medium text-slate-400">
                {query ? "No matches" : "No documents yet"}
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                {query ? "" : "Add your IC, passport, or insurance policy to get started"}
              </Text>
            </View>
          )
        )}
      </ScrollView>

      <AddDocumentModal visible={modalVisible} onClose={() => setModalVisible(false)} />

      <ConfirmDeleteModal
        visible={deletingId != null}
        title="Delete this document?"
        description="This can't be undone."
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View className="flex-1 bg-black/95">
          <TouchableOpacity
            onPress={() => setViewing(null)}
            className="absolute top-14 right-6 z-10 p-2.5 rounded-full bg-white/10"
          >
            <Ionicons name="close" size={22} color="white" />
          </TouchableOpacity>
          {viewing?.mimeType === "application/pdf" ? (
            <View className="flex-1 pt-24">
              <WebView source={{ uri: viewing.uri }} style={{ flex: 1, backgroundColor: "transparent" }} />
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
            >
              {viewing && (
                <Image source={{ uri: viewing.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function DocumentListItem({
  doc,
  isOpening,
  onOpen,
  onDelete,
}: {
  doc: VaultDocumentInterface;
  isOpening: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const expiryDays = doc.expiry_date ? daysUntil(doc.expiry_date) : null;
  const isExpired = expiryDays !== null && expiryDays < 0;
  const isExpiringSoon = expiryDays !== null && expiryDays >= 0 && expiryDays <= 30;

  const expiryLabel = isExpired
    ? `Expired ${Math.abs(expiryDays!)}d ago`
    : isExpiringSoon
      ? expiryDays === 0
        ? "Expires today"
        : `Expires in ${expiryDays}d`
      : expiryDays !== null
        ? `Expires in ${expiryDays}d`
        : null;

  const expiryBg = isExpired ? "bg-red-500/20" : isExpiringSoon ? "bg-teal-500/20" : "bg-white/10";
  const expiryText = isExpired ? "text-red-300" : isExpiringSoon ? "text-teal-300" : "text-slate-300";

  return (
    <View className="bg-white/[0.035] border border-white/10 rounded-xl px-4 py-4">
      <TouchableOpacity
        onPress={onOpen}
        disabled={isOpening}
        className="flex-row items-center justify-between active:opacity-70"
      >
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-10 w-10 rounded-full bg-teal-500/15 items-center justify-center">
            <Ionicons
              name={doc.mime_type.startsWith("image/") ? "image" : "document-text"}
              size={18}
              color="#2dd4bf"
            />
          </View>
          <View className="flex-1">
            {(doc.folder || expiryLabel) && (
              <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                {doc.folder && (
                  <View className="rounded-full px-2.5 py-0.5 bg-white/10">
                    <Text className="text-[10px] font-bold text-slate-300">{doc.folder}</Text>
                  </View>
                )}
                {expiryLabel && (
                  <View className={`rounded-full px-2.5 py-0.5 ${expiryBg}`}>
                    <Text className={`text-[10px] font-bold ${expiryText}`}>{expiryLabel}</Text>
                  </View>
                )}
              </View>
            )}
            <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
              {doc.name}
            </Text>
            <Text className="text-[11px] text-slate-500 mt-0.5">{formatSize(doc.size_bytes)}</Text>
            {!!doc.note && (
              <Text className="text-[12px] text-slate-500 mt-1" numberOfLines={2}>
                {doc.note}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <View className="mt-3 pt-3 border-t border-white/10 flex-row justify-end">
        <TouchableOpacity onPress={onDelete} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 items-center justify-center">
          <Ionicons name="trash-outline" size={16} color="#f87171" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
