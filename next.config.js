/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['hyyydnxdcaugunsxqcrb.supabase.co'], // Supabase 프로젝트의 도메인
  },
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  reactStrictMode: false,
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // 기본 CSP 설정
    const baseCSP = [
      "default-src 'self'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self'",
      "font-src 'self'",
      "media-src 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'"
    ];

    // 개발 환경에서만 필요한 추가 설정
    const scriptSrc = isDevelopment
      ? "'self' 'unsafe-inline' 'unsafe-eval'"
      : "'self' 'unsafe-inline'";

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [...baseCSP, `script-src ${scriptSrc}`].join('; ')
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig; 