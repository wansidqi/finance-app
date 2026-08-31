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
        <View className="h-[50%] rounded-t-3xl bg-slate-900 border-t border-slate-700 pt-5 pb-8 px-5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-white text-[17px] font-bold">
              Nisab by State
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <Text className="text-slate-400 text-[11px] mb-4">
            Live rates scraped from each state&apos;s zakat authority, with a
            Gemini-estimated fallback where scraping isn&apos;t available
          </Text>

          {isLoading ? (
            <View className="py-10 items-center">
              <ActivityIndicator color="#34d399" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {MALAYSIA_STATES.map((stateKey) => {
                const rate = rateByState.get(stateKey);

                return (
                  <View
                    key={stateKey}
                    className="mb-3 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-white text-[13px] font-semibold">
                          {MALAYSIA_STATE_LABELS[stateKey]}
                        </Text>
                        {rate?.zakatAgency && (
                          <Text className="text-slate-500 text-[10px] mt-0.5">
                            {rate.zakatAgency}
                          </Text>
                        )}
                      </View>

                      {rate ? (
                        <View className="items-end">
                          <Text
                            className={`text-[15px] font-bold ${rate.isScraped ? "text-emerald-400" : "text-indigo-400"}`}
                          >
                            RM{rate.nisabRM.toLocaleString()}
                          </Text>
                          <Text className="text-slate-500 text-[10px] mt-0.5">
                            {rate.isScraped ? "Checked" : "AI estimate ·"} {formatAsOf(rate.asOf)}
                          </Text>
                        </View>
                      ) : (
                        <View className="items-end">
                          <Text className="text-slate-500 text-[11px] font-semibold">
                            Unavailable
                          </Text>
                        </View>
                      )}
                    </View>

                    {rate?.goldUrufWornGrams != null && (
                      <Text className="text-slate-500 text-[10px] mt-2">
                        Worn-jewelry (uruf) exemption: {rate.goldUrufWornGrams}g
                      </Text>
                    )}
                    {!rate && (
                      <Text className="text-rose-400/80 text-[10px] mt-2">
                        Not available yet — falling back to PPZ-MAIWP&apos;s
                        rate
                      </Text>
                    )}
                    {rate && !rate.isScraped && (
                      <Text className="text-indigo-400/70 text-[10px] mt-2">
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
