# Omnidesk_ai Deployment Checklist

## Supabase Configuration

When deploying to production, update these settings in **Supabase Dashboard**:

### Authentication → URL Configuration:
- [ ] Update **Site URL** to: `https://YOUR_PRODUCTION_DOMAIN`
- [ ] Add **Redirect URLs**:
  - `https://YOUR_PRODUCTION_DOMAIN`
  - `https://YOUR_PRODUCTION_DOMAIN/**`

### Environment Variables:
- [ ] Update frontend `.env` with production API keys if different
- [ ] Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct

## Build & Deploy
- [ ] Run `npm run build` in frontend directory
- [ ] Deploy the `dist` folder to your hosting provider
