import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      paddingLeft: 20,
      paddingRight: 20,
    },
    inputContainer: {
      position: "relative",
    },
    input: {
      height: 50,
      borderWidth: 1,
      borderColor: "#fbfbfaff",
      borderRadius: 30,
      paddingLeft: 20,
      paddingRight: 60,
      fontSize: 14,
      // lineHeight: 50,
      fontFamily: "Poppins_600SemiBold",
      backgroundColor: "#fbfbfaff",
      // paddingTop: 3,

      textAlignVertical: 'center',
    },
    roundButton: {
      position: "absolute",
      right: 1,
      top: 0,
      width: 49,
      height: 49,
      borderRadius: 25,
      backgroundColor: "#FABB5B",
      justifyContent: "center",
      alignItems: "center",
    },
  });

