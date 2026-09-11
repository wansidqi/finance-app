import { Colors } from "@/constants/theme";
import { Switch as RNSwitch, SwitchProps } from "react-native";

export function Switch(props: SwitchProps) {
  return (
    <RNSwitch
      trackColor={{ false: Colors.steel, true: Colors.violet }}
      thumbColor="#ffffff"
      {...props}
    />
  );
}
