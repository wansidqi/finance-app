import { AddAssetModal } from "@/components/asset/add-asset";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { ErrorModal } from "@/components/modal/error-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { IconAvatar } from "@/components/ui/icon-avatar";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { SCREEN_SCROLL_BOTTOM_PADDING } from "@/constants/layout";
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
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
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
  CASH: "cash-outline",
  GOLD: "diamond-outline",
  CRYPTO: "logo-bitcoin",
  STOCK: "trending-up-outline",
};

const CATEGORY_DIST_ORDER: AssetCategory[] = ["CASH", "GOLD", "CRYPTO", "STOCK"];
// Category identity is carried entirely by icon + label now (no hue). Bar
// segments still need *some* visual separation, so each category gets a
// step down in opacity instead of a different color.
const CATEGORY_DIST_META: Record<AssetCategory, { label: string; opacity: number }> = {
  CASH: { label: "Cash & Savings", opacity: 1 },
  GOLD: { label: "Gold", opacity: 0.75 },
  CRYPTO: { label: "Crypto", opacity: 0.5 },
  STOCK: { label: "Stock", opacity: 0.3 },
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
    <View className="flex-1 bg-canvas">
      <ScreenHeader
        eyebrow="Overview"
        title="My Assets"
        right={
          <View className="flex-row items-center gap-2">
            <IconButton
              onPress={() => setHideAmounts(!hideAmounts)}
              icon={hideAmounts ? "eye-off-outline" : "eye-outline"}
              label={hideAmounts ? "Show amounts" : "Hide amounts"}
            />
            <Button label="Add" icon="add" onPress={() => openAddModal()} />
          </View>
        }
      />
      <View className="flex-1 bg-canvas">
        <ScrollView
          className="px-6 flex-1"
          contentContainerStyle={{ paddingBottom: SCREEN_SCROLL_BOTTOM_PADDING }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <AssetSkeletonLoader />
          ) : sections.length > 0 ? (
            <>
              <Card className="mb-6" padded={false}>
                <View className="px-6 pt-7 pb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-fog">
                      Total Assets
                    </Text>
                    <IconAvatar name="wallet-outline" size={32} />
                  </View>
                  <Text className="font-display text-[36px] text-white">
                    {formatRM(totalZakatable, { decimals: true })}
                  </Text>
                  {totalExcluded > 0 && (
                    <Text className="font-sans text-[11px] text-fog mt-1">
                      +{formatRM(totalExcluded, { decimals: true })} excluded
                    </Text>
                  )}
                </View>
              </Card>

              <View className="mb-6">
                <SectionEyebrow label="Asset Distribution" className="mb-4" />
                <Card>
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
                          className="bg-frost"
                          style={{
                            width: `${percent}%`,
                            opacity: CATEGORY_DIST_META[category].opacity,
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
                            <Ionicons
                              name={CATEGORY_ICON[category]}
                              size={12}
                              color="#d1e4fa"
                              style={{ opacity: meta.opacity }}
                            />
                            <Text className="font-sans text-[11px] text-mist">
                              {meta.label} ({categoryEntryCounts[category]})
                            </Text>
                          </View>
                          <Text className="font-sans text-[14px] font-bold text-white">
                            {formatRM(value, { decimals: true })}
                          </Text>
                          <Text className="font-sans text-[10px] text-fog mt-0.5">
                            {percent.toFixed(1)}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              </View>

              <View className="mb-5">
                <SectionEyebrow
                  label="Holdings"
                  className="mb-4"
                  action={
                    sections.length > 1 ? (
                      <TouchableOpacity
                        onPress={toggleAllCategories}
                        className="flex-row items-center gap-1.5"
                        hitSlop={8}
                      >
                        <Ionicons
                          name={
                            allCategoriesCollapsed
                              ? "chevron-expand-outline"
                              : "chevron-collapse-outline"
                          }
                          size={13}
                          color="#d1e4fa"
                        />
                        <Text className="font-sans text-[11px] font-semibold text-frost">
                          {allCategoriesCollapsed ? "Expand all" : "Collapse all"}
                        </Text>
                      </TouchableOpacity>
                    ) : undefined
                  }
                />
                <View className="gap-4">
                  {sections.map((section) => {
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
              </View>
            </>
          ) : (
            <View className="mt-20 items-center justify-center">
              <Ionicons name="wallet-outline" size={48} color="#9da7ba" />
              <Text className="mt-4 font-sans text-[16px] font-medium text-mist">
                No assets yet
              </Text>
              <Text className="mt-1 font-sans text-[13px] text-fog">
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
    <>
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <Dialog
        visible={visible}
        onRequestClose={onClose}
        icon="sync-outline"
        title={`Update ${group.platform} Balance`}
        description="Enter this platform's real total (e.g., what the app shows today). The difference from your other entries here is tracked automatically — no need to edit them by hand."
        actions={[
          { label: "Cancel", onPress: onClose, variant: "outline", disabled: isSaving },
          {
            label: isSaving ? "Saving..." : "Save",
            onPress: handleSave,
            variant: "primary",
            loading: isSaving,
            disabled: !totalInput,
          },
        ]}
      >
        <TextField
          value={totalInput}
          onChangeText={setTotalInput}
          keyboardType="decimal-pad"
          placeholder="0.00"
          autoFocus
        />
      </Dialog>
    </>
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
          color="#9da7ba"
        />
        <View className="p-1.5 rounded-icon bg-luminous-fill">
          <Ionicons
            name={CATEGORY_ICON[section.category]}
            size={14}
            color="#d1e4fa"
          />
        </View>
        <Text className="font-sans text-[13px] font-bold uppercase tracking-wider text-white">
          {section.category}
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-sans text-[14px] font-bold text-white">
          {formatRM(section.zakatableTotal)}
        </Text>
        {hasExcluded && (
          <Text className="font-sans text-[10px] font-semibold text-fog">
            +{formatRM(section.total - section.zakatableTotal)} excluded
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function PlatformGroupCard({
  group,
  onToggle,
  onPressEntry,
  onAdd,
  onUpdateBalance,
}: {
  group: PlatformGroup;
  onToggle: (asset: AssetInterface) => void;
  onPressEntry: (id: number) => void;
  onAdd: () => void;
  onUpdateBalance?: () => void;
}) {
  const { formatRM } = useFormatRM();
  const hasExcluded = group.zakatableTotal !== group.walletTotal;

  return (
    <View className="rounded-card bg-glass-surface border border-glass-edge overflow-hidden">
      {/* Group header */}
      <View className="px-4 py-3 bg-white/5 border-b border-glass-edge">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="font-sans text-[14px] font-bold text-white">
              {group.platform}
            </Text>
            <Text className="font-sans text-[10px] text-fog mt-0.5">
              {group.entries.length}{" "}
              {group.entries.length > 1 ? "entries" : "entry"}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 mr-3">
            {onUpdateBalance && (
              <IconButton
                onPress={onUpdateBalance}
                icon="sync-outline"
                label="Update platform balance"
                size={14}
              />
            )}
            <IconButton onPress={onAdd} icon="add" label="Add asset to this platform" size={14} />
          </View>
          <View className="items-end">
            <View className="flex-row items-baseline gap-1.5">
              <Text className="font-sans text-[16px] font-bold text-white">
                {formatRM(group.zakatableTotal)}
              </Text>
              {group.profitPercent !== null && (
                <View className="flex-row items-center gap-0.5">
                  <Ionicons
                    name={group.profitPercent >= 0 ? "chevron-up-outline" : "chevron-down-outline"}
                    size={10}
                    color="#d1e4fa"
                  />
                  <Text className="font-sans text-[11px] font-semibold text-frost">
                    {group.profitPercent >= 0 ? "+" : ""}
                    {group.profitPercent.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
            {hasExcluded && (
              <Text className="font-sans text-[10px] font-semibold text-fog mt-0.5">
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
  onToggle,
  onPress,
  onAdd,
}: {
  asset: AssetInterface;
  onToggle: () => void;
  onPress: () => void;
  onAdd: () => void;
}) {
  return (
    <View className="rounded-card bg-glass-surface border border-glass-edge overflow-hidden">
      <AssetRow
        asset={asset}
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
  isLast,
  onToggle,
  onPress,
  onAdd,
  showProfit = true,
}: {
  asset: AssetInterface;
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
        !isLast ? "border-b border-glass-edge" : ""
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
              <Text className="font-sans text-[10px] text-fog mb-1">
                {quantity} {unit}
              </Text>
            )}
            <View className="flex-row items-center gap-1">
              <Text className="font-sans text-[13px] font-semibold text-white">
                {name}
              </Text>
              {platform_total !== null && (
                <Ionicons name="sync-outline" size={11} color="#d1e4fa" />
              )}
            </View>
            {note && (
              <Text
                className="font-sans text-[10px] text-fog mt-0.5 italic"
                numberOfLines={1}
              >
                {note}
              </Text>
            )}
          </View>
          <View className="items-end">
            <Text className="font-sans text-[14px] font-bold text-white">
              {price !== null ? formatRM(price) : "N/A"}
            </Text>
            {profitPercent !== null && (
              <View className="flex-row items-center gap-0.5 mt-0.5">
                <Ionicons
                  name={profitPercent >= 0 ? "chevron-up-outline" : "chevron-down-outline"}
                  size={9}
                  color="#d1e4fa"
                />
                <Text className="font-sans text-[10px] font-semibold text-frost">
                  {profitPercent >= 0 ? "+" : ""}
                  {profitPercent.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {onAdd && (
          <TouchableOpacity
            onPress={onAdd}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add sibling asset entry"
            className="p-1.5 mr-3 rounded-icon bg-luminous-fill"
          >
            <Ionicons name="add" size={16} color="#d1e4fa" />
          </TouchableOpacity>
        )}

        <Switch
          key={`${asset.id}-${is_calculate}`}
          value={is_calculate}
          onValueChange={onToggle}
        />
      </View>

      {goalPercent !== null && (
        <View className="mt-2.5">
          <View className="flex-row justify-between mb-1">
            <Text className="font-sans text-[9px] font-semibold text-fog uppercase tracking-wider">
              Goal {formatRM(goal!)}
            </Text>
            <Text className="font-sans text-[9px] font-bold text-frost">
              {Math.round(goalPercent)}%
            </Text>
          </View>
          <View className="h-1 rounded-full bg-white/10 overflow-hidden">
            <View
              className="h-full rounded-full bg-frost"
              style={{ width: `${Math.min(goalPercent, 100)}%` }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
