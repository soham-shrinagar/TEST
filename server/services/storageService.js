const fs = require('fs/promises');
const path = require('path');
const { supabase, SUPABASE_STORAGE_BUCKET } = require('../config/supabase');

const safeName = (name) => String(name || 'file')
  .replace(/[^a-z0-9._-]/gi, '-')
  .toLowerCase();

const uploadFile = async (buffer, originalName, mimeType, folder = 'uploads') => {
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName(originalName)}`;
  const storagePath = `${folder}/${filename}`;

  if (!supabase) {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), buffer);
    return { url: `/uploads/${filename}`, path: storagePath, filename };
  }

  const { error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(storagePath);
  return {
    url: data.publicUrl,
    path: storagePath,
    filename: path.basename(storagePath),
  };
};

const deleteFile = async (storagePath) => {
  if (!storagePath || !supabase) return false;
  const normalizedPath = String(storagePath).replace(/^\/?uploads\//, '');
  const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([normalizedPath]);
  if (error) {
    console.error(`[storage:delete] ${error.message}`);
    return false;
  }
  return true;
};

module.exports = {
  uploadFile,
  deleteFile,
};
