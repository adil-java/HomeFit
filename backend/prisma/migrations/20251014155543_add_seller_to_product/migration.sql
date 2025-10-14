/*
  Warnings:

  - The primary key for the `_ProductCategories` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `Product` ADD COLUMN `sellerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `_ProductCategories` DROP PRIMARY KEY;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
