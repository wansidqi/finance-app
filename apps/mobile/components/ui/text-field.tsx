import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { forwardRef, useState } from "react";
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";

interface TextFieldProps extends TextInputProps {
  prefix?: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  // Shows a trailing clear (x) button whenever there's a value to clear.
  onClear?: () => void;
  className?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ prefix, icon, onClear, className = "", style, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <View
        className={`flex-row items-center rounded-input border bg-white/5 px-3 ${focused ? "border-glass-edge" : "border-white/[0.06]"} ${className}`}
      >
        {icon && (
          <Ionicons name={icon} size={16} color="#9da7ba" style={{ marginRight: 8 }} />
        )}
        {prefix && (
          <Text className="font-sans text-[14px] text-fog mr-1">{prefix}</Text>
        )}
        <TextInput
          ref={ref}
          className="flex-1 font-sans text-[14px] text-white py-2.5"
          placeholderTextColor="#9da7ba"
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={style}
          {...props}
        />
        {onClear && !!props.value && (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear"
          >
            <Ionicons name="close-circle-outline" size={16} color="#9da7ba" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);
TextField.displayName = "TextField";
