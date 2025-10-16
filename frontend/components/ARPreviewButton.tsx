import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export const ARPreviewButton = ({ onPress }: { onPress: () => void }) => {
	const { theme } = useTheme();
	const [isCheckingSupport, setIsCheckingSupport] = useState(false);

	const handlePress = async () => {
		setIsCheckingSupport(true);

		try {
			// Check if device supports AR
			if (Platform.OS === 'web') {
				Alert.alert(
					'AR Not Supported',
					'3D preview is not available on web browsers. Please use a mobile device with AR capabilities.',
					[{ text: 'OK' }]
				);
				return;
			}

			// For iOS and Android, check basic requirements
			if (Platform.OS === 'ios' || Platform.OS === 'android') {
				// Viro React requires camera permissions and AR capabilities
				// We'll let the AR screen handle the detailed checks
				onPress();
			} else {
				Alert.alert(
					'AR Not Supported',
					'3D preview is not supported on this platform.',
					[{ text: 'OK' }]
				);
			}
		} catch (error) {
			console.error('Error checking AR support:', error);
			Alert.alert(
				'Error',
				'Unable to check AR support. Please try again.',
				[{ text: 'OK' }]
			);
		} finally {
			setIsCheckingSupport(false);
		}
	};

	return (
		<TouchableOpacity
			style={[
				styles.button,
				{
					backgroundColor: isCheckingSupport ? theme.colors.border : theme.colors.primary,
					opacity: isCheckingSupport ? 0.7 : 1,
				}
			]}
			onPress={handlePress}
			disabled={isCheckingSupport}
			activeOpacity={0.8}
		>
			<View style={styles.buttonContent}>
				<Ionicons
					name={isCheckingSupport ? "ellipsis-horizontal" : "cube-outline"}
					size={20}
					color="white"
				/>
				<Text style={styles.buttonText}>
					{isCheckingSupport ? 'Checking...' : 'Preview in 3D'}
				</Text>
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 25,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	buttonContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	buttonText: {
		color: 'white',
		marginLeft: 8,
		fontWeight: '600',
		fontSize: 16,
	},
});
