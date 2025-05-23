import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  healthBar: {
    width: '100%',
    height: 16,
    backgroundColor: '#ccc',
    borderColor: '#000',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  healthFill: {
    height: '100%',
    backgroundColor: '#f00',
    transitionProperty: 'width', // Not supported in RN, use Animated
  },
  combatResult: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -0.5 }, { translateY: -0.5 }], // Use Animated for real effect
    zIndex: 1000,
    padding: 15,
    fontWeight: 'bold',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    backgroundColor: '#FFF8E1', // No gradients in RN, use solid color
  },
  gildedModal: {
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    backgroundColor: '#FFF8E1',
    padding: 10,
  },
  gildedCard: {
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    backgroundColor: '#FFF8E1',
    padding: 10,
    marginVertical: 8,
  },
  travelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 10,
    // Animation: slideIn/slideOut would use Animated API
  },
  travelChibi: {
    width: 50,
    height: 50,
    marginRight: 10,
    // Animation: bounce would use Animated API
  },
}); 