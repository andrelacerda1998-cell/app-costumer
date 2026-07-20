import { TouchableOpacity, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { FontAwesome } from "@expo/vector-icons";
import { Colors } from "react-native/Libraries/NewAppScreen";

const Checkbox = ({
  label,
  checked,
  onChange,
  touchableClasses,
  ...props
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  touchableClasses?: string;
}) => {
  return (
    <TouchableOpacity
      className={`flex-row items-center ${touchableClasses}`}
      onPress={onChange}
      {...props}
    >
      <View
        className={`w-5 h-5 rounded-md flex justify-center items-center mr-2 ${
          checked ? 'bg-primary' : 'border-2 border-gray_light'
        }`}
      >
        {checked && (
          <FontAwesome name="check" size={14} color={Colors.secondary} />
        )}
      </View>
      <ThemedText type="defaultSemiBold" color={Colors.secondary}>{label}</ThemedText>
    </TouchableOpacity>
  );
};

export default Checkbox;