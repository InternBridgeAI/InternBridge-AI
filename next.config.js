/** @type {import('next').NextConfig} */
const backendApiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.BACKEND_API_URL ||
    'http://localhost:8000';

const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${backendApiBaseUrl}/api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
