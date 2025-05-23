 
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, Text } from 'react-native-paper';
import { View } from 'react-native';

function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text variant="headlineMedium">Home</Text>
    </View>
  );
}
function InventoryScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text variant="headlineMedium">Inventory</Text>
    </View>
  );
}
function QuestsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text variant="headlineMedium">Quests</Text>
    </View>
  );
}
function StatsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text variant="headlineMedium">Stats</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Inventory" component={InventoryScreen} />
          <Tab.Screen name="Quests" component={QuestsScreen} />
          <Tab.Screen name="Stats" component={StatsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
} 