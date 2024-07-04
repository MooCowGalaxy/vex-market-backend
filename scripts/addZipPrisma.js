const { PrismaClient } = require('@prisma/client');
const cities = require('../data/USCities.json');

const prisma = new PrismaClient();

async function main() {
    let data = [];

    for (const city of cities) {
        if (typeof city.latitude !== 'string') data.push({
            zip: city.zip_code,
            city: city.city,
            state: city.state,
            latitude: city.latitude,
            longitude: city.longitude
        });
    }

    await prisma.zip.createMany({
        data
    });
    console.log('done');
}
main().then();