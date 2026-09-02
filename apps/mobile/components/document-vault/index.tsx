import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { VaultDocumentInterface } from "@/interface/document-vault";
import { useDeleteVaultDocument, useGetVaultDocuments, getVaultDocumentData } from "@/services/vault";
import { Ionicons } from "@expo/vector-icons";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AddDocumentModal } from "./add-document-modal";
import { EditDocumentModal } from "./edit-document-modal";
import { DocumentPreviewModal } from "./preview-modal";

// Scratch space for a document's bytes while it's open for previewing/
// downloading — overwritten on every open, never relied on to persist.
const VIEW_DIR = new Directory(Paths.cache, "vault-document-view");

const PREVIEWABLE_MIME_TYPES = new Set(["application/pdf", "text/html", "application/xhtml+xml"]);
const isPreviewable = (mimeType: string) =>
  mimeType.startsWith("image/") || PREVIEWABLE_MIME_TYPES.has(mimeType);

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
  const [editingDoc, setEditingDoc] = useState<VaultDocumentInterface | null>(null);
  const [viewing, setViewing] = useState<{ uri: string; mimeType: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

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

  const writeToScratchFile = async (doc: VaultDocumentInterface) => {
    const full = await getVaultDocumentData(doc.id);
    if (!full) return null;

    if (!VIEW_DIR.exists) VIEW_DIR.create({ intermediates: true, idempotent: true });
    const file = new File(VIEW_DIR, full.file_name);
    if (file.exists) file.delete();
    file.write(full.data);
    return { file, mimeType: full.mime_type };
  };

  const handlePreview = async (doc: VaultDocumentInterface) => {
    setBusyId(doc.id);
    try {
      const written = await writeToScratchFile(doc);
      if (!written) return;

      if (isPreviewable(written.mimeType)) {
        setViewing({ uri: written.file.uri, mimeType: written.mimeType });
      } else {
        Alert.alert(
          "No in-app preview",
          "This file type can't be previewed in the app — use Download instead.",
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (doc: VaultDocumentInterface) => {
    setBusyId(doc.id);
    try {
      const written = await writeToScratchFile(doc);
      if (!written) return;

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(written.file.uri, { mimeType: written.mimeType });
      } else {
        Alert.alert("Can't save file", "No app is available on this device to save this file.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (deletingId == null) return;
    await deleteDocument(deletingId);
    setDeletingId(null);
  };

  const toggleFolder = (folder: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const allFoldersCollapsed = groups.length > 0 && groups.every((g) => collapsedFolders.has(g.folder));
  const toggleAllFolders = () => {
    setCollapsedFolders(allFoldersCollapsed ? new Set() : new Set(groups.map((g) => g.folder)));
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
        keyboardShouldPersistTaps="handled"
      >
        {!isLoading && filtered.length > 0 ? (
          <View className="gap-5">
            {groups.length > 0 && (
              <TouchableOpacity
                onPress={toggleAllFolders}
                className="self-end flex-row items-center gap-1.5 px-1 -mb-2"
                hitSlop={8}
              >
                <Ionicons
                  name={allFoldersCollapsed ? "chevron-expand-outline" : "chevron-collapse-outline"}
                  size={13}
                  color="#2dd4bf"
                />
                <Text className="text-[11px] font-semibold text-teal-400">
                  {allFoldersCollapsed ? "Expand all" : "Collapse all"}
                </Text>
              </TouchableOpacity>
            )}

            {groups.map((group) => {
              const isCollapsed = collapsedFolders.has(group.folder);
              return (
                <View key={group.folder} className="gap-3">
                  <TouchableOpacity
                    onPress={() => toggleFolder(group.folder)}
                    className="flex-row items-center gap-2 px-1"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isCollapsed ? "chevron-forward" : "chevron-down"}
                      size={14}
                      color="#64748b"
                    />
                    <Ionicons name="folder" size={14} color="#2dd4bf" />
                    <Text className="text-[12px] font-bold text-teal-400 uppercase tracking-wider">
                      {group.folder}
                    </Text>
                    <Text className="text-[11px] text-slate-500">
                      {group.docs.length} {group.docs.length === 1 ? "document" : "documents"}
                    </Text>
                  </TouchableOpacity>
                  {!isCollapsed &&
                    group.docs.map((doc) => (
                      <DocumentListItem
                        key={doc.id}
                        doc={doc}
                        isBusy={busyId === doc.id}
                        onPreview={() => handlePreview(doc)}
                        onDownload={() => handleDownload(doc)}
                        onEdit={() => setEditingDoc(doc)}
                        onDelete={() => setDeletingId(doc.id)}
                      />
                    ))}
                </View>
              );
            })}

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
                    isBusy={busyId === doc.id}
                    onPreview={() => handlePreview(doc)}
                    onDownload={() => handleDownload(doc)}
                    onEdit={() => setEditingDoc(doc)}
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

      <EditDocumentModal doc={editingDoc} onClose={() => setEditingDoc(null)} />

      <ConfirmDeleteModal
        visible={deletingId != null}
        title="Delete this document?"
        description="This can't be undone."
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      <DocumentPreviewModal
        visible={!!viewing}
        uri={viewing?.uri ?? null}
        mimeType={viewing?.mimeType ?? null}
        onClose={() => setViewing(null)}
      />
    </View>
  );
}

function DocumentListItem({
  doc,
  isBusy,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
}: {
  doc: VaultDocumentInterface;
  isBusy: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onEdit: () => void;
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
      <View className="flex-row items-start gap-2">
        <TouchableOpacity
          onPress={onPreview}
          disabled={isBusy}
          className="flex-1 flex-row items-center gap-3 active:opacity-70"
        >
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
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onEdit}
          disabled={isBusy}
          hitSlop={8}
          className="p-1.5 -mt-1 -mr-1"
        >
          <Ionicons name="pencil-outline" size={16} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <View className="mt-3 pt-3 border-t border-white/10 flex-row gap-2">
        <TouchableOpacity
          onPress={onPreview}
          disabled={isBusy}
          className="flex-1 bg-teal-500/15 border border-teal-500/40 rounded-lg py-2.5 flex-row items-center justify-center gap-1.5"
        >
          <Ionicons name="eye-outline" size={15} color="#2dd4bf" />
          <Text className="text-center font-semibold text-teal-400 text-[12px]">Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDownload}
          disabled={isBusy}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2.5 flex-row items-center justify-center gap-1.5"
        >
          <Ionicons name="download-outline" size={15} color="#cbd5e1" />
          <Text className="text-center font-semibold text-slate-200 text-[12px]">Download</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          disabled={isBusy}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={16} color="#f87171" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
