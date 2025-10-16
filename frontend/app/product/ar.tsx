import React, { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
	Viro3DObject,
	ViroAmbientLight,
	ViroARPlane,
	ViroARScene,
	ViroARSceneNavigator,
	ViroClickStateTypes,
	ViroMaterials,
	ViroQuad,
	ViroARPlaneSelector,
} from "@reactvision/react-viro";
import FloatingBackButton from "@/components/Shared/FloatingBackButton";
import { Viro3DPoint } from "@reactvision/react-viro/dist/components/Types/ViroUtils";
import { View, Text, StyleSheet, Alert, Platform } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

ViroMaterials.createMaterials({
	QuadMaterial: {
		lightingModel: "Constant",
		diffuseColor: "#888",
	},
});

function Scene({ modelUrl }: { modelUrl: string }) {
	const [position, setPosition] = useState<Viro3DPoint | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Check if model URL is valid
		if (!modelUrl || modelUrl.trim() === '') {
			setError('No 3D model available for this product');
			return;
		}

		setIsLoading(true);
		setError(null);

		// Simulate loading time for better UX
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 1000);

		return () => clearTimeout(timer);
	}, [modelUrl]);

	if (error) {
		return (
			<ViroARScene>
				<ViroAmbientLight color="white" />
				<ViroQuad
					position={[0, 0, -1]}
					width={2}
					height={1}
					materials={["QuadMaterial"]}
				/>
				<ViroQuad
					position={[0, 0.5, -0.9]}
					width={1.5}
					height={0.3}
					materials={["QuadMaterial"]}
				/>
			</ViroARScene>
		);
	}

	return (
		<ViroARScene>
			<ViroAmbientLight color="white" />
			<ViroARPlane>
		<Viro3DObject
			visible={!!position && !isLoading}
			source={{ uri: modelUrl }}
			position={position ?? [0, 0, 0]}
			scale={[1, 1, 1]}
			type="GLB"
			dragType="FixedToWorld"
			onDrag={() => {}}
			onLoadStart={() => {
				console.log('Starting to load 3D model:', modelUrl);
			}}
			onLoadEnd={() => {
				console.log('Finished loading 3D model');
				setIsLoading(false);
			}}
			onError={(error) => {
				console.error('Error loading 3D model:', error);
				setError('Failed to load 3D model. Please check your internet connection.');
			}}
		/>
				<ViroQuad
					visible={!position || isLoading}
					position={[0, 0, 0]}
					width={1}
					height={1}
					rotation={[-90, 0, 0]}
					materials={["QuadMaterial"]}
					onClickState={(state, position) => {
						if (state === ViroClickStateTypes.CLICKED && !isLoading) {
							setPosition(position);
						}
					}}
				/>
			</ViroARPlane>
		</ViroARScene>
	);
}

function ErrorFallback() {
	const { theme } = useTheme();

	return (
		<View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
			<Text style={[styles.errorTitle, { color: theme.colors.text }]}>
				3D Preview Unavailable
			</Text>
			<Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
				AR functionality is not supported on this device or the 3D model is not available.
			</Text>
			<FloatingBackButton onPress={router.back} />
		</View>
	);
}

export default function ProductARScreen() {
	const { modelUrl } = useLocalSearchParams<{ modelUrl: string }>();
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		// Check if we're on a platform that supports Viro
		if (Platform.OS === 'web') {
			setHasError(true);
			return;
		}

		// Check if model URL is provided
		if (!modelUrl || modelUrl.trim() === '') {
			Alert.alert(
				'Model Not Available',
				'No 3D model is available for this product.',
				[{ text: 'OK', onPress: () => router.back() }]
			);
			return;
		}
	}, [modelUrl]);

	if (hasError) {
		return <ErrorFallback />;
	}

	return (
		<>
			<FloatingBackButton onPress={router.back} />
			<ViroARSceneNavigator
				initialScene={{ scene: () => <Scene modelUrl={modelUrl} /> }}
				onError={(error) => {
					console.error('Viro AR Error:', error);
					setHasError(true);
				}}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	errorTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 12,
		textAlign: 'center',
	},
	errorText: {
		fontSize: 16,
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 20,
	},
});
