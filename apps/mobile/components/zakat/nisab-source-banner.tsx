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
      <TouchableOpacity
        onPress={onDetect}
        disabled={isDetecting}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Detect my location"
      >
        {isDetecting ? (
          <ActivityIndicator size="small" color="#d1e4fa" />
        ) : (
          <Ionicons name="reload-outline" size={16} color="#9da7ba" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onShowStateList}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Show all state nisab rates"
      >
        <Ionicons name="list-outline" size={17} color="#9da7ba" />
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
          <Text className="font-sans text-[11px] text-mist">
            Nisab from {MALAYSIA_STATE_LABELS[source.state]}&apos;s zakat authority
          </Text>
          <Text className="font-sans text-[10px] text-fog mt-0.5">
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

  if (source.kind === "ai_fallback") {
    const asOf = new Date(source.asOf).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return (
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-sans text-[11px] text-mist">
            Nisab from an AI summary for {MALAYSIA_STATE_LABELS[source.state]}
          </Text>
          <Text className="font-sans text-[10px] text-fog mt-0.5">
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
          <Text className="font-sans text-[11px] text-mist">
            {detectedState} PPZ-MAIWP&apos;s published rate
          </Text>
          <Text className="font-sans text-[10px] text-fog mt-0.5">
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

  // "unavailable" — but *why* varies, and the difference matters: never
  // detected vs. detected-but-unsupported look identical from the resolved
  // nisab alone, so without this the banner never visibly changes after
  // tapping "detect", which reads as "the tap did nothing." No computed
  // fallback (e.g. a nationwide gold-price nisab) stands in here — a
  // specific-looking number with no real source behind it was judged more
  // confusing than plainly saying nisab isn't available yet.
  let title = "Nisab unavailable";
  let subtitle = "Detect your state, or check back shortly";

  if (detectedLocation) {
    if (detectedLocation.method === "unavailable") {
      title = "Couldn't detect your location";
      subtitle = "Check that location access is allowed for this app, then try again";
    } else if (detectedLocation.state) {
      title = `Detected: ${MALAYSIA_STATE_LABELS[detectedLocation.state]}`;
      subtitle = "Nisab unavailable for this state right now — check back shortly";
    } else {
      title = "Couldn't match your location to a state";
      subtitle = "Nisab unavailable right now — check back shortly";
    }
  }

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        <Text className="font-sans text-[11px] text-mist">{title}</Text>
        <Text className="font-sans text-[10px] text-fog mt-0.5">{subtitle}</Text>
      </View>
      <BannerActions
        onDetect={onDetect}
        isDetecting={isDetecting}
        onShowStateList={onShowStateList}
      />
    </View>
  );
}
