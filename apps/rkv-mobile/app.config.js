export default {
  expo: {
    name: 'RKV Consulting',
    slug: 'rkv-mobile',
    scheme: 'rkv',
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      webAppUrl: process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://localhost:3000',
    },
  },
};
