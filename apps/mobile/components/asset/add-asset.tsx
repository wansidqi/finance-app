import { useCreateAsset, useGetAssets, useUpdateAsset } from "@/services/asset";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorModal } from "../modal/error-modal";
import { useErrorModal } from "../modal/useErrorModal";

// Matches the floating tab bar height in app/(tabs)/_layout.tsx, so the
// sheet's bottom row of buttons doesn't sit underneath it.
const TAB_BAR_BASE_HEIGHT = 52;

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
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ErrorModal visible={isVisible} error={error} onClose={hideError} />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-linear-to-b from-slate-800 to-slate-900 pt-4 pb-4 max-h-[90%]"
            style={{ marginBottom: TAB_BAR_BASE_HEIGHT + insets.bottom }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 mb-4">
              <View>
                <Text className="text-[20px] font-bold text-white">
                  New Asset
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Add a new investment to track
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 rounded-full bg-slate-700/50"
              >
                <Ionicons name="close" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
              className="px-6"
            >
              {/* Category Selector */}
              <View className="mb-4">
                <Text className="text-[12px] font-bold text-slate-300 mb-3 uppercase tracking-wider">
                  Asset Category
                </Text>

                <View className="flex-row gap-2.5">
                  {CATEGORIES.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setCategory(item)}
                      className={`flex-1 rounded-lg py-2.5 border-2 ${
                        category === item
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-600 bg-slate-700/30"
                      }`}
                    >
                      <View className="items-center">
                        <Ionicons
                          name={
                            item === "CASH"
                              ? "cash"
                              : item === "GOLD"
                                ? "diamond"
                                : item === "CRYPTO"
                                  ? "logo-bitcoin"
                                  : "trending-up"
                          }
                          size={20}
                          color={category === item ? "#10b981" : "#94a3b8"}
                        />
                        <Text
                          className={`text-[11px] font-bold mt-1.5 ${
                            category === item
                              ? "text-emerald-400"
                              : "text-slate-300"
                          }`}
                        >
                          {item}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Asset Name */}
              <View className="mb-3">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Asset Name
                </Text>
                <TextInput
                  placeholder="e.g., Apple Stock, Bitcoin"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                />
              </View>

              {/* Platform */}
              <View className="mb-3">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Platform / Account
                </Text>
                <TextInput
                  placeholder="e.g., Maybank, Touch 'n Go, Luno"
                  value={platform}
                  onChangeText={setPlatform}
                  placeholderTextColor="#64748b"
                  className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                />
                <Text className="text-[10px] text-slate-400 mt-1.5">
                  Where this asset is held — used to break down zakat
                  withdrawals per platform
                </Text>
              </View>

              {/* Gold weight + live pricing */}
              {category === "GOLD" && (
                <View className="mb-3">
                  <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Weight (grams)
                  </Text>
                  <TextInput
                    placeholder="e.g., 42"
                    keyboardType="decimal-pad"
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholderTextColor="#64748b"
                    className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                  />
                  <TouchableOpacity
                    onPress={() => quantity && setUseLiveGoldPrice((prev) => !prev)}
                    disabled={!quantity}
                    className={`mt-3 flex-row items-center justify-between rounded-lg border px-3 py-2.5 ${
                      useLiveGoldPrice
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-600 bg-slate-700/20"
                    } ${!quantity ? "opacity-50" : ""}`}
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-[12px] font-bold text-slate-200">
                        Use Live Gold Price
                      </Text>
                      <Text className="text-[10px] text-slate-400 mt-0.5">
                        {quantity
                          ? "Value updates daily from Bank Negara Malaysia's gold price — no need to update it yourself"
                          : "Enter weight above first"}
                      </Text>
                    </View>
                    <Switch
                      value={useLiveGoldPrice}
                      onValueChange={setUseLiveGoldPrice}
                      disabled={!quantity}
                      trackColor={{ false: "#475569", true: "#10b981" }}
                      thumbColor="#ffffff"
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Current Value */}
              <View className="mb-3">
                <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Current Value (RM)
                </Text>
                {platformTotal ? (
                  <View className="rounded-lg border border-slate-700 px-3 py-2 bg-slate-800/40">
                    <Text className="text-[13px] text-slate-400">
                      Auto-computed from platform total below
                    </Text>
                  </View>
                ) : useLiveGoldPrice ? (
                  <View className="rounded-lg border border-slate-700 px-3 py-2 bg-slate-800/40">
                    <Text className="text-[13px] text-slate-400">
                      Auto-computed from live gold price × weight
                    </Text>
                  </View>
                ) : (
                  <TextInput
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={value}
                    onChangeText={setValue}
                    placeholderTextColor="#64748b"
                    className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                  />
                )}
              </View>

              {/* Advanced details toggle */}
              <TouchableOpacity
                onPress={() => setShowDetails((prev) => !prev)}
                className="mb-4 flex-row items-center justify-between rounded-lg border border-slate-600 bg-slate-700/20 px-3 py-2.5"
              >
                <Text className="text-[12px] font-bold text-slate-300">
                  Add more details
                </Text>
                <Ionicons
                  name={showDetails ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#94a3b8"
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
                        <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                          Quantity (Optional)
                        </Text>
                        <TextInput
                          placeholder="e.g., 15"
                          keyboardType="decimal-pad"
                          value={quantity}
                          onChangeText={setQuantity}
                          placeholderTextColor="#64748b"
                          className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                          Unit
                        </Text>
                        <TextInput
                          placeholder="e.g., gram, BTC, shares"
                          value={unit}
                          onChangeText={setUnit}
                          placeholderTextColor="#64748b"
                          className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                        />
                      </View>
                    </View>
                  )}

                  {/* Cost Basis */}
                  <View className="mb-4">
                    <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                      Cost Basis (Optional)
                    </Text>
                    <TextInput
                      placeholder="How much you paid in total (RM)"
                      keyboardType="decimal-pad"
                      value={costBasis}
                      onChangeText={setCostBasis}
                      placeholderTextColor="#64748b"
                      className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                    />
                    <Text className="text-[10px] text-slate-400 mt-1.5">
                      {willBeGrouped
                        ? "This platform already has other entries — profit % will show combined on the platform card instead of here."
                        : "Used to calculate your profit % — leave empty to skip"}
                    </Text>
                  </View>

                  {/* Goal (Optional) */}
                  <View className="mb-4">
                    <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                      Goal Amount (Optional)
                    </Text>
                    <TextInput
                      placeholder="Target amount to reach"
                      keyboardType="numeric"
                      value={goal}
                      onChangeText={setGoal}
                      placeholderTextColor="#64748b"
                      className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                    />
                    <Text className="text-[10px] text-slate-400 mt-1.5">
                      Leave empty if you don't have a specific goal
                    </Text>
                  </View>

                  {/* Note */}
                  <View className="mb-4">
                    <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                      Note (Optional)
                    </Text>
                    <TextInput
                      placeholder="e.g., Holding for Ali, repay by Sept"
                      value={note}
                      onChangeText={setNote}
                      multiline
                      numberOfLines={2}
                      placeholderTextColor="#64748b"
                      className="rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30"
                      style={{ minHeight: 56, textAlignVertical: "top" }}
                    />
                  </View>

                  {/* Platform Total (auto-computed balance) */}
                  <View className="mb-4">
                    <Text className="text-[12px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                      Platform Total (Optional)
                    </Text>
                    <TextInput
                      placeholder="e.g., 433 — TNG eWallet's real balance"
                      keyboardType="decimal-pad"
                      value={platformTotal}
                      onChangeText={setPlatformTotal}
                      placeholderTextColor="#64748b"
                      editable={!!platform}
                      className={`rounded-lg border border-slate-600 px-3 py-2 text-[13px] text-white bg-slate-700/30 ${
                        !platform ? "opacity-50" : ""
                      }`}
                    />
                    <Text className="text-[10px] text-slate-400 mt-1.5">
                      {platform
                        ? "Marks this as Platform's real total — its value becomes this total minus your other entries on the same platform. Use it for a balance that moves on its own, like interest."
                        : "Set a Platform above first"}
                    </Text>
                  </View>

                  {/* Include in Zakat calculation */}
                  <View className="mb-5 flex-row items-center justify-between rounded-lg border border-slate-600 bg-slate-700/30 px-3 py-3">
                    <View className="flex-1 pr-3">
                      <Text className="text-[12px] font-bold text-slate-200">
                        Include in Zakat Calculation
                      </Text>
                      <Text className="text-[10px] text-slate-400 mt-0.5">
                        Turn off if this is money you're holding for someone
                        else
                      </Text>
                    </View>
                    <Switch
                      value={isCalculate}
                      onValueChange={setIsCalculate}
                      trackColor={{ false: "#475569", true: "#10b981" }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </>
              )}

              {/* Actions */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 rounded-lg bg-slate-700/50 py-3 border border-slate-600"
                >
                  <Text className="text-center font-semibold text-slate-200 text-[14px]">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={disabled}
                  onPress={handleSave}
                  className={`flex-1 rounded-lg py-3 ${
                    disabled
                      ? "bg-slate-600/30 opacity-50"
                      : "bg-linear-to-r from-emerald-500 to-emerald-600 shadow-lg"
                  }`}
                >
                  <Text className="text-center font-semibold text-white text-[14px]">
                    Create Asset
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
