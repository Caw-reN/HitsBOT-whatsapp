-- CreateTable
CREATE TABLE `Admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Admin_username_key`(`username`),
    INDEX `Admin_username_idx`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BotConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `botName` VARCHAR(100) NOT NULL DEFAULT 'HiTsBOT Agent',
    `waNumber` VARCHAR(20) NULL,
    `waStatus` VARCHAR(191) NOT NULL DEFAULT 'DISCONNECTED',
    `aiProvider` VARCHAR(191) NOT NULL DEFAULT 'gemini',
    `aiApiKey` VARCHAR(255) NULL,
    `systemInstruction` TEXT NULL,
    `aiTemperature` DOUBLE NOT NULL DEFAULT 0.1,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BotConfig_waNumber_key`(`waNumber`),
    INDEX `BotConfig_waNumber_idx`(`waNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
