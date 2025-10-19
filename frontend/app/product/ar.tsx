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
	ViroText,
} from "@reactvision/react-viro";
import FloatingBackButton from "@/components/Shared/FloatingBackButton";
import ErrorBoundary from "@/components/ErrorBoundary";
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
	const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
	const [scale, setScale] = useState<[number, number, number]>([1, 1, 1]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPositionFixed, setIsPositionFixed] = useState(false);

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

	// Helper functions for model controls
	const rotateLeft = () => setRotation(prev => [prev[0], prev[1] - 15, prev[2]]);
	const rotateRight = () => setRotation(prev => [prev[0], prev[1] + 15, prev[2]]);
	const rotateUp = () => setRotation(prev => [prev[0] - 15, prev[1], prev[2]]);
	const rotateDown = () => setRotation(prev => [prev[0] + 15, prev[1], prev[2]]);
	const zoomIn = () => setScale(prev => [prev[0] * 1.2, prev[1] * 1.2, prev[2] * 1.2]);
	const zoomOut = () => setScale(prev => [Math.max(0.1, prev[0] * 0.8), Math.max(0.1, prev[1] * 0.8), Math.max(0.1, prev[2] * 0.8)]);
	const moveUp = () => setPosition(prev => prev ? [prev[0], prev[1] + 0.1, prev[2]] : [0, 0.1, 0]);
	const moveDown = () => setPosition(prev => prev ? [prev[0], prev[1] - 0.1, prev[2]] : [0, -0.1, 0]);
	const moveLeft = () => setPosition(prev => prev ? [prev[0] - 0.1, prev[1], prev[2]] : [-0.1, 0, 0]);
	const moveRight = () => setPosition(prev => prev ? [prev[0] + 0.1, prev[1], prev[2]] : [0.1, 0, 0]);
	const fixPosition = () => setIsPositionFixed(!isPositionFixed);
	const resetModel = () => {
		setRotation([0, 0, 0]);
		setScale([1, 1, 1]);
		setPosition(null);
		setIsPositionFixed(false);
	};

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
			rotation={rotation}
			scale={scale}
			type="GLB"
			dragType={!isPositionFixed ? "FixedToWorld" : undefined}
			onDrag={(dragToPos, source) => {
				if (!isPositionFixed) {
					setPosition(dragToPos);
				}
			}}
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

			{/* Control Panel Overlay - Properly positioned in 3D space */}
			{/* Rotation Controls Row */}
			<ViroQuad
				position={[-1.2, 0.5, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						rotateLeft();
					}
				}}
			/>
			<ViroText
				position={[-1.2, 0.5, -1.9]}
				text="↺ Left"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			<ViroQuad
				position={[0, 0.5, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						rotateRight();
					}
				}}
			/>
			<ViroText
				position={[0, 0.5, -1.9]}
				text="↻ Right"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			{/* Up/Down Rotation Row */}
			<ViroQuad
				position={[-0.6, 0, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						rotateUp();
					}
				}}
			/>
			<ViroText
				position={[-0.6, 0, -1.9]}
				text="↑ Up"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			<ViroQuad
				position={[0.6, 0, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						rotateDown();
					}
				}}
			/>
			<ViroText
				position={[0.6, 0, -1.9]}
				text="↓ Down"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			{/* Zoom Controls Row */}
			<ViroQuad
				position={[-0.6, -0.5, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						zoomIn();
					}
				}}
			/>
			<ViroText
				position={[-0.6, -0.5, -1.9]}
				text="+ Zoom In"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			<ViroQuad
				position={[0.6, -0.5, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						zoomOut();
					}
				}}
			/>
			<ViroText
				position={[0.6, -0.5, -1.9]}
				text="- Zoom Out"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			{/* Positioning Controls Row */}
			<ViroQuad
				position={[-1.2, -1, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						moveLeft();
					}
				}}
			/>
			<ViroText
				position={[-1.2, -1, -1.9]}
				text="← Left"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			<ViroQuad
				position={[0, -1, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						moveRight();
					}
				}}
			/>
			<ViroText
				position={[0, -1, -1.9]}
				text="→ Right"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			<ViroQuad
				position={[1.2, -1, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						moveUp();
					}
				}}
			/>
			<ViroText
				position={[1.2, -1, -1.9]}
				text="↑ Up"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			<ViroQuad
				position={[2.4, -1, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						moveDown();
					}
				}}
			/>
			<ViroText
				position={[2.4, -1, -1.9]}
				text="↓ Down"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			{/* Fix Position and Reset Row */}
			<ViroQuad
				position={[-0.6, -1.5, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						fixPosition();
					}
				}}
			/>
			<ViroText
				position={[-0.6, -1.5, -1.9]}
				text={isPositionFixed ? 'Unfix' : 'Fix'}
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>

			<ViroQuad
				position={[0.6, -1.5, -2]}
				width={0.6}
				height={0.3}
				materials={["QuadMaterial"]}
				onClickState={(state) => {
					if (state === ViroClickStateTypes.CLICKED) {
						resetModel();
					}
				}}
			/>
			<ViroText
				position={[0.6, -1.5, -1.9]}
				text="Reset"
				scale={[0.3, 0.3, 0.3]}
				style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}
			/>
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
  const [controlsVisible, setControlsVisible] = useState(true);

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

	const arContent = (
		<>
			<FloatingBackButton onPress={router.back} />
			<ViroARSceneNavigator
				initialScene={{ scene: () => <Scene modelUrl={modelUrl} /> }}
			/>
		</>
	);

	return (
		<ErrorBoundary
			fallback={
				<View style={[styles.errorContainer, { backgroundColor: '#000' }]}>
					<Text style={[styles.errorTitle, { color: '#fff' }]}>
						AR Preview Unavailable
					</Text>
					<Text style={[styles.errorText, { color: '#ccc' }]}>
						Unable to load AR preview. Please try again or check your device compatibility.
					</Text>
					<FloatingBackButton onPress={router.back} />
				</View>
			}
		>
			{arContent}
		</ErrorBoundary>
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
