import { AddAssetModal } from "@/components/asset/add-asset";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { useFormatRM } from "@/hooks/use-format-rm";
import { AssetCategory, AssetInterface } from "@/interface/asset";
import {
  useCreateAsset,
  useGetAssets,
  useUpdateAsset,
} from "@/services/asset";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AssetSkeletonLoader } from "./skeleton-loader";

type PlatformGroup = {
  platform: string;
  entries: AssetInterface[];
  walletTotal: number;
  zakatableTotal: number;
  profitPercent: number | null;
};

type DisplayItem =
  | { type: "group"; total: number; group: PlatformGroup }
  | { type: "single"; total: number; asset: AssetInterface };

type CategorySection = {
  category: AssetCategory;
  total: number;
  zakatableTotal: number;
  items: DisplayItem[];
};

const CATEGORY_ICON: Record<AssetCategory, keyof typeof Ionicons.glyphMap> = {
  CASH: "cash",
  GOLD: "diamond",
  CRYPTO: "logo-bitcoin",
  STOCK: "trending-up",
};

const CATEGORY_DIST_ORDER: AssetCategory[] = ["CASH", "GOLD", "CRYPTO", "STOCK"];
const CATEGORY_DIST_META: Record<AssetCategory, { label: string; color: string }> = {
  CASH: { label: "Cash & Savings", color: "#34d399" },
  GOLD: { label: "Gold", color: "#fbbf24" },
  CRYPTO: { label: "Crypto", color: "#a78bfa" },
  STOCK: { label: "Stock", color: "#38bdf8" },
};

// Groups a set of assets (already scoped to one category) into platform
// groups (e.g. "TNG eWallet") and standalone cards for assets with no
// shared platform, sorted biggest total first.
function groupByPlatform(assets: AssetInterface[]): DisplayItem[] {
  const platformMap = new Map<string, AssetInterface[]>();
  const standalone: AssetInterface[] = [];

  for (const asset of assets) {
    const platform = asset.platform?.trim();
    if (platform) {
      if (!platformMap.has(platform)) platformMap.set(platform, []);
      platformMap.get(platform)!.push(asset);
    } else {
      standalone.push(asset);
    }
  }

  const groupItems: DisplayItem[] = Array.from(platformMap.entries()).map(
    ([platform, rawEntries]) => {
      // The platform's balance entry (platform_total set) always renders
      // first, since it's the figure people scan for before the breakdown.
      const entries = [...rawEntries].sort(
        (a, b) => Number(b.platform_total !== null) - Number(a.platform_total !== null),
      );
      const walletTotal = entries.reduce((sum, a) => sum + (a.price ?? 0), 0);
      const zakatableTotal = entries.reduce(
        (sum, a) => sum + (a.is_calculate ? (a.price ?? 0) : 0),
        0,
      );

      // Aggregate profit across entries that actually track a cost basis
      // (cash earmarks usually don't), instead of per-entry, since a
      // multi-entry platform's growth is a wallet-level story.
      let costBasisSum = 0;
      let priceForCostBasisSum = 0;
      for (const a of entries) {
        if (a.cost_basis && a.cost_basis > 0) {
          costBasisSum += a.cost_basis;
          priceForCostBasisSum += a.price ?? 0;
        }
      }
      const profitPercent =
        costBasisSum > 0
          ? ((priceForCostBasisSum - costBasisSum) / costBasisSum) * 100
          : null;

      return {
        type: "group",
        total: walletTotal,
        group: { platform, entries, walletTotal, zakatableTotal, profitPercent },
      };
    },
  );

  const singleItems: DisplayItem[] = standalone.map((asset) => ({
    type: "single",
    total: asset.price ?? 0,
    asset,
  }));

  return [...groupItems, ...singleItems].sort((a, b) => b.total - a.total);
}

export function Asset() {
  const { formatRM, hideAmounts, setHideAmounts } = useFormatRM();
  const { data: assets, isLoading } = useGetAssets();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPlatform, setModalPlatform] = useState<string | undefined>();
  const [modalLinkId, setModalLinkId] = useState<number | undefined>();
  const [balanceGroup, setBalanceGroup] = useState<PlatformGroup | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<AssetCategory>>(
    new Set(),
  );
  const router = useRouter();
  const { mutate: updateAsset } = useUpdateAsset();

  const openAddModal = (platform?: string, linkId?: number) => {
    setModalPlatform(platform);
    setModalLinkId(linkId);
    setModalVisible(true);
  };

  const sections = useMemo<CategorySection[]>(() => {
    if (!assets) return [];

    const categoryMap = new Map<AssetCategory, AssetInterface[]>();
    for (const asset of assets) {
      if (!categoryMap.has(asset.category)) categoryMap.set(asset.category, []);
      categoryMap.get(asset.category)!.push(asset);
    }

    const result: CategorySection[] = Array.from(categoryMap.entries()).map(
      ([category, categoryAssets]) => {
        const total = categoryAssets.reduce(
          (sum, a) => sum + (a.price ?? 0),
          0,
        );
        const zakatableTotal = categoryAssets.reduce(
          (sum, a) => sum + (a.is_calculate ? (a.price ?? 0) : 0),
          0,
        );
        return {
          category,
          total,
          zakatableTotal,
          items: groupByPlatform(categoryAssets),
        };
      },
    );

    return result.sort((a, b) => b.total - a.total);
  }, [assets]);

  const totalZakatable = sections.reduce((sum, s) => sum + s.zakatableTotal, 0);
  const totalExcluded = sections.reduce((sum, s) => sum + (s.total - s.zakatableTotal), 0);

  const categoryZakatableTotals = useMemo(() => {
    const totals: Record<AssetCategory, number> = { CASH: 0, GOLD: 0, CRYPTO: 0, STOCK: 0 };
    for (const s of sections) totals[s.category] = s.zakatableTotal;
    return totals;
  }, [sections]);

  const categoryEntryCounts = useMemo(() => {
    const counts: Record<AssetCategory, number> = { CASH: 0, GOLD: 0, CRYPTO: 0, STOCK: 0 };
    for (const a of assets ?? []) counts[a.category] = (counts[a.category] ?? 0) + 1;
    return counts;
  }, [assets]);

  const toggleCalculate = (asset: AssetInterface) => {
    updateAsset({ id: asset.id, is_calculate: !asset.is_calculate });
  };

  const toggleCategory = (category: AssetCategory) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const allCategoriesCollapsed =
    sections.length > 0 && sections.every((s) => collapsedCategories.has(s.category));
  const toggleAllCategories = () => {
    setCollapsedCategories(
      allCategoriesCollapsed ? new Set() : new Set(sections.map((s) => s.category)),
    );
  };

  const goToDetail = (assetId: number) =>
    router.push({
      pathname: "/asset/[id]",
      params: { id: String(assetId) },
    });

  return (
    <View className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between px-6 pt-20 pb-6">
        <View>
          <Text className="text-[13px] font-medium text-slate-500">
            Overview
          </Text>
          <Text className="text-[30px] font-bold text-white mt-1 tracking-tight">
            My Assets
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => setHideAmounts(!hideAmounts)}
            className="p-2 rounded-full bg-white/5 active:opacity-70"
          >
            <Ionicons
              name={hideAmounts ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#cbd5e1"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openAddModal()}
            className="rounded-full bg-emerald-500 px-5 py-3 active:opacity-80"
          >
            <View className="flex-row items-center gap-1">
              <Ionicons name="add" size={20} color="#022c22" />
              <Text className="text-emerald-950 font-semibold text-[14px]">
                Add
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View className="flex-1 bg-slate-950">
        <ScrollView
          className="px-6 flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <AssetSkeletonLoader />
          ) : sections.length > 0 ? (
            <>
              <View className="mb-6 rounded-[28px] bg-white/[0.035] border border-white/10 px-6 pt-7 pb-6 overflow-hidden">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-[1.5px]">
                    Total Assets
                  </Text>
                  <View className="h-8 w-8 rounded-full bg-emerald-500/15 items-center justify-center">
                    <Ionicons name="wallet" size={15} color="#34d399" />
                  </View>
                </View>
                <Text className="text-[36px] font-extrabold text-white tracking-tight">
                  {formatRM(totalZakatable, { decimals: true })}
                </Text>
                {totalExcluded > 0 && (
                  <Text className="text-[11px] text-slate-500 mt-1">
                    +{formatRM(totalExcluded, { decimals: true })} excluded
                  </Text>
                )}

                <View className="h-px bg-white/8 mt-6 mb-5" />

                {/* Asset Distribution — moved here from the Dashboard */}
                <View>
                  <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-[1.5px] mb-4">
                    Asset Distribution
                  </Text>
                  <View className="flex-row h-2 rounded-full overflow-hidden bg-white/8">
                    {CATEGORY_DIST_ORDER.map((category, index) => {
                      const percent =
                        totalZakatable > 0
                          ? (categoryZakatableTotals[category] / totalZakatable) * 100
                          : 0;
                      if (percent <= 0) return null;
                      return (
                        <View
                          key={category}
                          style={{
                            width: `${percent}%`,
                            backgroundColor: CATEGORY_DIST_META[category].color,
                            marginRight: index < CATEGORY_DIST_ORDER.length - 1 ? 2 : 0,
                          }}
                        />
                      );
                    })}
                  </View>

                  <View className="flex-row flex-wrap mt-5">
                    {CATEGORY_DIST_ORDER.map((category) => {
                      const meta = CATEGORY_DIST_META[category];
                      const value = categoryZakatableTotals[category];
                      const percent =
                        totalZakatable > 0 ? (value / totalZakatable) * 100 : 0;
                      return (
                        <View key={category} style={{ width: "50%" }} className="pr-2 mb-4">
                          <View className="flex-row items-center gap-2 mb-1">
                            <View
                              style={{ backgroundColor: meta.color }}
                              className="h-2 w-2 rounded-full"
                            />
                            <Text className="text-[11px] text-slate-400">
                              {meta.label} ({categoryEntryCounts[category]})
                            </Text>
                          </View>
                          <Text className="text-[14px] font-bold text-white">
                            {formatRM(value, { decimals: true })}
                          </Text>
                          <Text className="text-[10px] text-slate-500 mt-0.5">
                            {percent.toFixed(1)}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              <Section title="Holdings">
                <View className="gap-4">
                  {sections.length > 1 && (
                    <TouchableOpacity
                      onPress={toggleAllCategories}
                      className="self-end flex-row items-center gap-1.5 px-1 -mb-2"
                      hitSlop={8}
                    >
                      <Ionicons
                        name={
                          allCategoriesCollapsed
                            ? "chevron-expand-outline"
                            : "chevron-collapse-outline"
                        }
                        size={13}
                        color="#34d399"
                      />
                      <Text className="text-[11px] font-semibold text-emerald-400">
                        {allCategoriesCollapsed ? "Expand all" : "Collapse all"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {sections.map((section) => {
                    const categoryColor = CATEGORY_DIST_META[section.category].color;
                    const isCollapsed = collapsedCategories.has(section.category);
                    return (
                      <View key={section.category} className="gap-2.5">
                        <CategorySectionHeader
                          section={section}
                          isCollapsed={isCollapsed}
                          onToggle={() => toggleCategory(section.category)}
                        />
                        {!isCollapsed && (
                          <View className="gap-3">
                            {section.items.map((item) =>
                              item.type === "group" ? (
                                <PlatformGroupCard
                                  key={`group-${item.group.platform}`}
                                  group={item.group}
                                  color={categoryColor}
                                  onToggle={toggleCalculate}
                                  onPressEntry={goToDetail}
                                  onAdd={() => openAddModal(item.group.platform)}
                                  onUpdateBalance={
                                    item.group.entries.length > 1
                                      ? () => setBalanceGroup(item.group)
                                      : undefined
                                  }
                                />
                              ) : (
                                <StandaloneAssetCard
                                  key={`single-${item.asset.id}`}
                                  asset={item.asset}
                                  color={categoryColor}
                                  onToggle={() => toggleCalculate(item.asset)}
                                  onPress={() => goToDetail(item.asset.id)}
                                  onAdd={() =>
                                    openAddModal(item.asset.name, item.asset.id)
                                  }
                                />
                              ),
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </Section>
            </>
          ) : (
            <View className="mt-20 items-center justify-center">
              <Ionicons name="wallet-outline" size={48} color="#64748b" />
              <Text className="mt-4 text-[16px] font-medium text-slate-400">
                No assets yet
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                Add your first asset to get started
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <AddAssetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialPlatform={modalPlatform}
        linkAssetId={modalLinkId}
      />

      <UpdateBalanceModal
        visible={!!balanceGroup}
        group={balanceGroup}
        onClose={() => setBalanceGroup(null)}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-[13px] font-bold text-slate-300 mb-3 uppercase tracking-wide">
        {title}
      </Text>
      {children}
    </View>
  );
}

function UpdateBalanceModal({
  visible,
  group,
  onClose,
}: {
  visible: boolean;
  group: PlatformGroup | null;
  onClose: () => void;
}) {
  const [totalInput, setTotalInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { mutateAsync: createAsset } = useCreateAsset();
  const { mutateAsync: updateAsset } = useUpdateAsset();
  const { error, isVisible, hideError, showError } = useErrorModal();

  const catchAll = group?.entries.find((a) => a.platform_total !== null);

  useEffect(() => {
    if (!visible) return;
    setTotalInput(catchAll ? String(catchAll.platform_total) : "");
  }, [visible, catchAll?.id]);

  if (!group) return null;

  const handleSave = async () => {
    const amount = Number(totalInput);
    if (!totalInput || Number.isNaN(amount)) return;

    try {
      setIsSaving(true);
      if (catchAll) {
        await updateAsset({ id: catchAll.id, platform_total: amount });
      } else {
        await createAsset({
          category: group.entries[0].category,
          platform: group.platform,
          name: "Balance",
          platform_total: amount,
          is_calculate: true,
        });
      }
      onClose();
    } catch (err: any) {
      showError(
        err?.response?.data ?? {
          message: err?.message ?? "Failed to update balance",
        },
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full rounded-2xl bg-slate-900 border border-white/10 p-5">
          <Text className="text-[16px] font-bold text-white mb-1">
            Update {group.platform} Balance
          </Text>
          <Text className="text-[11px] text-slate-400 mb-4">
            Enter this platform's real total (e.g., what the app shows
            today). The difference from your other entries here is tracked
            automatically — no need to edit them by hand.
          </Text>
          <TextInput
            value={totalInput}
            onChangeText={setTotalInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#64748b"
            autoFocus
            className="rounded-lg border border-white/10 px-3 py-2 text-[14px] text-white bg-white/5 mb-4"
          />
          <View className="flex-row gap-2.5">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 rounded-lg bg-white/5 py-2.5 border border-white/10"
            >
              <Text className="text-center font-semibold text-slate-200 text-[13px]">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isSaving || !totalInput}
              onPress={handleSave}
              className={`flex-1 rounded-lg py-2.5 ${
                isSaving || !totalInput
                  ? "bg-white/5 opacity-50"
                  : "bg-emerald-500"
              }`}
            >
              <Text
                className={`text-center font-semibold text-[13px] ${
                  isSaving || !totalInput ? "text-slate-400" : "text-emerald-950"
                }`}
              >
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CategorySectionHeader({
  section,
  isCollapsed,
  onToggle,
}: {
  section: CategorySection;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const { formatRM } = useFormatRM();
  const hasExcluded = section.zakatableTotal !== section.total;
  const meta = CATEGORY_DIST_META[section.category];

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      className="flex-row items-center justify-between px-1"
    >
      <View className="flex-row items-center gap-2">
        <Ionicons
          name={isCollapsed ? "chevron-forward" : "chevron-down"}
          size={14}
          color="#64748b"
        />
        <View className="p-1.5 rounded-full" style={{ backgroundColor: `${meta.color}26` }}>
          <Ionicons
            name={CATEGORY_ICON[section.category]}
            size={14}
            color={meta.color}
          />
        </View>
        <Text
          className="text-[13px] font-bold uppercase tracking-wider"
          style={{ color: meta.color }}
        >
          {section.category}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-[14px] font-bold text-white">
          {formatRM(section.zakatableTotal)}
        </Text>
        {hasExcluded && (
          <Text className="text-[10px] font-semibold text-slate-500">
            +{formatRM(section.total - section.zakatableTotal)} excluded
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function PlatformGroupCard({
  group,
  color,
  onToggle,
  onPressEntry,
  onAdd,
  onUpdateBalance,
}: {
  group: PlatformGroup;
  color: string;
  onToggle: (asset: AssetInterface) => void;
  onPressEntry: (id: number) => void;
  onAdd: () => void;
  onUpdateBalance?: () => void;
}) {
  const { formatRM } = useFormatRM();
  const hasExcluded = group.zakatableTotal !== group.walletTotal;

  return (
    <View
      className="rounded-2xl bg-white/[0.035] overflow-hidden"
      style={{
        borderWidth: 1,
        borderColor: `${color}33`,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
    >
      {/* Group header */}
      <View className="px-4 py-3 bg-white/5 border-b border-white/10">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-[14px] font-bold text-white">
              {group.platform}
            </Text>
            <Text className="text-[10px] text-slate-400 mt-0.5">
              {group.entries.length}{" "}
              {group.entries.length > 1 ? "entries" : "entry"}
            </Text>
          </View>
          {onUpdateBalance && (
            <TouchableOpacity
              onPress={onUpdateBalance}
              hitSlop={8}
              className="p-1.5 mr-2 rounded-full bg-white/10"
            >
              <Ionicons name="sync" size={16} color="#38bdf8" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onAdd}
            hitSlop={8}
            className="p-1.5 mr-2 rounded-full bg-white/10"
          >
            <Ionicons name="add" size={16} color={color} />
          </TouchableOpacity>
          <View className="items-end">
            <View className="flex-row items-baseline gap-1.5">
              <Text className="text-[16px] font-bold" style={{ color }}>
                {formatRM(group.zakatableTotal)}
              </Text>
              {group.profitPercent !== null && (
                <Text
                  className={`text-[11px] font-semibold ${
                    group.profitPercent >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {group.profitPercent >= 0 ? "+" : ""}
                  {group.profitPercent.toFixed(1)}%
                </Text>
              )}
            </View>
            {hasExcluded && (
              <Text className="text-[10px] font-semibold text-slate-500 mt-0.5">
                +{formatRM(group.walletTotal - group.zakatableTotal)} excluded
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Entries */}
      <View>
        {group.entries.map((asset, idx) => (
          <AssetRow
            key={asset.id}
            asset={asset}
            color={color}
            isLast={idx === group.entries.length - 1}
            onToggle={() => onToggle(asset)}
            onPress={() => onPressEntry(asset.id)}
            showProfit={group.entries.length <= 1}
          />
        ))}
      </View>
    </View>
  );
}

function StandaloneAssetCard({
  asset,
  color,
  onToggle,
  onPress,
  onAdd,
}: {
  asset: AssetInterface;
  color: string;
  onToggle: () => void;
  onPress: () => void;
  onAdd: () => void;
}) {
  return (
    <View
      className="rounded-2xl bg-white/[0.035] overflow-hidden"
      style={{
        borderWidth: 1,
        borderColor: `${color}33`,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
    >
      <AssetRow
        asset={asset}
        color={color}
        isLast
        onToggle={onToggle}
        onPress={onPress}
        onAdd={onAdd}
      />
    </View>
  );
}

function AssetRow({
  asset,
  color,
  isLast,
  onToggle,
  onPress,
  onAdd,
  showProfit = true,
}: {
  asset: AssetInterface;
  color: string;
  isLast: boolean;
  onToggle: () => void;
  onPress: () => void;
  onAdd?: () => void;
  // False when this row lives in a multi-entry platform group — profit
  // is shown once, aggregated, on the group header instead.
  showProfit?: boolean;
}) {
  const { formatRM } = useFormatRM();
  const {
    name,
    quantity,
    price,
    unit,
    note,
    cost_basis,
    is_calculate,
    platform_total,
    goal,
  } = asset;

  const profitPercent =
    showProfit && cost_basis && cost_basis > 0 && price !== null
      ? ((price - cost_basis) / cost_basis) * 100
      : null;

  const goalPercent =
    goal && goal > 0 && price !== null ? (price / goal) * 100 : null;

  return (
    <View
      className={`px-4 py-3 ${
        !isLast ? "border-b border-white/8" : ""
      } ${!is_calculate ? "opacity-60" : ""}`}
    >
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          className="flex-1 flex-row items-center justify-between pr-3"
        >
          <View className="flex-1 pr-2">
            {quantity !== null && (
              <Text className="text-[10px] text-slate-400 mb-1">
                {quantity} {unit}
              </Text>
            )}
            <View className="flex-row items-center gap-1">
              <Text className="text-[13px] font-semibold text-white">
                {name}
              </Text>
              {platform_total !== null && (
                <Ionicons name="sync" size={11} color="#38bdf8" />
              )}
            </View>
            {note && (
              <Text
                className="text-[10px] text-slate-400 mt-0.5 italic"
                numberOfLines={1}
              >
                {note}
              </Text>
            )}
          </View>
          <View className="items-end">
            <Text className="text-[14px] font-bold" style={{ color }}>
              {price !== null ? formatRM(price) : "N/A"}
            </Text>
            {profitPercent !== null && (
              <Text
                className={`text-[10px] font-semibold mt-0.5 ${
                  profitPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {profitPercent >= 0 ? "+" : ""}
                {profitPercent.toFixed(1)}%
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {onAdd && (
          <TouchableOpacity
            onPress={onAdd}
            hitSlop={8}
            className="p-1.5 mr-3 rounded-full bg-white/10"
          >
            <Ionicons name="add" size={16} color={color} />
          </TouchableOpacity>
        )}

        <Switch
          key={`${asset.id}-${is_calculate}`}
          value={is_calculate}
          onValueChange={onToggle}
          trackColor={{ false: "#334155", true: color }}
          thumbColor="#ffffff"
        />
      </View>

      {goalPercent !== null && (
        <View className="mt-2.5">
          <View className="flex-row justify-between mb-1">
            <Text className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
              Goal {formatRM(goal!)}
            </Text>
            <Text className="text-[9px] font-bold text-emerald-400">
              {Math.round(goalPercent)}%
            </Text>
          </View>
          <View className="h-1 rounded-full bg-white/10 overflow-hidden">
            <View
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(goalPercent, 100)}%` }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
