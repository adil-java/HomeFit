import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

interface ARPreviewButtonProps {
	modelUrl?: string | null;
}

export const ARPreviewButton = ({ modelUrl }: ARPreviewButtonProps) => {
	const { theme } = useTheme();
	const [isCheckingSupport, setIsCheckingSupport] = useState(false);

	const handlePress = async () => {
		// Check if model URL exists
		if (!modelUrl || modelUrl.trim() === '') {
			Alert.alert(
				'3D Preview Not Available',
				"This product doesn't have a 3D model yet.",
				[{ text: 'OK' }]
			);
			return;
		}

		setIsCheckingSupport(true);

		try {
			if (Constants.appOwnership === 'expo') {
				Toast.show({
					type: 'info',
					text1: 'AR Preview Unavailable',
					text2: 'Expo Go does not support AR native modules. Opening 3D viewer.',
					position: 'top',
				});
				router.push(`/product/model-viewer?modelUrl=${encodeURIComponent(modelUrl)}`);
				return;
			}

			// Check if device supports AR
			if (Platform.OS === 'web') {
				Alert.alert(
					'AR Not Supported',
					'3D preview is not available on web browsers. Please use a mobile device.',
					[{ text: 'OK' }]
				);
				return;
			}

			// Always delegate capability gating to /product/ar screen.
			// That route performs strict checks and safely falls back to 3D viewer.
			router.push(`/product/ar?modelUrl=${encodeURIComponent(modelUrl)}`);
		} catch (error) {
			console.error('Error checking AR support:', error);
			// On any error, default to the safer 3D viewer fallback
			Toast.show({
				type: 'error',
				text1: 'AR Preview Unavailable',
				text2: 'Opening 3D viewer instead.',
				position: 'top',
			});
			router.push(`/product/model-viewer?modelUrl=${encodeURIComponent(modelUrl)}`);
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
					{isCheckingSupport ? 'Loading...' : 'Preview in 3D'}
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
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 14,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
	},
	buttonContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	buttonText: {
		color: 'white',
		marginLeft: 8,
		fontWeight: '600',
		fontFamily: 'Inter_600SemiBold',
		fontSize: 16,
	},
});
