// Supabase loyihasi (testlar-app). "Publishable" kalit ochiq bo‘lishi uchun mo‘ljallangan — ruxsatni server (RLS va Edge Function) tekshiradi.
// Maxfiy kalitlar (service_role, Gemini, Groq, Anthropic) bu yerga HECH QACHON yozilmaydi.
export const CLOUD = {
  url: 'https://hxywksrsgixwmmvvpajc.supabase.co',
  key: 'sb_publishable_PBAHG1CGi1X65_-bq5rbRg_nVKL5pIQ',
  loginDomain: 'testlar.internal',   // “ozod1” kabi loginlar ozod1@testlar.internal bo‘lib tekshiriladi
};
