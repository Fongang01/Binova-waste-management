-- CreateEnum
CREATE TYPE "TruckStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BinStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DAMAGED', 'REMOVED');

-- CreateEnum
CREATE TYPE "CollectionTaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CollectionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'AI_RECOMMENDATION');

-- CreateEnum
CREATE TYPE "SensorType" AS ENUM ('ULTRASONIC');

-- CreateEnum
CREATE TYPE "SensorStatus" AS ENUM ('ONLINE', 'OFFLINE', 'FAULTY');

-- CreateTable
CREATE TABLE "Truck" (
    "id" SERIAL NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "status" "TruckStatus" NOT NULL DEFAULT 'AVAILABLE',
    "driverId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bin" (
    "id" SERIAL NOT NULL,
    "binCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "capacity" DOUBLE PRECISION NOT NULL,
    "currentFillLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BinStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionTask" (
    "id" SERIAL NOT NULL,
    "binId" INTEGER NOT NULL,
    "driverId" INTEGER,
    "truckId" INTEGER,
    "status" "CollectionTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "CollectionPriority" NOT NULL DEFAULT 'NORMAL',
    "source" "TaskSource" NOT NULL DEFAULT 'MANUAL',
    "recommendedRoute" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "estimatedDuration" INTEGER,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionHistory" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "binId" INTEGER NOT NULL,
    "driverId" INTEGER,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fillLevelBefore" DOUBLE PRECISION,
    "fillLevelAfter" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "CollectionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorReading" (
    "id" SERIAL NOT NULL,
    "binId" INTEGER NOT NULL,
    "sensorType" "SensorType" NOT NULL DEFAULT 'ULTRASONIC',
    "status" "SensorStatus" NOT NULL DEFAULT 'ONLINE',
    "fillLevel" DOUBLE PRECISION,
    "distanceCm" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Truck_registrationNumber_key" ON "Truck"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_driverId_key" ON "Truck"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Bin_binCode_key" ON "Bin"("binCode");

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTask" ADD CONSTRAINT "CollectionTask_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTask" ADD CONSTRAINT "CollectionTask_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTask" ADD CONSTRAINT "CollectionTask_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionHistory" ADD CONSTRAINT "CollectionHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CollectionTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionHistory" ADD CONSTRAINT "CollectionHistory_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionHistory" ADD CONSTRAINT "CollectionHistory_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
