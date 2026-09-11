import { useCreateAsset, useGetAssets, useUpdateAsset } from "@/services/asset";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ErrorModal } from "../modal/error-modal";
import { useErrorModal } from "../modal/useErrorModal";

type Props = {
  visible: boolean;
  onClose: () => void;
  // Pre-fills Platform when adding a sibling entry to an existing group.
  initialPlatform?: string;
  // When set, the platform chosen here is also applied to this existing
  // asset on save, so it joins the new entry as a nested group.
  linkAssetId?: number;
};

export const CATEGORIES = ["CASH", "GOLD", "CRYPTO", "STOCK"] as const;

const CATEGORY_ICON = {
  CASH: "cash-outline",
  GOLD: "diamond-outline",
  CRYPTO: "logo-bitcoin",
  STOCK: "trending-up-outline",
} as const;

export function AddAssetModal({
  visible,
  onClose,
  initialPlatform,
  linkAssetId,
}: Props) {
  const [category, setCategory] = useState<
    "CASH" | "GOLD" | "CRYPTO" | "STOCK"
  >("CASH");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState(initialPlatform ?? "");
  const [value, setValue] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [goal, setGoal] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [note, setNote] = useState("");
  const [isCalculate, setIsCalculate] = useState(true);
  const [platformTotal, setPlatformTotal] = useState("");
  const [useLiveGoldPrice, setUseLiveGoldPrice] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { error, isVisible, hideError, showError } = useErrorModal();

  const { mutateAsync: createAsset } = useCreateAsset();
  const { mutateAsync: updateAsset } = useUpdateAsset();
  const { data: existingAssets } = useGetAssets();

  // If this platform already holds another entry in the same category,
  // this new one will land in a multi-entry group, where profit % is
  // shown once, aggregated, on the platform card — not per entry.
  const trimmedPlatform = platform.trim().toLowerCase();
  const willBeGrouped =
    !!trimmedPlatform &&
    (existingAssets ?? []).some(
      (a) =>
        a.category === category &&
        a.platform?.trim().toLowerCase() === trimmedPlatform,
    );

  // Re-seed the form (with the requested platform) every time the modal opens.
  useEffect(() => {
    if (!visible) return;
    setCategory("CASH");
    setName("");
    setPlatform(initialPlatform ?? "");
    setValue("");
    setQuantity("");
    setUnit("");
    setGoal("");
    setCostBasis("");
    setNote("");
    setIsCalculate(true);
    setPlatformTotal("");
    setUseLiveGoldPrice(false);
    setShowDetails(false);
  }, [visible, initialPlatform]);

  // Live gold pricing only applies to GOLD — drop it if the category changes.
  useEffect(() => {
    if (category !== "GOLD") setUseLiveGoldPrice(false);
  }, [category]);

  const handleSave = async () => {
    const data = {
      category,
      name,
      platform: platform || null,
      price:
        platformTotal || useLiveGoldPrice
          ? null
          : value
            ? Number(value)
            : null,
      quantity: quantity ? Number(quantity) : null,
      unit: useLiveGoldPrice ? "gram" : unit || "",
      goal: goal ? Number(goal) : null,
      cost_basis: costBasis ? Number(costBasis) : null,
      note: note || null,
      is_calculate: isCalculate,
      platform_total: platformTotal ? Number(platformTotal) : null,
      use_live_gold_price: useLiveGoldPrice,
    };

    try {
      await createAsset(data);
      if (linkAssetId && platform) {
        await updateAsset({ id: linkAssetId, platform });
      }
      onClose();
    } catch (error: any) {
      const apiError = error?.response?.data ?? {
        message: error?.message ?? "Unknown error",
      };

      showError(apiError);
    }
  };

  const disabled =
    !name ||
    (!platformTotal && !value && !useLiveGoldPrice) ||
    (!!platformTotal && !platform) ||
    (useLiveGoldPrice && !quantity);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="New Asset"
      subtitle="Add a new investment to track"
      footer={
        <View className="flex-row gap-3">
          <Button label="Cancel" variant="outline" className="flex-1" onPress={onClose} />
          <Button
            label="Create Asset"
            variant="primary"
            className="flex-1"
            disabled={disabled}
            onPress={handleSave}
          />
        </View>
      }
    >
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />

      {/* Category Selector */}
      <View className="mb-4">
        <Text className="font-mono text-[12px] font-bold text-mist mb-3 uppercase tracking-wider">
          Asset Category
        </Text>
        <ChipGroup
          options={CATEGORIES.map((item) => ({
            value: item,
            label: item,
            icon: CATEGORY_ICON[item],
          }))}
          value={category}
          onChange={setCategory}
        />
      </View>

      {/* Asset Name */}
      <View className="mb-3">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
          Asset Name
        </Text>
        <TextField
          placeholder="e.g., Apple Stock, Bitcoin"
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Platform */}
      <View className="mb-3">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
          Platform / Account
        </Text>
        <TextField
          placeholder="e.g., Maybank, Touch 'n Go, Luno"
          value={platform}
          onChangeText={setPlatform}
        />
        <Text className="font-sans text-[10px] text-fog mt-1.5">
          Where this asset is held — used to break down zakat
          withdrawals per platform
        </Text>
      </View>

      {/* Gold weight + live pricing */}
      {category === "GOLD" && (
        <View className="mb-3">
          <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
            Weight (grams)
          </Text>
          <TextField
            placeholder="e.g., 42"
            keyboardType="decimal-pad"
            value={quantity}
            onChangeText={setQuantity}
          />
          <TouchableOpacity
            onPress={() => quantity && setUseLiveGoldPrice((prev) => !prev)}
            disabled={!quantity}
            className={`mt-3 flex-row items-center justify-between rounded-input border px-3 py-2.5 ${
              useLiveGoldPrice
                ? "border-glass-edge bg-luminous-fill"
                : "border-white/[0.06] bg-white/5"
            } ${!quantity ? "opacity-50" : ""}`}
          >
            <View className="flex-1 pr-3">
              <Text className="font-sans text-[12px] font-bold text-white">
                Use Live Gold Price
              </Text>
              <Text className="font-sans text-[10px] text-fog mt-0.5">
                {quantity
                  ? "Value updates daily from Bank Negara Malaysia's gold price — no need to update it yourself"
                  : "Enter weight above first"}
              </Text>
            </View>
            <Switch
              value={useLiveGoldPrice}
              onValueChange={setUseLiveGoldPrice}
              disabled={!quantity}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Current Value */}
      <View className="mb-3">
        <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
          Current Value (RM)
        </Text>
        {platformTotal ? (
          <View className="rounded-input border border-white/[0.06] px-3 py-2 bg-white/5">
            <Text className="font-sans text-[13px] text-fog">
              Auto-computed from platform total below
            </Text>
          </View>
        ) : useLiveGoldPrice ? (
          <View className="rounded-input border border-white/[0.06] px-3 py-2 bg-white/5">
            <Text className="font-sans text-[13px] text-fog">
              Auto-computed from live gold price × weight
            </Text>
          </View>
        ) : (
          <TextField
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
          />
        )}
      </View>

      {/* Advanced details toggle */}
      <TouchableOpacity
        onPress={() => setShowDetails((prev) => !prev)}
        className="mb-4 flex-row items-center justify-between rounded-input border border-white/[0.06] bg-white/5 px-3 py-2.5"
      >
        <Text className="font-sans text-[12px] font-bold text-mist">
          Add more details
        </Text>
        <Ionicons
          name={showDetails ? "chevron-up-outline" : "chevron-down-outline"}
          size={16}
          color="#9da7ba"
        />
      </TouchableOpacity>

      {showDetails && (
        <>
          {/* Quantity & Unit (optional context) — gold has its own
              dedicated Weight field above instead, so it's not
              duplicated here. */}
          {category !== "GOLD" && (
            <View className="mb-3 flex-row gap-3">
              <View className="flex-1">
                <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
                  Quantity (Optional)
                </Text>
                <TextField
                  placeholder="e.g., 15"
                  keyboardType="decimal-pad"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View className="flex-1">
                <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
                  Unit
                </Text>
                <TextField
                  placeholder="e.g., gram, BTC, shares"
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>
          )}

          {/* Cost Basis */}
          <View className="mb-4">
            <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
              Cost Basis (Optional)
            </Text>
            <TextField
              placeholder="How much you paid in total (RM)"
              keyboardType="decimal-pad"
              value={costBasis}
              onChangeText={setCostBasis}
            />
            <Text className="font-sans text-[10px] text-fog mt-1.5">
              {willBeGrouped
                ? "This platform already has other entries — profit % will show combined on the platform card instead of here."
                : "Used to calculate your profit % — leave empty to skip"}
            </Text>
          </View>

          {/* Goal (Optional) */}
          <View className="mb-4">
            <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
              Goal Amount (Optional)
            </Text>
            <TextField
              placeholder="Target amount to reach"
              keyboardType="decimal-pad"
              value={goal}
              onChangeText={setGoal}
            />
            <Text className="font-sans text-[10px] text-fog mt-1.5">
              Leave empty if you don&apos;t have a specific goal
            </Text>
          </View>

          {/* Note */}
          <View className="mb-4">
            <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
              Note (Optional)
            </Text>
            <TextField
              placeholder="e.g., Holding for Ali, repay by Sept"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
              style={{ minHeight: 56, textAlignVertical: "top" }}
            />
          </View>

          {/* Platform Total (auto-computed balance) */}
          <View className="mb-4">
            <Text className="font-mono text-[12px] font-bold text-mist mb-2 uppercase tracking-wider">
              Platform Total (Optional)
            </Text>
            <TextField
              placeholder="e.g., 433 — TNG eWallet's real balance"
              keyboardType="decimal-pad"
              value={platformTotal}
              onChangeText={setPlatformTotal}
              editable={!!platform}
              className={!platform ? "opacity-50" : ""}
            />
            <Text className="font-sans text-[10px] text-fog mt-1.5">
              {platform
                ? "Marks this as Platform's real total — its value becomes this total minus your other entries on the same platform. Use it for a balance that moves on its own, like interest."
                : "Set a Platform above first"}
            </Text>
          </View>

          {/* Include in Zakat calculation */}
          <View className="mb-5 flex-row items-center justify-between rounded-input border border-white/[0.06] bg-white/5 px-3 py-3">
            <View className="flex-1 pr-3">
              <Text className="font-sans text-[12px] font-bold text-white">
                Include in Zakat Calculation
              </Text>
              <Text className="font-sans text-[10px] text-fog mt-0.5">
                Turn off if this is money you&apos;re holding for someone
                else
              </Text>
            </View>
            <Switch value={isCalculate} onValueChange={setIsCalculate} />
          </View>
        </>
      )}
    </BottomSheetModal>
  );
}
