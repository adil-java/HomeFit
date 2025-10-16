import React, { useState } from "react";
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
} from "@reactvision/react-viro";
import FloatingBackButton from "@/components/Shared/FloatingBackButton";
import { Viro3DPoint } from "@reactvision/react-viro/dist/components/Types/ViroUtils";

ViroMaterials.createMaterials({
	QuadMaterial: {
		lightingModel: "Constant",
		diffuseColor: "#888",
	},
});

function Scene({ modelUrl }: { modelUrl: string }) {
	const [position, setPosition] = useState<Viro3DPoint | null>(null);

	return (
		<ViroARScene>
			<ViroAmbientLight color="white" />
			<ViroARPlane dragType="FixedToWorld">
				<Viro3DObject
					visible={!!position}
					source={{ uri: modelUrl }}
					position={position ?? [0, 0, 0]}
					scale={[1, 1, 1]}
					type="GLB"
					dragType="FixedToWorld"
					onDrag={() => {}}
				/>
				<ViroQuad
					visible={!position}
					position={[0, 0, 0]}
					width={1}
					height={1}
					rotation={[-90, 0, 0]}
					materials="QuadMaterial"
					onClickState={(state, position) => {
						if (state === ViroClickStateTypes.CLICKED) {
							setPosition(position);
						}
					}}
				/>
			</ViroARPlane>
		</ViroARScene>
	);
}

export default function ProductARScreen() {
	const { modelUrl } = useLocalSearchParams<{ modelUrl: string }>();

	return (
		<>
			<FloatingBackButton onPress={router.back} />
			<ViroARSceneNavigator
				initialScene={{ scene: () => <Scene modelUrl={modelUrl} /> }}
			/>
		</>
	);
}
