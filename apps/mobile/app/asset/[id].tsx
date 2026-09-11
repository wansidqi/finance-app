import { CATEGORIES } from "@/components/asset/add-asset";
import { BooleanRenderer } from "@/components/BooleanRenderer";
import { ConfirmDeleteModal } from "@/components/modal/confirm-delete-modal";
import { ErrorModal } from "@/components/modal/error-modal";
import { useErrorModal } from "@/components/modal/useErrorModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { FieldLabel } from "@/components/ui/field-label";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";

import { SCREEN_SCROLL_BOTTOM_PADDING } from "@/constants/layout";
import { useFormatRM } from "@/hooks/use-format-rm";
import { AssetInterface, BaseAsset } from "@/interface/asset";
import {
  useDeleteAsset,
  useGetAssets,
  useGetAssetsById,
  useUpdateAssetById,
} from "@/services/asset";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

const CATEGORY_ICON = {
  CASH: "cash-outline",
  GOLD: "diamond-outline",
  CRYPTO: "logo-bitcoin",
  STOCK: "trending-up-outline",
} as const;

export default function AssetDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: asset, isLoading } = useGetAssetsById(id as string);
  const { hideAmounts, setHideAmounts } = useFormatRM();

  if (!id) return null;

  if (isLoading)
    return (
      <View className="flex-1 bg-canvas items-center justify-center">
        <Text className="font-sans text-mist">Loading...</Text>
      </View>
    );

  if (!asset)
    return (
      <View className="flex-1 bg-canvas items-center justify-center">
        <Text className="font-sans text-mist">Asset not found</Text>
      </View>
    );

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader
        variant="back"
        title="Asset Details"
        onBack={() => router.navigate("/(tabs)/asset")}
        right={
          <IconButton
            onPress={() => setHideAmounts(!hideAmounts)}
            icon={hideAmounts ? "eye-off-outline" : "eye-outline"}
            label={hideAmounts ? "Show amounts" : "Hide amounts"}
          />
        }
      />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="px-6"
          contentContainerStyle={{ paddingBottom: SCREEN_SCROLL_BOTTOM_PADDING }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AssetCard {...asset} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function AssetCard(asset: AssetInterface) {
  const { formatRM } = useFormatRM();
  const {
    category,
    goal,
    id,
    name,
    platform,
    quantity,
    price,
    unit,
    cost_basis,
    note,
    is_calculate,
    platform_total,
    use_live_gold_price,
    status,
  } = asset;

  const { mutateAsync } = useUpdateAssetById(id);
  const { mutateAsync: deleteAsset } = useDeleteAsset(id);
  const { data: allAssets } = useGetAssets();

  const [isEdit, setIsEdit] = useState(false);
  const editAnimRef = useRef(new Animated.Value(0)).current;

  const [editAsset, setEditAsset] = useState<BaseAsset>({
    id,
    category,
    name,
    platform,
    unit,
    quantity,
    price,
    goal,
    cost_basis,
    note,
    is_calculate,
    platform_total,
    use_live_gold_price,
  });

  // Kept as raw text (not parsed to Number) while typing — a controlled
  // input bound to a parsed numeric value snaps "10." back to "10" the
  // instant the decimal point is typed, since (10).toString() drops it.
  // Only converted to a number at save time.
  const [priceText, setPriceText] = useState(price?.toString() ?? "");
  const [quantityText, setQuantityText] = useState(quantity?.toString() ?? "");
  const [costBasisText, setCostBasisText] = useState(cost_basis?.toString() ?? "");
  const [goalText, setGoalText] = useState(goal?.toString() ?? "");
  const [platformTotalText, setPlatformTotalText] = useState(
    platform_total?.toString() ?? "",
  );

  const { error, isVisible, hideError, showError } = useErrorModal();

  // True when this asset shares its category+platform with another entry
  // (a multi-entry group), where profit % is aggregated on the platform
  // card in the list instead of shown per entry.
  const trimmedEditPlatform = editAsset.platform?.trim().toLowerCase() ?? "";
  const isGrouped =
    !!trimmedEditPlatform &&
    (allAssets ?? []).some(
      (a) =>
        a.id !== id &&
        a.category === editAsset.category &&
        a.platform?.trim().toLowerCase() === trimmedEditPlatform,
    );

  // DELETE confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate goal progress if applicable
  const progress = goal && price !== null ? (price / goal) * 100 : 0;

  const profitPercent =
    !isGrouped && cost_basis && cost_basis > 0 && price !== null
      ? ((price - cost_basis) / cost_basis) * 100
      : null;

  useEffect(() => {
    Animated.timing(editAnimRef, {
      toValue: isEdit ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isEdit]);

  const updateAsset = async () => {
    try {
      const parsedPlatformTotal = platformTotalText.trim()
        ? Number(platformTotalText)
        : null;
      const payload: BaseAsset = {
        ...editAsset,
        price: priceText.trim() ? Number(priceText) : null,
        quantity: quantityText.trim() ? Number(quantityText) : null,
        cost_basis: costBasisText.trim() ? Number(costBasisText) : null,
        goal: goalText.trim() ? Number(goalText) : null,
        platform_total: parsedPlatformTotal,
      };
      if (platform_total !== null && parsedPlatformTotal === null) {
        payload.clear_platform_total = true;
      }
      await mutateAsync(payload);
      setIsEdit(false);
    } catch (error: any) {
      const apiError = error?.response?.data ?? {
        message: error?.message ?? "Unknown error",
      };
      showError(apiError);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteAsset();
      setShowDeleteConfirm(false);
    } catch (error: any) {
      showError(
        error?.response?.data ?? { message: error?.message ?? "Delete failed" },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Animated.View
      className="rounded-card overflow-hidden shadow-card"
      style={{
        opacity: editAnimRef.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1],
        }),
      }}
    >
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <ConfirmDeleteModal
        title="Delete Asset"
        description="Are you sure you want to delete this asset? This action cannot be undone."
        visible={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      <View
        className={`${
          isEdit ? "bg-modal-surface" : "bg-glass-surface"
        } px-6 py-6 border border-glass-edge`}
      >
        {/* Category & Edit/Delete Buttons */}
        <View className="flex-row items-center justify-between mb-4">
          <BooleanRenderer
            condition={isEdit}
            editOn={
              <View className="flex-1">
                <ChipGroup
                  options={CATEGORIES.map((item) => ({
                    value: item,
                    label: item,
                    icon: CATEGORY_ICON[item],
                  }))}
                  value={editAsset.category}
                  onChange={(item) =>
                    setEditAsset({ ...editAsset, category: item as any })
                  }
                />
              </View>
            }
            editOff={
              <View className="flex-1 flex-row items-center gap-2 flex-wrap pr-2">
                <Badge label={category} icon={CATEGORY_ICON[category]} emphasis />
                {platform && <Badge label={platform} />}
                {status && <Badge label={status} />}
                {!is_calculate && (
                  <Badge label="Excluded from Zakat" icon="eye-off-outline" />
                )}
                {platform_total !== null && (
                  <Badge label="Auto-tracked balance" icon="sync-outline" />
                )}
              </View>
            }
          />

          <View className="flex-row flex-shrink-0">
            <IconButton
              onPress={() => setIsEdit(!isEdit)}
              icon={isEdit ? "close-outline" : "pencil-outline"}
              label={isEdit ? "Cancel editing" : "Edit asset"}
              size={18}
              className="ml-3"
            />
            <IconButton
              onPress={() => setShowDeleteConfirm(true)}
              icon="trash-outline"
              label="Delete asset"
              size={18}
              className="ml-3"
            />
          </View>
        </View>

        {/* Name */}
        <View className="mb-3">
          <BooleanRenderer
            condition={isEdit}
            editOff={
              <Text className="font-sans text-[18px] font-bold text-white">{name}</Text>
            }
            editOn={
              <TextField
                value={editAsset.name}
                onChangeText={(text) =>
                  setEditAsset({ ...editAsset, name: text })
                }
                placeholder="Asset Name"
              />
            }
          />
        </View>

        {/* Platform */}
        <View className="mb-3">
          <FieldLabel>Platform / Account</FieldLabel>
          <BooleanRenderer
            condition={isEdit}
            editOff={
              <Text className="font-sans text-[13px] text-mist">
                {platform || "Not set"}
              </Text>
            }
            editOn={
              <TextField
                value={editAsset.platform ?? ""}
                onChangeText={(text) =>
                  setEditAsset({ ...editAsset, platform: text || null })
                }
                placeholder="e.g., Maybank, Touch 'n Go, Luno"
              />
            }
          />
        </View>

        {/* Display Value (Non-Edit Mode) */}
        {!isEdit && price !== null && (
          <View className="mb-4">
            <FieldLabel>Current Value</FieldLabel>
            <View className="flex-row items-baseline gap-2">
              <Text className="font-sans text-[20px] font-bold text-white">
                {formatRM(price)}
              </Text>
              {profitPercent !== null && (
                <View className="flex-row items-center gap-0.5">
                  <Ionicons
                    name={profitPercent >= 0 ? "chevron-up-outline" : "chevron-down-outline"}
                    size={11}
                    color="#d1e4fa"
                  />
                  <Text className="font-sans text-[13px] font-semibold text-frost">
                    {profitPercent >= 0 ? "+" : ""}
                    {profitPercent.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
            {quantity !== null && (
              <Text className="font-sans text-[12px] text-fog mt-1">
                {quantity} {unit}
              </Text>
            )}
            {platform_total !== null && (
              <Text className="font-sans text-[11px] text-frost mt-1">
                = {formatRM(platform_total)} platform total − other entries on{" "}
                {platform}
              </Text>
            )}
            {isGrouped && cost_basis && cost_basis > 0 && (
              <Text className="font-sans text-[11px] text-fog mt-1">
                Profit % is shown combined on the platform card in the list
              </Text>
            )}
            {note && (
              <Text className="font-sans text-[12px] text-fog mt-2 italic">
                {note}
              </Text>
            )}
          </View>
        )}

        {/* Edit Mode - Value, Quantity, Unit, Cost Basis */}
        {isEdit && (
          <View className="mb-4 gap-3">
            <SectionEyebrow label="Value" />
            <View>
              <FieldLabel>Current Value (RM)</FieldLabel>
              {platformTotalText.trim() !== "" ? (
                <View className="border border-white/[0.06] rounded-input py-2 px-2.5 bg-white/5">
                  <Text className="font-sans text-[12px] text-fog">
                    Auto-computed from platform total below
                  </Text>
                </View>
              ) : editAsset.use_live_gold_price ? (
                <View className="border border-white/[0.06] rounded-input py-2 px-2.5 bg-white/5">
                  <Text className="font-sans text-[12px] text-fog">
                    Auto-computed from live gold price × weight
                  </Text>
                </View>
              ) : (
                <TextField
                  value={priceText}
                  onChangeText={setPriceText}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              )}
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <FieldLabel>Quantity (Optional)</FieldLabel>
                <TextField
                  value={quantityText}
                  onChangeText={setQuantityText}
                  placeholder="e.g., 15"
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <FieldLabel>Unit</FieldLabel>
                <TextField
                  value={editAsset.unit}
                  onChangeText={(text) =>
                    setEditAsset({ ...editAsset, unit: text })
                  }
                  placeholder="e.g., gram, BTC, shares"
                />
              </View>
            </View>

            {editAsset.category === "GOLD" && (
              <TouchableOpacity
                onPress={() =>
                  quantityText.trim() &&
                  setEditAsset({
                    ...editAsset,
                    use_live_gold_price: !editAsset.use_live_gold_price,
                    unit: !editAsset.use_live_gold_price
                      ? "gram"
                      : editAsset.unit,
                  })
                }
                disabled={!quantityText.trim()}
                className={`flex-row items-center justify-between rounded-input border px-3 py-2.5 ${
                  editAsset.use_live_gold_price
                    ? "border-glass-edge bg-luminous-fill"
                    : "border-white/[0.06] bg-white/5"
                } ${!quantityText.trim() ? "opacity-50" : ""}`}
              >
                <View className="flex-1 pr-3">
                  <Text className="font-sans text-[12px] font-bold text-white">
                    Use Live Gold Price
                  </Text>
                  <Text className="font-sans text-[10px] text-fog mt-0.5">
                    {quantityText.trim()
                      ? "Value updates daily from Bank Negara Malaysia's gold price"
                      : "Set a quantity (grams) above first"}
                  </Text>
                </View>
                <Switch
                  value={!!editAsset.use_live_gold_price}
                  onValueChange={(val) =>
                    setEditAsset({
                      ...editAsset,
                      use_live_gold_price: val,
                      unit: val ? "gram" : editAsset.unit,
                    })
                  }
                  disabled={!quantityText.trim()}
                />
              </TouchableOpacity>
            )}

            <SectionEyebrow label="Profit Tracking" className="mt-1" />
            <View>
              <FieldLabel>Cost Basis (Optional)</FieldLabel>
              <TextField
                value={costBasisText}
                onChangeText={setCostBasisText}
                placeholder="How much you paid in total (RM)"
                keyboardType="decimal-pad"
              />
              <Text className="font-sans text-[10px] text-fog mt-1.5">
                {isGrouped
                  ? "This platform has other entries — profit % will show combined on the platform card instead of here."
                  : "Used to calculate your profit % — leave empty to skip"}
              </Text>
            </View>
            <View>
              <FieldLabel>Platform Total (Optional)</FieldLabel>
              <TextField
                value={platformTotalText}
                onChangeText={setPlatformTotalText}
                placeholder="e.g., 433 — this platform's real balance"
                keyboardType="decimal-pad"
                editable={!!editAsset.platform}
              />
              <Text className="font-sans text-[10px] text-fog mt-1.5">
                {editAsset.platform
                  ? "Marks this as the platform's real total — value becomes this total minus your other entries on the same platform."
                  : "Set a Platform above first"}
              </Text>
            </View>
          </View>
        )}

        {/* Goal Progress (if applicable) */}
        {!isEdit && goal && goal > 0 && price !== null && (
          <View className="mt-2 mb-4">
            <View className="mb-2 flex-row justify-between">
              <Text className="font-mono text-[10px] font-semibold text-fog uppercase tracking-wider">
                GOAL PROGRESS
              </Text>
              <Text className="font-sans text-[11px] font-bold text-frost">
                {Math.round(progress)}%
              </Text>
            </View>
            <View className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
              <Animated.View
                className="h-full rounded-full bg-frost"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </View>
            <Text className="mt-2 font-sans text-[10px] text-fog">
              {formatRM(price)} / {formatRM(goal)}
            </Text>
          </View>
        )}

        {/* Additional Details (Edit Mode) - Note, Goal, Zakat toggle */}
        {isEdit && (
          <View className="mb-4 gap-3">
            <SectionEyebrow label="Additional Details" />
            <View>
              <FieldLabel>Note (Optional)</FieldLabel>
              <TextField
                value={editAsset.note ?? ""}
                onChangeText={(text) =>
                  setEditAsset({ ...editAsset, note: text || null })
                }
                placeholder="e.g., Holding for Ali, repay by Sept"
                multiline
                numberOfLines={2}
                style={{ minHeight: 56, textAlignVertical: "top" }}
              />
            </View>
            <View>
              <FieldLabel>Goal Amount (Optional)</FieldLabel>
              <TextField
                value={goalText}
                onChangeText={setGoalText}
                placeholder="Target amount"
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-row items-center justify-between rounded-input border border-white/[0.06] bg-white/5 px-3 py-3">
              <View className="flex-1 pr-3">
                <Text className="font-sans text-[12px] font-bold text-white">
                  Include in Zakat Calculation
                </Text>
                <Text className="font-sans text-[10px] text-fog mt-0.5">
                  Turn off if this is money you&apos;re holding for someone else
                </Text>
              </View>
              <Switch
                value={editAsset.is_calculate}
                onValueChange={(value) =>
                  setEditAsset({ ...editAsset, is_calculate: value })
                }
              />
            </View>
          </View>
        )}

        {/* Timestamps */}
        {!isEdit && (
          <View className="mt-4 pt-4 border-t border-glass-edge">
            <View className="flex-row justify-between items-center">
              <Text className="font-sans text-[10px] text-fog">
                Created: {new Date(asset.created_at).toLocaleDateString()}
              </Text>
              {asset.updated_at && (
                <Text className="font-sans text-[10px] text-fog">
                  Updated: {new Date(asset.updated_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Edit Buttons */}
        {isEdit && (
          <View className="mt-5 flex-row gap-2.5">
            <Button
              label="Cancel"
              variant="outline"
              className="flex-1"
              onPress={() => {
                setIsEdit(false);
                setEditAsset({
                  id,
                  category,
                  name,
                  platform,
                  unit,
                  quantity,
                  price,
                  goal,
                  cost_basis,
                  note,
                  is_calculate,
                  platform_total,
                  use_live_gold_price,
                });
                setPriceText(price?.toString() ?? "");
                setQuantityText(quantity?.toString() ?? "");
                setCostBasisText(cost_basis?.toString() ?? "");
                setGoalText(goal?.toString() ?? "");
                setPlatformTotalText(platform_total?.toString() ?? "");
              }}
            />
            <Button
              label="Save"
              variant="primary"
              className="flex-1"
              onPress={updateAsset}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}
