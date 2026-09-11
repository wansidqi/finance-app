import { MALAYSIA_STATES, MALAYSIA_STATE_LABELS, StateNisabRate } from "@/interface/nisab-state";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

interface StateNisabListModalProps {
  visible: boolean;
  onClose: () => void;
  rates: StateNisabRate[] | undefined;
  isLoading: boolean;
}

function formatAsOf(asOf: string) {
  const parsed = new Date(asOf);
  if (Number.isNaN(parsed.getTime())) return asOf;
  return parsed.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export function StateNisabListModal({
  visible,
  onClose,
  rates,
  isLoading,
}: StateNisabListModalProps) {
  const rateByState = new Map((rates ?? []).map((r) => [r.state, r]));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View className="h-[50%] rounded-t-card bg-modal-surface border-t border-glass-edge shadow-modal pt-5 pb-8 px-5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="font-display text-[17px] text-white">
              Nisab by State
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="#9da7ba" />
            </TouchableOpacity>
          </View>
          <Text className="font-sans text-fog text-[11px] mb-4">
            Live rates scraped from each state&apos;s zakat authority, with a
            Gemini-estimated fallback where scraping isn&apos;t available
          </Text>

          {isLoading ? (
            <View className="py-10 items-center">
              <ActivityIndicator color="#663af3" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {MALAYSIA_STATES.map((stateKey) => {
                const rate = rateByState.get(stateKey);

                return (
                  <View
                    key={stateKey}
                    className="mb-3 bg-glass-surface border border-glass-edge rounded-card px-4 py-3"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="font-sans text-white text-[13px] font-semibold">
                          {MALAYSIA_STATE_LABELS[stateKey]}
                        </Text>
                        {rate?.zakatAgency && (
                          <Text className="font-sans text-fog text-[10px] mt-0.5">
                            {rate.zakatAgency}
                          </Text>
                        )}
                      </View>

                      {rate ? (
                        <View className="items-end">
                          <View className="flex-row items-center gap-1">
                            <Ionicons
                              name={rate.isScraped ? "checkmark-circle-outline" : "sparkles-outline"}
                              size={12}
                              color="#d1e4fa"
                            />
                            <Text className="font-sans text-[15px] font-bold text-frost">
                              RM{rate.nisabRM.toLocaleString()}
                            </Text>
                          </View>
                          <Text className="font-sans text-fog text-[10px] mt-0.5">
                            {rate.isScraped ? "Checked" : "AI estimate ·"} {formatAsOf(rate.asOf)}
                          </Text>
                        </View>
                      ) : (
                        <View className="items-end flex-row items-center gap-1">
                          <Ionicons name="help-circle-outline" size={12} color="#9da7ba" />
                          <Text className="font-sans text-mist text-[11px] font-semibold">
                            Unavailable
                          </Text>
                        </View>
                      )}
                    </View>

                    {rate?.goldUrufWornGrams != null && (
                      <Text className="font-sans text-fog text-[10px] mt-2">
                        Worn-jewelry (uruf) exemption: {rate.goldUrufWornGrams}g
                      </Text>
                    )}
                    {!rate && (
                      <Text className="font-sans text-mist text-[10px] mt-2">
                        Not available yet — falling back to PPZ-MAIWP&apos;s
                        rate
                      </Text>
                    )}
                    {rate && !rate.isScraped && (
                      <Text className="font-sans text-mist text-[10px] mt-2">
                        No live scrape for this state — figure is Google
                        Gemini&apos;s web-search-grounded estimate, refreshed
                        monthly
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
