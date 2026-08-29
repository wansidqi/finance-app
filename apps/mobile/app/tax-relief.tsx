import { TAX_RELIEF_CATEGORY_LABELS, TaxReliefCategoryKey } from "@/interface/tax-relief";
import { shouldRunScheduledCheck } from "@/local/lhdn-relief-sync-service";
import {
  useApplyLhdnSyncDiffs,
  useDismissLhdnSyncDiffs,
  useGetReliefSummary,
  useGetReliefTransactions,
  useLhdnSyncState,
  useRunLhdnSync,
  useUpdateCap,
} from "@/services/tax-relief";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

const EXPORT_DIR = new Directory(Paths.cache, "tax-relief-export");

function formatRM(value: number) {
  return `RM${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function TaxReliefScreen() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [editingCategory, setEditingCategory] = useState<TaxReliefCategoryKey | null>(null);
  const [capInput, setCapInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: summary = [], isLoading } = useGetReliefSummary(year);
  const { mutateAsync: updateCap, isPending: isSavingCap } = useUpdateCap(year);
  // Only fetched lazily on export — no need to hold every transaction detail
  // in memory just to render the category summary list above.
  const { refetch: fetchTransactions } = useGetReliefTransactions(year);

  const { data: syncState } = useLhdnSyncState();
  const { mutateAsync: runLhdnSync, isPending: isSyncing } = useRunLhdnSync(year);
  const { mutateAsync: applyLhdnDiffs, isPending: isApplyingDiffs } = useApplyLhdnSyncDiffs(year);
  const { mutateAsync: dismissLhdnDiffs } = useDismissLhdnSyncDiffs();
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedDiffs, setSelectedDiffs] = useState<Set<TaxReliefCategoryKey>>(new Set());
  // Fires at most once per mount — the scheduled quarterly check, run silently
  // in the background. Failures just sit in syncState.lastError for the
  // manual "Check now" path to retry; they never interrupt this screen.
  const ranScheduledCheck = useRef(false);

  useEffect(() => {
    if (ranScheduledCheck.current) return;
    ranScheduledCheck.current = true;
    shouldRunScheduledCheck().then((due) => {
      if (due) runLhdnSync().catch(() => {});
    });
  }, [runLhdnSync]);

  const pendingDiffs = syncState?.pendingDiffs ?? [];
  const unmatched = syncState?.unmatched ?? [];
  const lastError = syncState?.lastError ?? null;

  const openSyncModal = () => {
    setSelectedDiffs(new Set(pendingDiffs.map((d) => d.category_key)));
    setShowSyncModal(true);
  };

  const toggleDiffSelected = (key: TaxReliefCategoryKey) => {
    setSelectedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleApplySelectedDiffs = async () => {
    await applyLhdnDiffs(Array.from(selectedDiffs));
    setShowSyncModal(false);
  };

  const handleDismissDiffs = async () => {
    await dismissLhdnDiffs();
    setShowSyncModal(false);
  };

  const totalClaimed = summary.reduce((sum, s) => sum + s.claimed, 0);
  const totalCap = summary.reduce((sum, s) => sum + s.cap, 0);

  const openEditCap = (categoryKey: TaxReliefCategoryKey, currentCap: number) => {
    setEditingCategory(categoryKey);
    setCapInput(String(currentCap));
  };

  const handleSaveCap = async () => {
    if (!editingCategory) return;
    const amount = Number(capInput);
    if (!amount || amount <= 0) return;
    await updateCap({ categoryKey: editingCategory, capAmount: amount });
    setEditingCategory(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: transactions = [] } = await fetchTransactions();

      const lines: string[] = [];
      lines.push(`Tax Relief Evidence — YA${year}`);
      lines.push("");
      lines.push("Category,Claimed,Cap,Remaining");
      for (const s of summary) {
        lines.push([csvEscape(s.label), s.claimed, s.cap, s.remaining].join(","));
      }
      lines.push("");
      lines.push("Category,Date,Description,Amount,Receipts Attached");
      for (const t of transactions) {
        lines.push(
          [
            csvEscape(t.category_label),
            new Date(t.occurred_at).toLocaleDateString("en-MY"),
            csvEscape(t.description ?? t.note ?? ""),
            t.amount,
            t.receipt_count,
          ].join(","),
        );
      }

      if (!EXPORT_DIR.exists) EXPORT_DIR.create({ intermediates: true, idempotent: true });
      const file = new File(EXPORT_DIR, `TaxRelief-YA${year}.csv`);
      if (file.exists) file.delete();
      file.write(lines.join("\n"));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: "text/csv" });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between px-3 py-12">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-[18px] font-bold text-white flex-1 ml-2">Tax Relief</Text>
      </View>

      <View className="flex-row items-center justify-center gap-6 mb-4">
        <TouchableOpacity onPress={() => setYear((y) => y - 1)} className="p-2 rounded-full bg-white/5">
          <Ionicons name="chevron-back" size={18} color="#cbd5e1" />
        </TouchableOpacity>
        <Text className="text-[16px] font-bold text-white">YA{year}</Text>
        <TouchableOpacity onPress={() => setYear((y) => y + 1)} className="p-2 rounded-full bg-white/5">
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="rounded-3xl overflow-hidden border border-white/10 bg-slate-900 px-6 py-6 mb-6">
          <Text className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            Total Claimed
          </Text>
          <Text className="text-[26px] font-black text-sky-400">{formatRM(totalClaimed)}</Text>
          <Text className="text-[12px] text-slate-500 mt-1">of {formatRM(totalCap)} across all categories</Text>
        </View>

        <TouchableOpacity
          onPress={handleExport}
          disabled={isExporting}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 py-3 mb-4 active:opacity-70"
        >
          <Ionicons name="share-outline" size={16} color="#38bdf8" />
          <Text className="text-[13px] font-semibold text-sky-400">
            {isExporting ? "Preparing export..." : "Export Evidence (CSV)"}
          </Text>
        </TouchableOpacity>

        {lastError ? (
          <TouchableOpacity
            onPress={() => runLhdnSync()}
            disabled={isSyncing}
            className="flex-row items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-3 active:opacity-70"
          >
            <Ionicons name="cloud-offline-outline" size={18} color="#f87171" />
            <Text className="flex-1 text-[12px] font-semibold text-red-300">
              Couldn&apos;t check LHDN ({lastError}) — tap to retry
            </Text>
          </TouchableOpacity>
        ) : pendingDiffs.length > 0 ? (
          <TouchableOpacity
            onPress={openSyncModal}
            className="flex-row items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-3 active:opacity-70"
          >
            <Ionicons name="alert-circle-outline" size={18} color="#fbbf24" />
            <Text className="flex-1 text-[12px] font-semibold text-amber-300">
              LHDN may have updated {pendingDiffs.length}{" "}
              {pendingDiffs.length === 1 ? "relief category" : "relief categories"} — tap to review
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#fbbf24" />
          </TouchableOpacity>
        ) : unmatched.length > 0 ? (
          <TouchableOpacity
            onPress={openSyncModal}
            className="flex-row items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/40 px-4 py-3 mb-3 active:opacity-70"
          >
            <Ionicons name="help-circle-outline" size={18} color="#94a3b8" />
            <Text className="flex-1 text-[12px] font-semibold text-slate-300">
              Couldn&apos;t verify {unmatched.length} relief {unmatched.length === 1 ? "category" : "categories"} on
              LHDN&apos;s page — tap to review
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={() => runLhdnSync()}
          disabled={isSyncing}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/30 py-2.5 mb-6 active:opacity-70"
        >
          <Ionicons name="cloud-download-outline" size={14} color="#94a3b8" />
          <Text className="text-[11px] font-semibold text-slate-400">
            {isSyncing
              ? "Checking hasil.gov.my..."
              : syncState?.lastCheckedAt
                ? `Last checked LHDN ${new Date(syncState.lastCheckedAt).toLocaleDateString("en-MY")} · Check now`
                : "Check LHDN for relief updates"}
          </Text>
        </TouchableOpacity>

        {!isLoading && (
          <View className="gap-3">
            {summary.map((s) => (
              <TouchableOpacity
                key={s.category_key}
                onPress={() => openEditCap(s.category_key, s.cap)}
                className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 active:opacity-80"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[13px] font-semibold text-white flex-1 pr-2">{s.label}</Text>
                  {s.over_cap && (
                    <View className="bg-red-500/20 rounded-full px-2.5 py-1">
                      <Text className="text-[10px] font-bold text-red-400 uppercase">Over Cap</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[11px] text-slate-500">
                    {formatRM(s.claimed)} / {formatRM(s.cap)}
                  </Text>
                  <Text className="text-[11px] font-semibold text-slate-400">
                    {formatRM(s.remaining)} left
                  </Text>
                </View>
                <View className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <View
                    className={`h-full rounded-full ${s.over_cap ? "bg-red-500" : "bg-sky-500"}`}
                    style={{ width: `${Math.min((s.claimed / s.cap) * 100, 100)}%` }}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={editingCategory != null} transparent animationType="fade" onRequestClose={() => setEditingCategory(null)}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-6">
            <Text className="text-white text-[15px] font-bold mb-1">Edit Cap</Text>
            <Text className="text-slate-400 text-[11px] mb-4">
              LHDN revises relief caps yearly — adjust this if YA{year}&apos;s published amount differs.
            </Text>
            <TextInput
              keyboardType="decimal-pad"
              value={capInput}
              onChangeText={setCapInput}
              placeholderTextColor="#64748b"
              className="rounded-lg border border-slate-600 px-3 py-3 text-[13px] text-white bg-slate-700/30 mb-4"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setEditingCategory(null)}
                className="flex-1 bg-slate-600/40 rounded-lg py-3"
              >
                <Text className="text-center text-slate-200 font-semibold text-[13px]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveCap}
                disabled={isSavingCap}
                className="flex-1 bg-sky-500 rounded-lg py-3"
              >
                <Text className="text-center text-white font-semibold text-[13px]">
                  {isSavingCap ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSyncModal} transparent animationType="fade" onRequestClose={() => setShowSyncModal(false)}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-6">
            <Text className="text-white text-[15px] font-bold mb-1">LHDN Relief Check</Text>
            <Text className="text-slate-400 text-[11px] mb-4">
              Scraped from hasil.gov.my — review each before applying. This changes YA{year}&apos;s caps.
            </Text>
            <ScrollView style={{ maxHeight: 320 }} className="mb-4">
              {pendingDiffs.length > 0 && (
                <View className="gap-2 mb-4">
                  {pendingDiffs.map((d) => {
                    const selected = selectedDiffs.has(d.category_key);
                    return (
                      <TouchableOpacity
                        key={d.category_key}
                        onPress={() => toggleDiffSelected(d.category_key)}
                        className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
                          selected ? "border-sky-500 bg-sky-500/10" : "border-slate-600 bg-slate-700/30"
                        }`}
                      >
                        <Ionicons
                          name={selected ? "checkbox" : "square-outline"}
                          size={18}
                          color={selected ? "#38bdf8" : "#64748b"}
                        />
                        <View className="flex-1">
                          <Text className="text-[12px] font-semibold text-white">
                            {TAX_RELIEF_CATEGORY_LABELS[d.category_key]}
                          </Text>
                          <Text className="text-[11px] text-slate-400 mt-0.5">
                            {formatRM(d.current_cap)} → {formatRM(d.scraped_amount)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {unmatched.length > 0 && (
                <View>
                  <Text className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Couldn&apos;t verify on LHDN&apos;s page
                  </Text>
                  <View className="gap-1.5">
                    {unmatched.map((key) => (
                      <Text key={key} className="text-[11px] text-slate-500">
                        • {TAX_RELIEF_CATEGORY_LABELS[key]}
                      </Text>
                    ))}
                  </View>
                  <Text className="text-[10px] text-slate-600 mt-2">
                    LHDN&apos;s page wording may have changed for these — caps above weren&apos;t touched.
                  </Text>
                </View>
              )}
            </ScrollView>
            {pendingDiffs.length > 0 ? (
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={handleDismissDiffs} className="flex-1 bg-slate-600/40 rounded-lg py-3">
                  <Text className="text-center text-slate-200 font-semibold text-[13px]">Dismiss All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApplySelectedDiffs}
                  disabled={isApplyingDiffs || selectedDiffs.size === 0}
                  className="flex-1 bg-sky-500 rounded-lg py-3"
                >
                  <Text className="text-center text-white font-semibold text-[13px]">
                    {isApplyingDiffs ? "Applying..." : `Apply (${selectedDiffs.size})`}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setShowSyncModal(false)} className="bg-slate-600/40 rounded-lg py-3">
                <Text className="text-center text-slate-200 font-semibold text-[13px]">Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
