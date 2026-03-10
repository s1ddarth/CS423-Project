import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function ResultScreen() {
  const { latex } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recognized LaTeX:</Text>
      <Text style={styles.latex}>{latex}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  latex: {
    fontSize: 20,
  },
});