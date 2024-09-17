declare global {
    namespace NodeJS {
        interface ProcessEnv {
            MODE: 'dev' | 'prod';
            DATABASE_URL: string;
            MEILISEARCH_URL: string;
            MEILISEARCH_KEY: string;
            MEILISEARCH_BUCKET_NAME: string;
            SMTP_SERVER: string;
            SMTP_NOREPLY_EMAIL: string;
            SMTP_NOREPLY_NAME: string;
            SMTP_PASSWORD: string;
            LISTEN_ADDRESS: string;
            PORT: string;
            WEBSOCKET_PORT: string;
            BUNNY_API_KEY: string;
            BUNNY_ZONE_NAME: string;
            BUNNY_DOMAIN: string;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
