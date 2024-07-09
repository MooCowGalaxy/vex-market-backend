import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch } from 'meilisearch';
import { User } from '@prisma/client';

type LatLong = {
    lat: number;
    lng: number;
};

@Injectable()
export class ListingsService {
    constructor(
        private prisma: PrismaService,
        @InjectMeiliSearch() private readonly meiliSearch: MeiliSearch
    ) {}

    async getZip(lat: number, lng: number): Promise<number | null> {
        const index = await this.meiliSearch.index('cities').search('', {
            filter: [`_geoRadius(${lat}, ${lng}, 10000)`],
            sort: [`_geoPoint(${lat}, ${lng}):asc`],
            limit: 1
        });

        if (index.hits.length === 0) return null;
        return index.hits[0].id;
    }

    async getLatLong(zipCode: number): Promise<LatLong | null> {
        const zip = await this.prisma.zip.findUnique({
            where: {
                zip: zipCode
            }
        });

        if (!zip) return null;
        return {
            lat: zip.latitude,
            lng: zip.longitude
        };
    }

    async getLocalListings(zipCode: number | null, miles: number | null) {
        const location: LatLong | null = zipCode
            ? await this.getLatLong(zipCode)
            : null;

        const opts = {
            filter: location
                ? [
                      `_geoRadius(${location.lat}, ${location.lng}, ${miles ? miles * 1609 : 50000})`,
                      `type IN [local, both]`,
                      `archived = false`
                  ]
                : [`type IN [local, both]`],
            sort: [`lastUpdated:desc`],
            limit: 5
        };

        return await this.meiliSearch.index('listings').search('', opts);
    }

    async getShippingListings() {
        const opts = {
            filter: [`type IN [shipping, both]`, `archived = false`],
            sort: [`lastUpdated:desc`],
            limit: 5
        };

        return await this.meiliSearch.index('listings').search('', opts);
    }

    async searchListings(
        query: string,
        zipCode: number | null,
        type: string // 'local' | 'shipping' | 'both'
    ) {
        const location: LatLong | null = zipCode
            ? await this.getLatLong(zipCode)
            : null;

        const opts = {
            filter: [`archived = false`],
            sort: [`lastUpdated:desc`],
            limit: 20
        };

        switch (type) {
            case 'local':
                opts.filter.push(`type IN [shipping, both]`);
                break;
        }

        if (location) {
            opts.sort.push(`_geoPoint(${location.lat}, ${location.lng}):asc`);
        }

        return await this.meiliSearch.index('listings').search(query, opts);
    }

    async createListing(
        user: User,
        title: string,
        description: string,
        zip: number,
        price: number,
        type: string, // 'local' | 'shipping' | 'both',
        condition: string,
        geo: LatLong
    ) {
        const post = await this.prisma.post.create({
            data: {
                authorId: user.id
            }
        });

        const document = {
            id: post.id,
            title,
            description,
            zip,
            price,
            type,
            condition,
            _geo: {
                lat: geo.lat,
                lng: geo.lng
            }
        };

        const task = await this.meiliSearch
            .index('listings')
            .addDocuments([document]);

        await this.meiliSearch.waitForTask(task.taskUid);

        return post.id;
    }
}
