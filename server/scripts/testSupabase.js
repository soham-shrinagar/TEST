require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { supabase, SUPABASE_STORAGE_BUCKET } = require('../config/supabase');

const run = async () => {
  if (!supabase) {
    throw new Error('Supabase client is null. Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  }

  console.log('✅ Supabase client initialized');

  // 1. List buckets
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw new Error(`Bucket list failed: ${listErr.message}`);
  const bucket = buckets.find((b) => b.name === SUPABASE_STORAGE_BUCKET);
  if (!bucket) throw new Error(`Bucket "${SUPABASE_STORAGE_BUCKET}" not found!`);
  console.log(`✅ Bucket found: "${SUPABASE_STORAGE_BUCKET}" (public: ${bucket.public})`);

  // 2. Upload a test file
  const testPath = `test/creatorsync-test-${Date.now()}.txt`;
  const content = Buffer.from('CreatorSync Supabase test file');
  const { error: uploadErr } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(testPath, content, { contentType: 'text/plain', upsert: false });
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
  console.log(`✅ Test file uploaded: ${testPath}`);

  // 3. Get public URL
  const { data: urlData } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(testPath);
  console.log(`✅ Public URL: ${urlData.publicUrl}`);

  // 4. Delete the test file
  const { error: deleteErr } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([testPath]);
  if (deleteErr) throw new Error(`Delete failed: ${deleteErr.message}`);
  console.log(`✅ Test file deleted`);

  console.log('\n🎉 All Supabase checks passed!');
};

run().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
