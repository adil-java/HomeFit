import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { Client } from "@gradio/client";
import axios from "axios";
import { uploadToCloudinary } from '../utils/cloudinary.js';
import logger from '../utils/logger.js';

const app = express();
const upload = multer({ dest: "uploads/" });


const OUTPUT_DIR = path.resolve("models");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });


const SPACE_ID = "frogleo/Image-to-3D";
const SPACE_URL = "https://frogleo-image-to-3d.hf.space";


export const generate3DModel = async (imagePath) => {
  try {
    logger.debug("Sending image to Hugging Face Space...");
    logger.debug("Image path:", imagePath);


    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const client = await Client.connect(SPACE_ID);
    const imageBlob = fs.readFileSync(imagePath);

    logger.debug(" Uploading image to Hugging Face API...");


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

    logger.debug("Hugging Face API completed");
    logger.debug("API Response:", JSON.stringify(result.data, null, 2));

    const [html, , glbPath, objPath] = result.data;

    if (!glbPath || !objPath) {
      throw new Error("Hugging Face API did not return valid model paths");
    }

    const glbUrl = `${SPACE_URL}${glbPath}`;
    const objUrl = `${SPACE_URL}${objPath}`;

    logger.debug("Model URLs from Hugging Face:");
    logger.debug("  - GLB:", glbUrl);
    logger.debug("  - OBJ:", objUrl);

   
    const glbFile = path.join(OUTPUT_DIR, `model_${Date.now()}.glb`);
    const objFile = path.join(OUTPUT_DIR, `model_${Date.now()}.obj`);

    logger.debug("Downloading model files");
    await downloadFile(glbUrl, glbFile);
    await downloadFile(objUrl, objFile);


    logger.debug(" Uploading models to Cloudinary");
    const [glbUpload, objUpload] = await Promise.all([
      uploadToCloudinary(glbFile, 'ecommerce/3d-models'),
      uploadToCloudinary(objFile, 'ecommerce/3d-models')
    ]);

    logger.debug("3D models uploaded to Cloudinary:");
    logger.debug("  - GLB URL:", glbUpload.url);
    logger.debug("  - OBJ URL:", objUpload.url);


    logger.debug("Cleaning up local model files");
    try {
      fs.unlinkSync(glbFile);
      fs.unlinkSync(objFile);
      logger.debug(" Local model files cleaned up");
    } catch (cleanupError) {
      logger.warn("Failed to cleanup model files:", cleanupError.message);
    }

    return {
      glbUrl: glbUpload.url,
      objUrl: objUpload.url,
      glbPublicId: glbUpload.public_id,
      objPublicId: objUpload.public_id,
    };
  } catch (err) {
    logger.error("Error in 3D model generation:", err);
    logger.error("Error stack:", err.stack);

    logger.debug(" Cleaning up local model files due to error...");
    try {
      if (fs.existsSync(glbFile)) fs.unlinkSync(glbFile);
      if (fs.existsSync(objFile)) fs.unlinkSync(objFile);
      logger.debug("Local model files cleaned up after error");
    } catch (cleanupError) {
      logger.warn("Failed to cleanup model files after error:", cleanupError.message);
    }

    throw new Error(err.message || "Failed to generate 3D model");
  }
};


async function downloadFile(url, filepath) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(filepath, response.data);
  logger.debug(`Saved: ${filepath}`);
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
    logger.error("Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to generate 3D model",
    });
  }
};
