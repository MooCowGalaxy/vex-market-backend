-- CreateTable
CREATE TABLE "Zip" (
    "zip" INTEGER NOT NULL,
    "city" VARCHAR(64) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Zip_pkey" PRIMARY KEY ("zip")
);
