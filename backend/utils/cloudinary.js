import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import logger from './logger.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadToCloudinary = async (filePath, folder = 'ecommerce') => {
  try {
    if (!filePath) return null;
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
    });

    fs.unlinkSync(filePath);
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    logger.error('Error uploading to Cloudinary:', error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};
/**
 * Upload an image sent as a data URI ("data:image/jpeg;base64,...").
 * Used for profile photos, which the app sends already cropped and compressed.
 */
export const uploadImageDataUri = async (dataUri, folder = 'avatars') => {
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
  });
  return { url: result.secure_url, public_id: result.public_id };
};
