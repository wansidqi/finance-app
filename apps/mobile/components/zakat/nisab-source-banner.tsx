import { DetectedLocation, MALAYSIA_STATE_LABELS } from "@/interface/nisab-state";
import { ZakatTrackerDto } from "@/interface/zakat";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

function BannerActions({
  onDetect,
  isDetecting,
  onShowStateList,
}: {
  onDetect: () => void;
  isDetecting: boolean;
  onShowStateList: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <TouchableOpacity onPress={onDetect} disabled={isDetecting} hitSlop={8}>
        {isDetecting ? (
          <ActivityIndicator size="small" color="#34d399" />
        ) : (
          <Ionicons name="reload" size={16} color="#94a3b8" />
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={onShowStateList} hitSlop={8}>
        <Ionicons name="list" size={17} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );
}

// Bare content row, no outer box/margin — the caller (currently the
// Dashboard's Nisab Status card) supplies the surrounding box so this can be
// composed alongside other content (totals, a "view details" link) inside
// one shared card instead of stacking separate bordered boxes.
export function NisabSourceBanner({
  source,
  detectedLocation,
  onDetect,
  isDetecting,
  onShowStateList,
}: {
  source: ZakatTrackerDto["nisab_source"] | undefined;
  detectedLocation: DetectedLocation | null;
  onDetect: () => void;
  isDetecting: boolean;
  onShowStateList: () => void;
}) {
  if (!source) return null;

  if (source.kind === "state") {
    const asOf = new Date(source.asOf).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return (
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[11px] text-slate-300">
            Nisab from {MALAYSIA_STATE_LABELS[source.state]}&apos;s zakat authority
          </Text>
          <Text className="text-[10px] text-slate-500 mt-0.5">
            Checked {asOf}
          </Text>
        </View>
        <BannerActions
          onDetect={onDetect}
          isDetecting={isDetecting}
          onShowStateList={onShowStateList}
        />
      </View>
    );
  }

  if (source.kind === "ppz_fallback") {
    const asOf = new Date(source.asOf).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const detectedState = detectedLocation?.state
      ? `${MALAYSIA_STATE_LABELS[detectedLocation.state]}'s own rate isn't available yet — using`
      : "Using";
    return (
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[11px] text-slate-300">
            {detectedState} PPZ-MAIWP&apos;s published rate
          </Text>
          <Text className="text-[10px] text-slate-500 mt-0.5">
            Checked {asOf}
          </Text>
        </View>
        <BannerActions
          onDetect={onDetect}
          isDetecting={isDetecting}
          onShowStateList={onShowStateList}
        />
      </View>
    );
  }

  // gold_price fallback — but *why* varies, and the difference matters:
  // never detected vs. detected-but-unsupported look identical from the
  // resolved nisab alone, so without this the banner never visibly changes
  // after tapping "detect", which reads as "the tap did nothing."
  let title = "Using nationwide gold-price nisab";
  let subtitle = "Detect your state for its official nisab rate";

  if (detectedLocation) {
    if (detectedLocation.method === "unavailable") {
      title = "Couldn't detect your location";
      subtitle = "Check that location access is allowed for this app, then try again";
    } else if (detectedLocation.state) {
      title = `Detected: ${MALAYSIA_STATE_LABELS[detectedLocation.state]}`;
      subtitle = "This state's official rate isn't available yet — using nationwide gold-price nisab";
    } else {
      title = "Couldn't match your location to a state";
      subtitle = "Using nationwide gold-price nisab";
    }
  }

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        <Text className="text-[11px] text-slate-300">{title}</Text>
        <Text className="text-[10px] text-slate-500 mt-0.5">{subtitle}</Text>
      </View>
      <BannerActions
        onDetect={onDetect}
        isDetecting={isDetecting}
        onShowStateList={onShowStateList}
      />
    </View>
  );
}
