// Pulihkan sesi login (JWT) dari localStorage sebelum halaman pertama dirender
export default defineNuxtPlugin(() => {
  useAuth().hydrate();
});
