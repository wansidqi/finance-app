import { AlertBanner } from "@/components/ui/alert-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TextField } from "@/components/ui/text-field";
import { SCREEN_SCROLL_BOTTOM_PADDING } from "@/constants/layout";
import { useFormatRM } from "@/hooks/use-format-rm";
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
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

const EXPORT_DIR = new Directory(Paths.cache, "tax-relief-export");

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function TaxReliefScreen() {
  const router = useRouter();
  const { formatRM, hideAmounts, setHideAmounts } = useFormatRM();
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
    <View className="flex-1 bg-canvas">
      <ScreenHeader
        variant="back"
        title="Tax Relief"
        onBack={() => router.back()}
        right={
          <IconButton
            onPress={() => setHideAmounts(!hideAmounts)}
            icon={hideAmounts ? "eye-off-outline" : "eye-outline"}
            label={hideAmounts ? "Show amounts" : "Hide amounts"}
          />
        }
      />

      <View className="flex-row items-center justify-center gap-6 mb-4">
        <IconButton onPress={() => setYear((y) => y - 1)} icon="chevron-back" label="Previous assessment year" size={18} />
        <Text className="font-display text-[16px] text-white">YA{year}</Text>
        <IconButton onPress={() => setYear((y) => y + 1)} icon="chevron-forward" label="Next assessment year" size={18} />
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: SCREEN_SCROLL_BOTTOM_PADDING }} showsVerticalScrollIndicator={false}>
        <Card className="mb-6">
          <Text className="font-mono text-[11px] uppercase tracking-wider text-fog mb-1.5">
            Total Claimed
          </Text>
          <Text className="font-display text-[26px] text-white">
            {formatRM(totalClaimed, { decimals: true })}
          </Text>
          <Text className="font-sans text-[12px] text-fog mt-1">
            of {formatRM(totalCap, { decimals: true })} across all categories
          </Text>
        </Card>

        <TouchableOpacity
          onPress={handleExport}
          disabled={isExporting}
          className="flex-row items-center justify-center gap-2 rounded-card border border-glass-edge bg-glass-surface py-3 mb-4 active:opacity-70"
        >
          <Ionicons name="share-outline" size={16} color="#d1e4fa" />
          <Text className="font-sans text-[13px] font-semibold text-frost">
            {isExporting ? "Preparing export..." : "Export Evidence (CSV)"}
          </Text>
        </TouchableOpacity>

        {lastError ? (
          <AlertBanner
            onPress={() => runLhdnSync()}
            disabled={isSyncing}
            icon="alert-circle-outline"
            message={`Couldn't check LHDN (${lastError}) — tap to retry`}
          />
        ) : pendingDiffs.length > 0 ? (
          <AlertBanner
            onPress={openSyncModal}
            icon="time-outline"
            showChevron
            message={`LHDN may have updated ${pendingDiffs.length} ${
              pendingDiffs.length === 1 ? "relief category" : "relief categories"
            } — tap to review`}
          />
        ) : unmatched.length > 0 ? (
          <AlertBanner
            onPress={openSyncModal}
            icon="help-circle-outline"
            showChevron
            message={`Couldn't verify ${unmatched.length} relief ${
              unmatched.length === 1 ? "category" : "categories"
            } on LHDN's page — tap to review`}
          />
        ) : null}

        <TouchableOpacity
          onPress={() => runLhdnSync()}
          disabled={isSyncing}
          className="flex-row items-center justify-center gap-2 rounded-card border border-white/[0.06] bg-white/5 py-2.5 mb-6 active:opacity-70"
        >
          <Ionicons name="cloud-download-outline" size={14} color="#9da7ba" />
          <Text className="font-sans text-[11px] font-semibold text-fog">
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
                className="rounded-card border border-glass-edge bg-glass-surface px-5 py-4 active:opacity-80"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-sans text-[13px] font-semibold text-white flex-1 pr-2">{s.label}</Text>
                  {s.over_cap && <Badge label="Over Cap" icon="warning-outline" emphasis />}
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-sans text-[11px] text-fog">
                    {formatRM(s.claimed, { decimals: true })} /{" "}
                    {formatRM(s.cap, { decimals: true })}
                  </Text>
                  <Text className="font-sans text-[11px] font-semibold text-mist">
                    {formatRM(s.remaining, { decimals: true })} left
                  </Text>
                </View>
                <View className="h-1.5 rounded-full bg-luminous-fill overflow-hidden">
                  <View
                    className="h-full rounded-full bg-frost"
                    style={{ width: `${Math.min((s.claimed / s.cap) * 100, 100)}%` }}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Dialog
        visible={editingCategory != null}
        onRequestClose={() => setEditingCategory(null)}
        icon="pencil-outline"
        title="Edit Cap"
        description={`LHDN revises relief caps yearly — adjust this if YA${year}'s published amount differs.`}
        actions={[
          { label: "Cancel", onPress: () => setEditingCategory(null), variant: "outline", disabled: isSavingCap },
          { label: isSavingCap ? "Saving..." : "Save", onPress: handleSaveCap, variant: "primary", loading: isSavingCap },
        ]}
      >
        <TextField
          keyboardType="decimal-pad"
          value={capInput}
          onChangeText={setCapInput}
        />
      </Dialog>

      <Modal visible={showSyncModal} transparent animationType="fade" onRequestClose={() => setShowSyncModal(false)}>
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="w-full rounded-card bg-modal-surface border border-glass-edge shadow-modal p-6">
            <Text className="font-display text-[16px] text-white mb-1">LHDN Relief Check</Text>
            <Text className="font-sans text-[11px] text-fog mb-4">
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
                        className={`flex-row items-center gap-3 rounded-card border px-4 py-3 ${
                          selected ? "border-glass-edge bg-luminous-fill" : "border-white/[0.06] bg-white/5"
                        }`}
                      >
                        <Ionicons
                          name={selected ? "checkbox" : "square-outline"}
                          size={18}
                          color={selected ? "#d1e4fa" : "#9da7ba"}
                        />
                        <View className="flex-1">
                          <Text className="font-sans text-[12px] font-semibold text-white">
                            {TAX_RELIEF_CATEGORY_LABELS[d.category_key]}
                          </Text>
                          <Text className="font-sans text-[11px] text-fog mt-0.5">
                            {formatRM(d.current_cap, { decimals: true })} →{" "}
                            {formatRM(d.scraped_amount, { decimals: true })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {unmatched.length > 0 && (
                <View>
                  <Text className="font-mono text-[11px] uppercase tracking-wider text-fog mb-2">
                    Couldn&apos;t verify on LHDN&apos;s page
                  </Text>
                  <View className="gap-1.5">
                    {unmatched.map((key) => (
                      <Text key={key} className="font-sans text-[11px] text-fog">
                        • {TAX_RELIEF_CATEGORY_LABELS[key]}
                      </Text>
                    ))}
                  </View>
                  <Text className="font-sans text-[10px] text-fog/70 mt-2">
                    LHDN&apos;s page wording may have changed for these — caps above weren&apos;t touched.
                  </Text>
                </View>
              )}
            </ScrollView>
            {pendingDiffs.length > 0 ? (
              <View className="flex-row gap-3">
                <Button label="Dismiss All" variant="outline" className="flex-1" onPress={handleDismissDiffs} />
                <Button
                  label={isApplyingDiffs ? "Applying..." : `Apply (${selectedDiffs.size})`}
                  variant="primary"
                  className="flex-1"
                  disabled={isApplyingDiffs || selectedDiffs.size === 0}
                  loading={isApplyingDiffs}
                  onPress={handleApplySelectedDiffs}
                />
              </View>
            ) : (
              <Button label="Close" variant="outline" onPress={() => setShowSyncModal(false)} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
