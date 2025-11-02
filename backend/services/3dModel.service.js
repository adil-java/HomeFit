import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { Client } from "@gradio/client";
import axios from "axios";
import { uploadToCloudinary } from '../utils/cloudinary.js';

const app = express();
const upload = multer({ dest: "uploads/" });


const OUTPUT_DIR = path.resolve("models");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });


const SPACE_ID = "frogleo/Image-to-3D";
const SPACE_URL = "https://frogleo-image-to-3d.hf.space";


export const generate3DModel = async (imagePath) => {
  try {
    console.log("Sending image to Hugging Face Space...");
    console.log("Image path:", imagePath);


    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const client = await Client.connect(SPACE_ID);
    const imageBlob = fs.readFileSync(imagePath);

    console.log(" Uploading image to Hugging Face API...");


    const result = await client.predict("/gen_shape", {
      image: new Blob([imageBlob]),
      steps: 5,
      guidance_scale: 5.5,
      seed: 1234,
      octree_resolution: 256,
      num_chunks: 8000,
      target_face_num: 10000,
      randomize_seed: true,
    });

    console.log("Hugging Face API completed");
    console.log("API Response:", JSON.stringify(result.data, null, 2));

    const [html, , glbPath, objPath] = result.data;

    if (!glbPath || !objPath) {
      throw new Error("Hugging Face API did not return valid model paths");
    }

    const glbUrl = `${SPACE_URL}${glbPath}`;
    const objUrl = `${SPACE_URL}${objPath}`;

    console.log("Model URLs from Hugging Face:");
    console.log("  - GLB:", glbUrl);
    console.log("  - OBJ:", objUrl);

   
    const glbFile = path.join(OUTPUT_DIR, `model_${Date.now()}.glb`);
    const objFile = path.join(OUTPUT_DIR, `model_${Date.now()}.obj`);

    console.log("Downloading model files");
    await downloadFile(glbUrl, glbFile);
    await downloadFile(objUrl, objFile);


    console.log(" Uploading models to Cloudinary");
    const [glbUpload, objUpload] = await Promise.all([
      uploadToCloudinary(glbFile, 'ecommerce/3d-models'),
      uploadToCloudinary(objFile, 'ecommerce/3d-models')
    ]);

    console.log("3D models uploaded to Cloudinary:");
    console.log("  - GLB URL:", glbUpload.url);
    console.log("  - OBJ URL:", objUpload.url);


    console.log("Cleaning up local model files");
    try {
      fs.unlinkSync(glbFile);
      fs.unlinkSync(objFile);
      console.log(" Local model files cleaned up");
    } catch (cleanupError) {
      console.warn("Failed to cleanup model files:", cleanupError.message);
    }

    return {
      glbUrl: glbUpload.url,
      objUrl: objUpload.url,
      glbPublicId: glbUpload.public_id,
      objPublicId: objUpload.public_id,
    };
  } catch (err) {
    console.error("Error in 3D model generation:", err);
    console.error("Error stack:", err.stack);

    console.log(" Cleaning up local model files due to error...");
    try {
      if (fs.existsSync(glbFile)) fs.unlinkSync(glbFile);
      if (fs.existsSync(objFile)) fs.unlinkSync(objFile);
      console.log("Local model files cleaned up after error");
    } catch (cleanupError) {
      console.warn("Failed to cleanup model files after error:", cleanupError.message);
    }

    throw new Error(err.message || "Failed to generate 3D model");
  }
};


async function downloadFile(url, filepath) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(filepath, response.data);
  console.log(`Saved: ${filepath}`);
}

export const generate3DModelHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    const result = await generate3DModel(req.file.path);

    res.json({
      success: true,
      message: "3D model generated and uploaded to Cloudinary successfully!",
      model: result,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to generate 3D model",
    });
  }
};
