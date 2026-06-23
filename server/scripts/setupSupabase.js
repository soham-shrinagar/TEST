require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { supabase, SUPABASE_STORAGE_BUCKET } = require('../config/supabase');

const setup = async () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  }

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = buckets.some((bucket) => bucket.name === SUPABASE_STORAGE_BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(SUPABASE_STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
    });
    if (error) throw error;
  }

  console.log(`Supabase bucket ready: ${SUPABASE_STORAGE_BUCKET}`);
};

setup().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
