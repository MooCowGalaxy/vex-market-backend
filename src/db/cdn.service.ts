import { Injectable } from '@nestjs/common';

function toBuffer(arrayBuffer: ArrayBuffer) {
    const buffer = Buffer.alloc(arrayBuffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

@Injectable()
export class CdnService {
    async uploadFile(fileName: string, buffer: any) {
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/octet-stream',
                AccessKey: process.env.BUNNY_API_KEY
            },
            body: buffer
        };
        const res = await fetch(
            `https://la.storage.bunnycdn.com/${process.env.BUNNY_ZONE_NAME}/${fileName}`,
            options
        );
        if (res.status !== 201) throw res;
        return {
            res,
            url: `https://${process.env.BUNNY_DOMAIN}/${fileName}`
        };
    }

    async downloadFile(fileName: string) {
        const res = await fetch(
            `https://${process.env.BUNNY_DOMAIN}/${fileName}`
        );
        const arrayBuffer = await res.arrayBuffer();
        return toBuffer(arrayBuffer);
    }

    async deleteFile(fileName: string) {
        const options = {
            method: 'DELETE',
            headers: {
                AccessKey: process.env.BUNNY_API_KEY
            }
        };
        const res = await fetch(
            `https://la.storage.bunnycdn.com/${process.env.BUNNY_ZONE_NAME}/${fileName}`,
            options
        );
        if (res.status !== 200) throw res;
    }
}
