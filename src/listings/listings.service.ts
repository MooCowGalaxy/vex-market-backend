import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch } from 'meilisearch';
import { Post, User } from '@prisma/client';
import { CdnService } from '../db/cdn.service';
import * as types from './listings.types';

@Injectable()
export class ListingsService {
    constructor(
        private prisma: PrismaService,
        private readonly cdnService: CdnService,
        @InjectMeiliSearch() private readonly meiliSearch: MeiliSearch
    ) {}

    formatZip(zip: number): string {
        return `00000${zip}`.slice(-5);
    }

    async getZip(lat: number, lng: number): Promise<number | null> {
        const index = await this.meiliSearch.index('cities').search('', {
            filter: [`_geoRadius(${lat}, ${lng}, 10000)`],
            sort: [`_geoPoint(${lat}, ${lng}):asc`],
            limit: 1
        });

        if (index.hits.length === 0) return null;
        return index.hits[0].id;
    }

    async getZipInfo(zip: number): Promise<types.ZipDocument | null> {
        const city: types.ZipDocument = await this.meiliSearch
            .index('cities')
            .getDocument(zip);

        if (!city) return null;

        return city;
    }

    async getLatLong(zipCode: number): Promise<types.LatLong | null> {
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
        const location: types.LatLong | null = zipCode
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

        return (await this.meiliSearch.index('listings').search('', opts))
            .hits as any as types.PostDocument[];
    }

    async getShippingListings() {
        const opts = {
            filter: [`type IN [shipping, both]`, `archived = false`],
            sort: [`lastUpdated:desc`],
            limit: 5
        };

        return (await this.meiliSearch.index('listings').search('', opts))
            .hits as any as types.PostDocument[];
    }

    async searchListings(
        query: string,
        zipCode: number | null,
        type: string // 'local' | 'shipping' | 'both'
    ) {
        const location: types.LatLong | null = zipCode
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

        return (await this.meiliSearch.index('listings').search(query, opts))
            .hits as any as types.PostDocument[];
    }

    async createListing(
        user: User,
        title: string,
        description: string,
        zip: number,
        price: number,
        type: string, // 'local' | 'shipping' | 'both',
        condition: string,
        geo: types.LatLong
    ) {
        const post = await this.prisma.post.create({
            data: {
                authorId: user.id
            }
        });

        const zipObject = await this.getZipInfo(zip);

        const document = {
            id: post.id,
            title,
            description,
            zip,
            zipFriendly: zipObject
                ? `${zipObject.city}, ${zipObject.state}`
                : null,
            price,
            type,
            condition,
            images: [],
            created: Math.floor(Date.now() / 1000),
            lastUpdated: Math.floor(Date.now() / 1000),
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

    mergeDocumentData(
        posts: Post[],
        documents: types.PostDocument[]
    ): types.CombinedPost[] {
        const results = [];

        for (const post of posts) {
            const filtered = documents.filter((doc) => doc.id === post.id);
            if (filtered.length > 0) {
                results.push({
                    ...post,
                    ...filtered[0]
                });
            }
        }

        return results;
    }

    async getListingsFromId(listingIds: number[]) {
        return (
            await this.meiliSearch.index('listings').search('', {
                filter: [`id IN [${listingIds.join(', ')}]`],
                sort: [`lastUpdated:desc`]
            })
        ).hits as any as types.PostDocument[];
    }

    async getUserListings(userId: number, listingType: string) {
        const posts: Post[] = await this.prisma.post.findMany({
            where: {
                authorId: userId
            }
        });

        const documents: types.PostDocument[] = (
            await this.getListingsFromId(posts.map((post) => post.id))
        ).filter((document) => {
            if (listingType === 'active') return !document.archived;
            else return document.archived;
        });

        return this.mergeDocumentData(posts, documents);
    }

    async getListing(postId: number): Promise<types.CombinedPost | null> {
        const post = await this.prisma.post.findUnique({
            where: {
                id: postId
            }
        });
        if (!post) return null;

        const document: types.PostDocument = await this.meiliSearch
            .index('listings')
            .getDocument(postId);

        if (!document) return null;

        return { ...post, ...document };
    }

    async updateListing(postId: number, updateData: types.UpdateBody) {
        const task = await this.meiliSearch.index('listings').updateDocuments([
            {
                id: postId,
                ...updateData,
                lastUpdated: Math.floor(Date.now() / 1000)
            }
        ]);

        await this.meiliSearch.waitForTask(task.taskUid);
    }

    async archiveListing(postId: number, archived: boolean) {
        const task = await this.meiliSearch.index('listings').updateDocuments([
            {
                id: postId,
                archived,
                lastUpdated: Math.floor(Date.now() / 1000)
            }
        ]);

        await this.meiliSearch.waitForTask(task.taskUid);
    }

    async uploadImage(
        user: User,
        post: types.CombinedPost,
        file: Express.Multer.File
    ) {
        const fileName = `images/${user.cdnId}/${post.cdnId}/${Date.now()}.${file.originalname.split('.').slice(-1)[0]}`;

        let res;
        try {
            res = await this.cdnService.uploadFile(fileName, file.buffer);
        } catch (e) {
            console.error(e);
            return false;
        }

        const task = await this.meiliSearch.index('listings').updateDocuments([
            {
                id: post.id,
                images: [...post.images, res.url]
            }
        ]);

        await this.meiliSearch.waitForTask(task.taskUid);

        return true;
    }

    redactPost(
        post: types.CombinedPost | types.PostDocument
    ): types.RedactedPost {
        return {
            id: post.id,
            title: post.title,
            description: post.description,
            zipFriendly: post.zipFriendly || this.formatZip(post.zip),
            price: post.price,
            type: post.type,
            condition: post.condition,
            images: post.images,
            created: post.created,
            lastUpdated: post.lastUpdated
        };
    }
}