import { AddAssetModal } from "@/components/asset/add-asset";
import { AssetInterface } from "@/interface/asset";
import { useGetAssets, useUpdateAsset } from "@/services/asset";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AssetSkeletonLoader } from "./skeleton-loader";

type PlatformGroup = {
  platform: string;
  entries: AssetInterface[];
  walletTotal: number;
  zakatableTotal: number;
};

type DisplayItem =
  | { type: "group"; total: number; group: PlatformGroup }
  | { type: "single"; total: number; asset: AssetInterface };

export function Asset() {
  const { data: assets, isLoading } = useGetAssets();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPlatform, setModalPlatform] = useState<string | undefined>();
  const [modalLinkId, setModalLinkId] = useState<number | undefined>();
  const router = useRouter();
  const { mutate: updateAsset } = useUpdateAsset();

  const openAddModal = (platform?: string, linkId?: number) => {
    setModalPlatform(platform);
    setModalLinkId(linkId);
    setModalVisible(true);
  };

  const items = useMemo<DisplayItem[]>(() => {
    if (!assets) return [];

    // Only assets that share a real platform name get nested into a group —
    // assets with no platform stay as their own separate cards.
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
      ([platform, entries]) => {
        const walletTotal = entries.reduce(
          (sum, a) => sum + (a.price ?? 0),
          0,
        );
        const zakatableTotal = entries.reduce(
          (sum, a) => sum + (a.is_calculate ? (a.price ?? 0) : 0),
          0,
        );
        return {
          type: "group",
          total: walletTotal,
          group: { platform, entries, walletTotal, zakatableTotal },
        };
      },
    );

    const singleItems: DisplayItem[] = standalone.map((asset) => ({
      type: "single",
      total: asset.price ?? 0,
      asset,
    }));

    return [...groupItems, ...singleItems].sort((a, b) => b.total - a.total);
  }, [assets]);

  const toggleCalculate = (asset: AssetInterface) => {
    updateAsset({ id: asset.id, is_calculate: !asset.is_calculate });
  };

  const goToDetail = (assetId: number) =>
    router.push({
      pathname: "/asset/[id]",
      params: { id: String(assetId) },
    });

  return (
    <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <View className="flex-row items-center justify-between px-6 pt-10 pb-2">
        <View>
          <Text className="text-[14px] font-medium text-slate-400">
            Overview
          </Text>
          <Text className="text-[32px] font-bold text-white mt-1">
            My Assets
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => openAddModal()}
          className="rounded-full bg-linear-to-br from-emerald-500 to-emerald-600 px-6 py-3 shadow-lg active:scale-95"
        >
          <View className="flex-row items-center gap-1">
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-semibold text-[14px]">Add</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View className="flex-1 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 py-10 my-5">
        <ScrollView
          className="px-6 flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <AssetSkeletonLoader />
          ) : items.length > 0 ? (
            <View className="gap-4">
              {items.map((item) =>
                item.type === "group" ? (
                  <PlatformGroupCard
                    key={`group-${item.group.platform}`}
                    group={item.group}
                    onToggle={toggleCalculate}
                    onPressEntry={goToDetail}
                    onAdd={() => openAddModal(item.group.platform)}
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
    </View>
  );
}

function PlatformGroupCard({
  group,
  onToggle,
  onPressEntry,
  onAdd,
}: {
  group: PlatformGroup;
  onToggle: (asset: AssetInterface) => void;
  onPressEntry: (id: number) => void;
  onAdd: () => void;
}) {
  const hasExcluded = group.zakatableTotal !== group.walletTotal;

  return (
    <View className="rounded-2xl bg-slate-800/60 border border-slate-600/50 overflow-hidden">
      {/* Group header */}
      <View className="px-4 py-3 bg-slate-700/40 border-b border-slate-600/50">
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
          <TouchableOpacity
            onPress={onAdd}
            hitSlop={8}
            className="p-1.5 mr-2 rounded-full bg-slate-600/40"
          >
            <Ionicons name="add" size={16} color="#10b981" />
          </TouchableOpacity>
          <View className="items-end">
            <Text className="text-[16px] font-bold text-white">
              RM{group.walletTotal.toLocaleString()}
            </Text>
            {hasExcluded && (
              <Text className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                RM{group.zakatableTotal.toLocaleString()} zakatable
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
    <View className="rounded-2xl bg-slate-800/60 border border-slate-600/50 overflow-hidden">
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
}: {
  asset: AssetInterface;
  isLast: boolean;
  onToggle: () => void;
  onPress: () => void;
  onAdd?: () => void;
}) {
  const { category, name, quantity, price, unit, note, cost_basis, is_calculate } =
    asset;

  const profitPercent =
    cost_basis && cost_basis > 0 && price !== null
      ? ((price - cost_basis) / cost_basis) * 100
      : null;

  return (
    <View
      className={`flex-row items-center px-4 py-3 ${
        !isLast ? "border-b border-slate-700/60" : ""
      } ${!is_calculate ? "opacity-60" : ""}`}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className="flex-1 flex-row items-center justify-between pr-3"
      >
        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-1.5 mb-1">
            <View className="bg-emerald-500/20 rounded-full px-2 py-0.5">
              <Text className="text-[9px] font-bold text-emerald-400">
                {category}
              </Text>
            </View>
            {quantity !== null && (
              <Text className="text-[10px] text-slate-400">
                {quantity} {unit}
              </Text>
            )}
          </View>
          <Text className="text-[13px] font-semibold text-white">{name}</Text>
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
          <Text className="text-[14px] font-bold text-emerald-400">
            {price !== null ? `RM${price.toLocaleString()}` : "N/A"}
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
          className="p-1.5 mr-3 rounded-full bg-slate-600/40"
        >
          <Ionicons name="add" size={16} color="#10b981" />
        </TouchableOpacity>
      )}

      <Switch
        key={`${asset.id}-${is_calculate}`}
        value={is_calculate}
        onValueChange={onToggle}
        trackColor={{ false: "#475569", true: "#10b981" }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
