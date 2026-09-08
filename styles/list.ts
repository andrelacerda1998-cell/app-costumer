import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
      flex: 0.75,
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
      paddingRight: 110,
      paddingVertical: 0,
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
      backgroundColor: "#fbfbfaff",
      textAlignVertical: "center",
      marginBottom: Platform.OS === 'android' ? 15: 0
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
    clearButton: {
      position: "absolute",
      right: 56,
      top: 0,
      width: 30,
      height: 49,
      justifyContent: "center",
      alignItems: "center",
    },
  });

